from __future__ import annotations

import json
import zipfile
from hashlib import sha256
from pathlib import Path

import pytest

from robostudio_engine import FailureClusterer, HFHubExporter, IntakePacketExporter, list_episodes
from robostudio_engine.adapters import UnsafeDatasetPathError
from robostudio_engine.exporters import create_intake_packet


ROOT = Path(__file__).resolve().parents[1]
OPEN_SOURCE_ROOT = Path(__file__).resolve().parents[2]
PLATFORM_SCHEMA_ROOT = OPEN_SOURCE_ROOT / "open-studio-platform" / "schemas"
FIXTURES = ROOT / "examples" / "mock_multi_format"


def test_hf_export_artifacts_exclude_absolute_paths_hidden_files_and_tokens(tmp_path, monkeypatch):
    monkeypatch.delenv("HF_TOKEN", raising=False)
    monkeypatch.delenv("HUGGINGFACE_TOKEN", raising=False)
    episodes = list_episodes(FIXTURES / "lerobot_v3")

    result = HFHubExporter().export(episodes, "auraoneai/mock", tmp_path / "hf")

    assert result["status"] == "blocked"
    manifest = json.loads((tmp_path / "hf" / "training_ready_manifest.json").read_text(encoding="utf8"))
    serialized = json.dumps(manifest)
    assert str((FIXTURES / "lerobot_v3").resolve()) not in serialized
    assert "/Users/" not in serialized
    assert "/home/" not in serialized
    assert "hf_" not in serialized
    assert all(not Path(path).name.startswith(".") for episode in manifest["episodes"] for path in episode.get("video_paths", {}).values())
    assert {episode["root"] for episode in manifest["episodes"]} == {"<DATASET_ROOT>"}


def test_intake_packet_contains_privacy_preview_and_sanitized_payloads(tmp_path):
    episodes = list_episodes(FIXTURES / "lerobot_v3")
    packet = IntakePacketExporter().export(episodes, tmp_path / "packet.auraonepkg")

    with zipfile.ZipFile(packet) as archive:
        names = set(archive.namelist())
        manifest = json.loads(archive.read("manifest.json"))
        preview = json.loads(archive.read("privacy/preview.json"))
        reviewed_subset = archive.read("payload/reviewed_subset_manifest.json").decode("utf8")

    assert "privacy/preview.json" in names
    assert manifest["$schema"] == "https://schemas.auraone.ai/open-studio/intake-packet/v1.json"
    assert manifest["product"] == "robotics-studio-open"
    assert {item["role"] for item in manifest["payload_manifest"]} >= {
        "robotics_reviewed_subset_manifest",
        "robotics_episode_reference",
        "robotics_failure_cluster",
        "robotics_intervention_note",
        "robotics_embodiment_card",
        "robotics_sensor_qa_report",
    }
    with zipfile.ZipFile(packet) as archive:
        for item in manifest["payload_manifest"]:
            payload = archive.read(item["path"])
            assert sha256(payload).hexdigest() == item["sha256"]
            assert len(payload) == item["size_bytes"]
    assert preview["requires_user_acknowledgement"] is True
    assert {item["path"] for item in preview["files"]} == {
        "payload/embodiment_card.md",
        "payload/episode_references.json",
        "payload/failure_clusters.json",
        "payload/intervention_notes.jsonl",
        "payload/reviewed_subset_manifest.json",
        "payload/sensor_qa_report.json",
    }
    assert all(item["redaction_rules"] for item in preview["files"])
    assert str((FIXTURES / "lerobot_v3").resolve()) not in reviewed_subset
    assert "<DATASET_ROOT>" in reviewed_subset


def test_intake_packet_manifest_matches_platform_contract(tmp_path):
    schema = json.loads((PLATFORM_SCHEMA_ROOT / "intake-packet.schema.json").read_text(encoding="utf8"))
    roles = json.loads((PLATFORM_SCHEMA_ROOT / "intake-roles.json").read_text(encoding="utf8"))
    robotics_roles = {
        entry["role"]
        for entry in roles["roles"]
        if entry["flagship"] == "robotics-studio-open"
    }

    manifest = _read_intake_manifest(
        IntakePacketExporter().export(
            list_episodes(FIXTURES / "lerobot_v3"),
            tmp_path / "packet.auraonepkg",
        )
    )
    legacy_manifest = create_intake_packet(
        str(FIXTURES / "lerobot_v3"),
        str(tmp_path / "legacy.auraonepkg"),
    )
    for candidate in [manifest, legacy_manifest]:
        _assert_platform_intake_manifest(candidate, schema, robotics_roles)

    assert {item["role"] for item in manifest["payload_manifest"]} >= {
        "robotics_reviewed_subset_manifest",
        "robotics_episode_reference",
        "robotics_failure_cluster",
        "robotics_intervention_note",
        "robotics_embodiment_card",
        "robotics_sensor_qa_report",
    }


def _read_intake_manifest(packet: Path) -> dict:
    with zipfile.ZipFile(packet) as archive:
        return json.loads(archive.read("manifest.json"))


def _assert_platform_intake_manifest(manifest: dict, schema: dict, robotics_roles: set[str]) -> None:
    assert set(schema["required"]) <= set(manifest)
    assert set(manifest) <= set(schema["properties"])
    assert manifest["$schema"] == schema["properties"]["$schema"]["const"]
    assert manifest["manifest_version"] == schema["properties"]["manifest_version"]["const"]
    assert manifest["product"] == "robotics-studio-open"
    assert manifest["product"] in schema["properties"]["product"]["enum"]
    assert manifest["transport"]["destination"] == schema["properties"]["transport"]["properties"]["destination"]["const"]
    assert manifest["redaction"]["file_paths"] is True
    assert manifest["redaction"]["hostnames"] is True
    assert manifest["redaction"]["api_keys"] is True
    assert manifest["redaction"]["user_pii_other_than_explicit_intake"] is True
    assert manifest["consent"]["user_acknowledged_preview"] is True
    assert manifest["consent"]["user_acknowledged_transport"] is True
    assert {item["role"] for item in manifest["payload_manifest"]} <= robotics_roles
    assert all(item["path"].startswith("payload/") and ".." not in item["path"] for item in manifest["payload_manifest"])
    assert all(len(item["sha256"]) == 64 and item["size_bytes"] > 0 for item in manifest["payload_manifest"])


def test_adapter_path_traversal_is_rejected_before_indexing(tmp_path):
    root = tmp_path / "lerobot"
    (root / "meta").mkdir(parents=True)
    (root / "meta" / "info.json").write_text('{"codebase_version":"v3.0","fps":30}', encoding="utf8")
    (root / "meta" / "episodes.json").write_text(
        json.dumps({"episodes": [{"episode_id": "0", "data_path": "../escape.parquet"}]}),
        encoding="utf8",
    )

    with pytest.raises(UnsafeDatasetPathError):
        list_episodes(root)


def test_hdf5_manifest_path_traversal_is_rejected(tmp_path):
    (tmp_path / "hdf5_manifest.json").write_text(
        json.dumps({"episodes": [{"episode_id": "0", "path": "../outside.hdf5"}]}),
        encoding="utf8",
    )

    with pytest.raises(UnsafeDatasetPathError):
        list_episodes(tmp_path)


def test_custom_encoder_stdout_is_bounded(tmp_path):
    encoder = tmp_path / "encoder.py"
    encoder.write_text(
        "#!/usr/bin/env python3\n"
        "print('{\"embedding\":[' + ','.join(['1'] * 600000) + ']}')\n",
        encoding="utf8",
    )
    encoder.chmod(0o755)
    episodes = list_episodes(FIXTURES / "lerobot_v3")

    with pytest.raises(RuntimeError, match="stdout exceeded"):
        FailureClusterer(embedding="custom", custom_encoder=str(encoder)).cluster(episodes[:1])

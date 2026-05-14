from __future__ import annotations

import json
import zipfile
from pathlib import Path

from robostudio_engine import (
    EmbodimentCardGenerator,
    FailureClusterer,
    HFHubExporter,
    IntakePacketExporter,
    LocalExporter,
    SensorQARunner,
    ThumbnailWorkerPool,
    VLAProbeRunner,
    list_episodes,
    load_plugin_manifest,
    validate_plugin_manifest,
)


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "examples" / "mock_multi_format"
VLA_EPISODES = ROOT.parent / "vla-robustness-kit" / "examples" / "mock_episode_set"


def test_sensor_qa_detects_dropped_frames_and_exports_markdown():
    episodes = list_episodes(FIXTURES / "mp4_jsonl")
    report = SensorQARunner(dropped_frame_threshold=0.1).run(episodes)
    assert report["finding_count"] == 1
    assert report["findings"][0]["check"] == "dropped_frames"
    markdown = SensorQARunner().render_markdown(report)
    assert "Robotics Studio Sensor QA Report" in markdown


def test_failure_clustering_manifest_and_local_exports(tmp_path):
    episodes = list_episodes(FIXTURES / "lerobot_v3")
    clusters = FailureClusterer(min_cluster_size=1).cluster(episodes)
    assert len(clusters) == 2
    manifest = FailureClusterer(min_cluster_size=1).write_manifest(clusters, tmp_path / "clusters.json")
    assert json.loads(manifest.read_text())["schema"] == "robostudio.failure_clusters.v1"
    export_path = LocalExporter().export(episodes, tmp_path / "export", "manifest")
    payload = json.loads(export_path.read_text())
    assert payload["episode_count"] == 2
    bridge = LocalExporter().export(episodes, tmp_path / "export", "rlds")
    assert bridge.name == "rlds_metadata_bridge.jsonl"


def test_custom_encoder_failure_clustering(tmp_path, monkeypatch):
    monkeypatch.setattr("robostudio_engine.clustering._hdbscan_labels", lambda vectors, min_cluster_size: list(range(len(vectors))))
    encoder = tmp_path / "encoder.py"
    encoder.write_text(
        "#!/usr/bin/env python3\n"
        "import json, sys\n"
        "payload=json.loads(sys.stdin.read())\n"
        "episode_id=str(payload.get('episode_id','0'))\n"
        "value=0.0 if episode_id.endswith('0') else 10.0\n"
        "print(json.dumps({'embedding':[value, value]}))\n",
        encoding="utf8",
    )
    encoder.chmod(0o755)
    episodes = list_episodes(FIXTURES / "lerobot_v3")
    clusters = FailureClusterer(embedding="custom", custom_encoder=str(encoder), min_cluster_size=1).cluster(episodes)
    assert len(clusters) == 2


def test_thumbnail_worker_pool_writes_placeholder_without_real_video():
    episodes = list_episodes(FIXTURES / "lerobot_v3")
    results = ThumbnailWorkerPool(FIXTURES / "lerobot_v3", workers=2).generate_many(episodes)
    assert set(results) == {"0", "1"}
    assert all(paths for paths in results.values())


def test_vla_probe_runner_mock_policy_and_embodiment_card():
    result = VLAProbeRunner().run(VLA_EPISODES, policy="mock")
    assert isinstance(result, dict)
    assert result["status"] == "ok"
    assert result["summary"]["total"] > 0
    card = EmbodimentCardGenerator().generate({"robot_type": "so101", "fps": 30})
    rendered = EmbodimentCardGenerator().render_markdown(card)
    assert "Embodiment Card" in rendered


def test_vla_probe_runner_byo_policy_adapter(tmp_path):
    policy = tmp_path / "policy.py"
    policy.write_text(
        "#!/usr/bin/env python3\n"
        "import json, sys\n"
        "payload=json.loads(sys.stdin.read())\n"
        "variant=payload['perturbation']['variant']\n"
        "passed=variant == 'original'\n"
        "print(json.dumps({'passed': passed, 'confidence': 0.8 if passed else 0.2, 'cluster': 'none' if passed else 'byo_failure'}))\n",
        encoding="utf8",
    )
    policy.chmod(0o755)
    result = VLAProbeRunner().run(VLA_EPISODES, policy=str(policy))
    assert isinstance(result, dict)
    assert result["status"] == "ok"
    assert result["policy"] == "byo"
    assert result["summary"]["total"] > 0


def test_hf_export_blocks_without_auth_but_prepares_artifacts(tmp_path, monkeypatch):
    monkeypatch.delenv("HF_TOKEN", raising=False)
    monkeypatch.delenv("HUGGINGFACE_TOKEN", raising=False)
    episodes = list_episodes(FIXTURES / "lerobot_v3")
    result = HFHubExporter().export(episodes, "auraoneai/mock", tmp_path / "hf")
    assert result["status"] == "blocked"
    assert Path(result["blocker"]).exists()
    assert (tmp_path / "hf" / "training_ready_manifest.json").exists()


def test_intake_packet_contains_robotics_payloads(tmp_path):
    episodes = list_episodes(FIXTURES / "lerobot_v3")
    out = IntakePacketExporter().export(episodes, tmp_path / "packet.auraonepkg")
    with zipfile.ZipFile(out) as archive:
        names = set(archive.namelist())
        manifest = json.loads(archive.read("manifest.json"))
    assert "manifest.json" in names
    assert "payload/reviewed_subset_manifest.json" in names
    assert "payload/sensor_qa_report.json" in names
    assert manifest["product"] == "robotics-studio-open"
    assert {
        item["role"]
        for item in manifest["payload_manifest"]
    } >= {
        "robotics_reviewed_subset_manifest",
        "robotics_episode_reference",
        "robotics_failure_cluster",
        "robotics_intervention_note",
        "robotics_embodiment_card",
        "robotics_sensor_qa_report",
    }


def test_plugin_manifest_contract_and_entrypoint_guard(tmp_path):
    manifest_path = ROOT / "examples" / "plugins" / "hdf5_force_panel" / "manifest.json"
    manifest = load_plugin_manifest(manifest_path)
    assert manifest.plugin_id == "ai.auraone.robostudio.plugins.hdf5_force_panel"
    assert {contribution.kind for contribution in manifest.contributions} == {"adapter", "panel"}

    unsafe = manifest.to_dict()
    unsafe["contributions"][0]["entrypoint"] = "../outside.py"
    errors = validate_plugin_manifest(unsafe, manifest_path.parent)
    assert any("inside the plugin directory" in error for error in errors)

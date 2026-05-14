from __future__ import annotations

import json
import sqlite3
import zipfile
from hashlib import sha256
from pathlib import Path

from robostudio_engine.adapters import load_dataset
from robostudio_engine.clustering import cluster_failures
from robostudio_engine.embodiment import generate_embodiment_card
from robostudio_engine.exporters import create_intake_packet, export_local
from robostudio_engine.indexer import build_index
from robostudio_engine.qa import sensor_qa_report
from robostudio_engine.vla import run_vla_probe


FIXTURE = Path(__file__).resolve().parents[2] / "robotics-studio" / "fixtures" / "sample-so101"


def test_fixture_loads_with_lerobot_adapter() -> None:
    dataset = load_dataset(FIXTURE)
    assert dataset.adapter == "lerobot"
    assert len(dataset.episodes) == 3
    assert dataset.episodes[0].sensors[0].kind == "rgb"


def test_index_qa_cluster_probe_card_and_export(tmp_path: Path) -> None:
    index = tmp_path / "index.sqlite"
    events = list(build_index(FIXTURE, index, progress_every=1))
    assert events[-1]["indexed"] == 3
    with sqlite3.connect(index) as conn:
        assert conn.execute("SELECT COUNT(*) FROM episodes").fetchone()[0] == 3

    qa = sensor_qa_report(str(FIXTURE))
    assert qa["status"] == "fail"
    assert {finding["check"] for finding in qa["findings"]} >= {"dropped_frames", "av_sync", "calibration_drift"}

    clusters = cluster_failures(str(FIXTURE))
    assert clusters["clusters"]
    probe = run_vla_probe(str(FIXTURE))
    assert len(probe["probes"]) == 3
    card = generate_embodiment_card(str(FIXTURE))
    assert card["embodiments"] == ["SO-101"]

    export = export_local(str(FIXTURE), str(tmp_path / "export"), "lerobot")
    assert export["format"] == "lerobot"
    assert json.loads((tmp_path / "export" / "manifest.json").read_text())["episode_count"] == 3

    packet = tmp_path / "intake.auraonepkg"
    manifest = create_intake_packet(str(FIXTURE), str(packet))
    assert manifest["$schema"] == "https://schemas.auraone.ai/open-studio/intake-packet/v1.json"
    assert manifest["product"] == "robotics-studio-open"
    assert {item["role"] for item in manifest["payload_manifest"]} >= {
        "robotics_reviewed_subset_manifest",
        "robotics_failure_cluster",
        "robotics_embodiment_card",
        "robotics_sensor_qa_report",
    }
    with zipfile.ZipFile(packet) as archive:
        assert "payload/sensor_qa_report.json" in archive.namelist()
        for item in manifest["payload_manifest"]:
            payload = archive.read(item["path"])
            assert sha256(payload).hexdigest() == item["sha256"]
            assert len(payload) == item["size_bytes"]

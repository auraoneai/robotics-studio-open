from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

SRC = Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from robotics_reviewkit.exporters.openx import build_openx_metadata_export
from robotics_reviewkit.exporters.openx import write_openx_metadata_export
from robotics_reviewkit.exporters.rlds import build_rlds_metadata_export
from robotics_reviewkit.exporters.rlds import write_rlds_metadata_export


def mock_episode() -> dict:
    return {
        "episode_id": "mock_episode_0001",
        "task": {"id": "mock_pick_place", "name": "Mock Pick And Place"},
        "embodiment": {"id": "mock_arm_v0", "name": "Mock Arm"},
        "duration_seconds": 3.5,
        "sensors": [{"id": "camera_front", "type": "rgb"}],
        "segments": [
            {"segment_id": "seg_001", "label": "approach", "start_seconds": 0.0, "end_seconds": 1.5},
            {"segment_id": "seg_002", "label": "place", "start_seconds": 1.5, "end_seconds": 3.5},
        ],
        "interventions": [{"intervention_id": "int_001", "type": "pause"}],
        "failure_modes": [{"failure_id": "fm_001", "taxonomy_id": "mock.failure"}],
        "sensor_qa": {"camera_front": {"status": "usable"}},
        "training_readiness": {"state": "needs_review", "reason": "mock review split"},
        "mock_data": True,
    }


def test_rlds_export_maps_segments_to_placeholder_steps() -> None:
    export = build_rlds_metadata_export(mock_episode())

    assert export["export_type"] == "rlds_metadata_bridge"
    assert export["compatibility"] == "metadata_only"
    assert export["dataset_info"]["task_names"] == ["Mock Pick And Place"]

    episode = export["episodes"][0]
    assert episode["episode_metadata"]["training_ready"] is False
    assert len(episode["steps"]) == 2
    assert episode["steps"][0]["is_first"] is True
    assert episode["steps"][1]["is_last"] is True
    assert episode["steps"][1]["is_terminal"] is True
    assert episode["steps"][0]["observation"]["placeholder"] is True
    assert episode["steps"][0]["action"]["placeholder"] is True


def test_openx_export_maps_review_metadata_without_assets() -> None:
    export = build_openx_metadata_export(mock_episode())

    assert export["export_type"] == "openx_metadata_bridge"
    episode = export["episodes"][0]
    assert episode["split"] == "review"
    assert episode["assets"]["observations"] is None
    assert episode["assets"]["actions"] is None
    assert episode["review_metadata"]["training_readiness_state"] == "needs_review"


def test_rlds_and_openx_writers_create_json_outputs(tmp_path: Path) -> None:
    rlds = write_rlds_metadata_export(mock_episode(), tmp_path / "rlds")
    openx = write_openx_metadata_export(mock_episode(), tmp_path / "openx")

    assert json.loads((tmp_path / "rlds" / "manifest.json").read_text(encoding="utf-8")) == rlds
    assert (tmp_path / "rlds" / "dataset_info.json").exists()
    assert (tmp_path / "rlds" / "episodes" / "mock_episode_0001.json").exists()
    assert json.loads((tmp_path / "openx" / "openx_manifest.json").read_text(encoding="utf-8")) == openx
    assert (tmp_path / "openx" / "episodes" / "mock_episode_0001.openx.json").exists()


def test_rlds_export_rejects_invalid_segment_times() -> None:
    broken = mock_episode()
    broken["segments"][0]["end_seconds"] = -1

    with pytest.raises(ValueError, match="invalid time range"):
        build_rlds_metadata_export(broken)

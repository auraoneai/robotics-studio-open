from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

SRC = Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from robotics_reviewkit.exporters.lerobot import build_lerobot_metadata_export
from robotics_reviewkit.exporters.lerobot import write_lerobot_metadata_export


def mock_episode() -> dict:
    return {
        "episode_id": "mock_episode_0001",
        "task": {"id": "mock_pick_place", "name": "Mock Pick And Place"},
        "embodiment": {"id": "mock_arm_v0", "name": "Mock Arm"},
        "duration_seconds": 3.5,
        "sensors": [{"id": "camera_front", "type": "rgb"}],
        "segments": [{"segment_id": "seg_001", "start_seconds": 0.0, "end_seconds": 3.5}],
        "interventions": [{"intervention_id": "int_001", "type": "pause"}],
        "failure_modes": [{"failure_id": "fm_001", "taxonomy_id": "mock.failure"}],
        "sensor_qa": {"camera_front": {"status": "usable"}},
        "training_readiness": {"state": "ready", "reason": "mock complete"},
        "mock_data": True,
    }


def test_lerobot_export_maps_mock_episode_metadata() -> None:
    export = build_lerobot_metadata_export(mock_episode())

    assert export["export_type"] == "lerobot_metadata_bridge"
    assert export["compatibility"] == "metadata_only"
    assert export["dataset"]["episode_count"] == 1
    assert export["tasks"] == [
        {"task_index": 0, "task_id": "mock_pick_place", "task_name": "Mock Pick And Place"}
    ]

    episode = export["episodes"][0]
    assert episode["episode_id"] == "mock_episode_0001"
    assert episode["task_index"] == 0
    assert episode["split"] == "train"
    assert episode["observations"]["placeholder"] is True
    assert episode["actions"]["placeholder"] is True
    assert episode["metadata_only"] is True
    assert episode["annotations"]["segments"][0]["segment_id"] == "seg_001"


def test_lerobot_export_writes_expected_directory(tmp_path: Path) -> None:
    export = write_lerobot_metadata_export({"episodes": [mock_episode()]}, tmp_path)

    assert (tmp_path / "manifest.json").exists()
    assert (tmp_path / "meta" / "info.json").exists()
    assert (tmp_path / "meta" / "tasks.jsonl").read_text(encoding="utf-8").count("\n") == 1
    episode_path = tmp_path / "episodes" / "mock_episode_0001.json"
    assert json.loads(episode_path.read_text(encoding="utf-8")) == export["episodes"][0]


def test_lerobot_export_rejects_missing_required_fields() -> None:
    broken = mock_episode()
    del broken["episode_id"]

    with pytest.raises(ValueError, match="missing required field: episode_id"):
        build_lerobot_metadata_export(broken)


def test_lerobot_export_accepts_existing_mock_episode_shape() -> None:
    existing_mock = json.loads(
        (Path(__file__).resolve().parents[1] / "examples" / "mock_episode.json").read_text(encoding="utf-8")
    )

    export = build_lerobot_metadata_export(existing_mock)

    episode = export["episodes"][0]
    assert episode["episode_id"] == "mock-episode-001"
    assert episode["task_id"] == "task-01"
    assert episode["duration_seconds"] == 42.0
    assert episode["split"] == "review"
    assert episode["observations"]["available_sensor_metadata"] == ["wrist_rgb", "front_rgb", "joint_state"]

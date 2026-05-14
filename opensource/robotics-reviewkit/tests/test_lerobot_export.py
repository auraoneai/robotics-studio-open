"""PRD 42 compatibility test module for the exact test_lerobot_export.py path."""

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


ROOT = Path(__file__).resolve().parents[1]


def test_lerobot_export_prd_path_maps_mock_episode(tmp_path: Path) -> None:
    payload = json.loads((ROOT / "examples/mock_episode.json").read_text(encoding="utf-8"))

    export = write_lerobot_metadata_export(payload, tmp_path)

    assert export["export_type"] == "lerobot_metadata_bridge"
    assert export["compatibility"] == "metadata_only"
    assert export["dataset"]["mock_data"] is True
    assert export["episodes"][0]["episode_id"] == "mock-episode-001"
    assert export["episodes"][0]["metadata_only"] is True
    assert (tmp_path / "manifest.json").exists()
    assert (tmp_path / "meta" / "tasks.jsonl").exists()


def test_lerobot_export_prd_path_rejects_missing_episode_id() -> None:
    payload = json.loads((ROOT / "examples/mock_episode.json").read_text(encoding="utf-8"))
    del payload["episode_id"]

    with pytest.raises(ValueError, match="missing required field: episode_id"):
        build_lerobot_metadata_export(payload)

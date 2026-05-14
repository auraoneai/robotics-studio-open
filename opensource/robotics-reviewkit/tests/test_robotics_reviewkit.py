import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from robotics_reviewkit.validate import validate_episode
from robotics_reviewkit.exporters import export_lerobot_metadata, export_rlds_openx_metadata


def test_mock_episode_validates():
    episode = json.loads((ROOT / "examples/mock_episode.json").read_text())
    assert validate_episode(episode) == []


def test_exports_are_metadata_bridges():
    episode = json.loads((ROOT / "examples/mock_episode.json").read_text())
    assert export_lerobot_metadata(episode)["format"] == "lerobot-metadata-bridge-v0.1"
    assert export_rlds_openx_metadata(episode)["format"] == "rlds-openx-metadata-bridge-v0.1"

from pathlib import Path

from validate_reviewkit import load_json, validate_episode


ROOT = Path(__file__).resolve().parents[1]


def test_prd_teleop_schema_validator_accepts_mock_episode():
    validate_episode(load_json(ROOT / "examples/teleop_review_mock_episode.json"))


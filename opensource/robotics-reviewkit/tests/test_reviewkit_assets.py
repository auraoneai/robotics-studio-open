from __future__ import annotations

import copy
import sys
from pathlib import Path

import pytest
import yaml


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests"))

from validate_reviewkit import load_json, load_yaml, validate_episode, validate_reference_examples  # noqa: E402


def test_mock_episode_validates() -> None:
    episode = load_json(ROOT / "examples/teleop_review_mock_episode.json")
    validate_episode(episode)
    validate_reference_examples()


def test_malformed_time_range_fails() -> None:
    episode = load_json(ROOT / "examples/teleop_review_mock_episode.json")
    broken = copy.deepcopy(episode)
    broken["segments"][1]["end_s"] = broken["segments"][1]["start_s"]

    with pytest.raises(ValueError, match="invalid time range"):
        validate_episode(broken)


def test_unknown_taxonomy_id_fails() -> None:
    episode = load_json(ROOT / "examples/teleop_review_mock_episode.json")
    broken = copy.deepcopy(episode)
    broken["failure_annotations"][0]["taxonomy_id"] = "FAIL_UNKNOWN"

    with pytest.raises(ValueError, match="Unknown failure taxonomy_id"):
        validate_episode(broken)


def test_invalid_readiness_state_fails_schema_validation() -> None:
    episode = load_json(ROOT / "examples/teleop_review_mock_episode.json")
    broken = copy.deepcopy(episode)
    broken["training_readiness"]["state"] = "readyish"

    with pytest.raises(Exception, match="readyish"):
        validate_episode(broken)


def test_task_library_has_required_task_count_and_fields() -> None:
    data = load_yaml(ROOT / "schema/tasks/teleop_tasks.yaml")
    assert len(data["tasks"]) >= 10
    for task in data["tasks"]:
        for field in (
            "id",
            "success_criteria",
            "failure_criteria",
            "required_sensor_notes",
            "annotation_requirements",
            "reset_instructions",
            "safety_notes",
        ):
            assert task.get(field), f"{task.get('id', 'unknown task')} missing {field}"


def test_taxonomy_and_ontology_have_unique_ids() -> None:
    files = [
        ("failure_modes.yaml", "failure_modes"),
        ("sensor_qa_flags.yaml", "flags"),
        ("intervention_ontology.yaml", "interventions"),
    ]
    for filename, key in files:
        data = yaml.safe_load((ROOT / "schema/taxonomy" / filename).read_text(encoding="utf-8"))
        ids = [item["id"] for item in data[key]]
        assert len(ids) == len(set(ids)), f"Duplicate IDs in {filename}"


def test_docs_and_examples_disclose_mock_status() -> None:
    required_files = [
        ROOT / "README.md",
        ROOT / "examples/teleop_review_mock_episode.json",
        ROOT / "examples/cards/mock_robotics_dataset_card.md",
        ROOT / "docs/robotics-dataset-card-template.md",
        ROOT / "viewer/index.html",
    ]
    for path in required_files:
        text = path.read_text(encoding="utf-8").lower()
        assert "synthetic" in text or "mock" in text

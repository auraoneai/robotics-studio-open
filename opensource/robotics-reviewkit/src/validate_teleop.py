#!/usr/bin/env python3
"""Compatibility validator for PRD 35 Teleop Review Schema paths.

The canonical schema and taxonomy files remain under ``schema/``. This module
exists so the exact PRD path ``robotics-reviewkit/src/validate_teleop.py`` can
validate the same mock/tutorial episode assets without moving the package API.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import jsonschema
import yaml


ROOT = Path(__file__).resolve().parents[1]


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_yaml(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def _ids(path: Path, key: str) -> set[str]:
    data = load_yaml(path)
    return {item["id"] for item in data[key]}


def taxonomy_ids() -> set[str]:
    return _ids(ROOT / "schema/taxonomy/failure_modes.yaml", "failure_modes")


def intervention_ids() -> set[str]:
    return _ids(ROOT / "schema/taxonomy/intervention_ontology.yaml", "interventions")


def sensor_qa_ids() -> set[str]:
    return _ids(ROOT / "schema/taxonomy/sensor_qa_flags.yaml", "flags")


def task_ids() -> set[str]:
    return _ids(ROOT / "schema/tasks/teleop_tasks.yaml", "tasks")


def validate_schema(episode: dict[str, Any]) -> None:
    schema = load_json(ROOT / "schema/teleop_episode.schema.json")
    jsonschema.Draft202012Validator(schema).validate(episode)


def validate_time_range(name: str, item: dict[str, Any], episode_start: float, episode_end: float) -> None:
    start = item["start_s"]
    end = item["end_s"]
    if end <= start:
        raise ValueError(f"{name} has invalid time range: end_s must be greater than start_s")
    if start < episode_start or end > episode_end:
        raise ValueError(f"{name} time range is outside episode bounds")


def validate_episode(episode: dict[str, Any]) -> None:
    """Validate a canonical Teleop Review Schema episode.

    Validation is deterministic and local. It checks the JSON Schema plus
    references to the canonical task, failure, intervention, and sensor QA IDs.
    """

    validate_schema(episode)

    known_tasks = task_ids()
    known_failures = taxonomy_ids()
    known_interventions = intervention_ids()
    known_sensor_flags = sensor_qa_ids()

    if episode["task"]["task_id"] not in known_tasks:
        raise ValueError(f"Unknown task_id: {episode['task']['task_id']}")

    episode_start = episode["timestamps"]["start_s"]
    episode_end = episode["timestamps"]["end_s"]
    if episode_end <= episode_start:
        raise ValueError("Episode end_s must be greater than start_s")

    segment_ids = set()
    for segment in episode["segments"]:
        validate_time_range(f"segment {segment['segment_id']}", segment, episode_start, episode_end)
        segment_ids.add(segment["segment_id"])

    intervention_ids_seen = set()
    for intervention in episode["interventions"]:
        validate_time_range(
            f"intervention {intervention['intervention_id']}",
            intervention,
            episode_start,
            episode_end,
        )
        if intervention["segment_id"] not in segment_ids:
            raise ValueError(f"Intervention references unknown segment_id: {intervention['segment_id']}")
        if intervention["ontology_id"] not in known_interventions:
            raise ValueError(f"Unknown intervention ontology_id: {intervention['ontology_id']}")
        intervention_ids_seen.add(intervention["intervention_id"])

    for failure in episode["failure_annotations"]:
        validate_time_range(f"failure {failure['failure_id']}", failure, episode_start, episode_end)
        if failure["segment_id"] not in segment_ids:
            raise ValueError(f"Failure references unknown segment_id: {failure['segment_id']}")
        if failure["taxonomy_id"] not in known_failures:
            raise ValueError(f"Unknown failure taxonomy_id: {failure['taxonomy_id']}")
        linked_intervention = failure.get("linked_intervention_id")
        if linked_intervention and linked_intervention not in intervention_ids_seen:
            raise ValueError(f"Failure links unknown intervention_id: {linked_intervention}")

    sensor_ids = {sensor["sensor_id"] for sensor in episode["sensors"]}
    for flag in episode["sensor_qa"]["flags"]:
        if flag["flag_id"] not in known_sensor_flags:
            raise ValueError(f"Unknown sensor QA flag_id: {flag['flag_id']}")
        for sensor_id in flag["affected_sensor_ids"]:
            if sensor_id not in sensor_ids:
                raise ValueError(f"Sensor QA flag references unknown sensor_id: {sensor_id}")

    if episode["data_status"] == "permissioned_real":
        privacy_state = episode["privacy"]["privacy_review"]
        if privacy_state == "not_required_mock_data":
            raise ValueError("permissioned_real data cannot use not_required_mock_data privacy review")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate Robotics ReviewKit Teleop Review Schema JSON.")
    parser.add_argument(
        "episode",
        nargs="?",
        default=str(ROOT / "examples/teleop_review_mock_episode.json"),
        help="Path to a Teleop Review Schema JSON episode.",
    )
    args = parser.parse_args(argv)

    validate_episode(load_json(Path(args.episode)))
    print(json.dumps({"valid": True, "episode": str(args.episode)}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

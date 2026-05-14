#!/usr/bin/env python3
"""Focused validators for Robotics ReviewKit mock assets."""

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


def taxonomy_ids() -> set[str]:
    data = load_yaml(ROOT / "schema/taxonomy/failure_modes.yaml")
    return {item["id"] for item in data["failure_modes"]}


def intervention_ids() -> set[str]:
    data = load_yaml(ROOT / "schema/taxonomy/intervention_ontology.yaml")
    return {item["id"] for item in data["interventions"]}


def sensor_qa_ids() -> set[str]:
    data = load_yaml(ROOT / "schema/taxonomy/sensor_qa_flags.yaml")
    return {item["id"] for item in data["flags"]}


def task_ids() -> set[str]:
    data = load_yaml(ROOT / "schema/tasks/teleop_tasks.yaml")
    return {item["id"] for item in data["tasks"]}


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


def validate_reference_examples() -> None:
    known_failures = taxonomy_ids()
    known_interventions = intervention_ids()
    known_sensor_flags = sensor_qa_ids()
    known_tasks = task_ids()

    failure_example = load_json(ROOT / "examples/failure_taxonomy_example.json")
    for item in failure_example["failure_annotations"]:
        if item["taxonomy_id"] not in known_failures:
            raise ValueError(f"Unknown taxonomy_id in failure example: {item['taxonomy_id']}")

    intervention_example = load_json(ROOT / "examples/intervention_examples.json")
    for item in intervention_example["interventions"]:
        if item["ontology_id"] not in known_interventions:
            raise ValueError(f"Unknown ontology_id in intervention example: {item['ontology_id']}")

    sensor_example = load_json(ROOT / "examples/sensor_qa_example.json")
    for item in sensor_example["sensor_qa"]["flags"]:
        if item["flag_id"] not in known_sensor_flags:
            raise ValueError(f"Unknown flag_id in sensor QA example: {item['flag_id']}")

    task_example = load_yaml(ROOT / "examples/task_definition_example.yaml")
    if task_example["task_id"] not in known_tasks:
        raise ValueError(f"Unknown task_id in task example: {task_example['task_id']}")
    for failure_id in task_example["review_layers"]["required_failure_checks"]:
        if failure_id not in known_failures:
            raise ValueError(f"Unknown failure check in task example: {failure_id}")
    for flag_id in task_example["review_layers"]["required_sensor_qa"]:
        if flag_id not in known_sensor_flags:
            raise ValueError(f"Unknown sensor QA check in task example: {flag_id}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Robotics ReviewKit mock episode metadata.")
    parser.add_argument(
        "episode",
        nargs="?",
        default=str(ROOT / "examples/teleop_review_mock_episode.json"),
        help="Path to a Teleop Review Schema JSON episode.",
    )
    args = parser.parse_args()

    validate_episode(load_json(Path(args.episode)))
    validate_reference_examples()
    print(f"validated {args.episode}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

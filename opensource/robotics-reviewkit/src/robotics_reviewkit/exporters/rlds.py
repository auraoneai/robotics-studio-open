"""RLDS-style metadata bridge for mock teleop review episodes."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from robotics_reviewkit.episode import NormalizedEpisode
from robotics_reviewkit.episode import duration_seconds
from robotics_reviewkit.episode import normalize_episodes
from robotics_reviewkit.episode import sensor_names
from robotics_reviewkit.episode import training_ready

METADATA_ONLY_LIMITATIONS = [
    "Exports RLDS-style JSON metadata only.",
    "Does not generate tf.train.Example records, TFDS builders, tensors, images, videos, or action arrays.",
    "Mock examples are tutorial data and are not human-validated training datasets.",
]


def _json_dump(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _segment_steps(episode: NormalizedEpisode) -> list[dict[str, Any]]:
    segments = episode.raw.get("segments") or []
    if not segments:
        segments = [{"segment_id": "episode_metadata", "label": "episode metadata placeholder"}]

    steps: list[dict[str, Any]] = []
    for index, segment in enumerate(segments):
        segment_id = segment.get("segment_id") or segment.get("id") or f"segment_{index}" if isinstance(segment, dict) else f"segment_{index}"
        steps.append(
            {
                "step_index": index,
                "is_first": index == 0,
                "is_last": index == len(segments) - 1,
                "is_terminal": index == len(segments) - 1,
                "observation": {
                    "placeholder": True,
                    "sensor_metadata": sensor_names(episode.raw),
                },
                "action": {
                    "placeholder": True,
                    "note": "No teleop action tensor is emitted by this metadata export.",
                },
                "reward": None,
                "discount": None,
                "metadata": {
                    "segment_id": segment_id,
                    "segment": segment,
                },
            }
        )
    return steps


def _episode_payload(episode: NormalizedEpisode, index: int) -> dict[str, Any]:
    raw = episode.raw
    return {
        "episode_id": episode.episode_id,
        "episode_index": index,
        "metadata_only": True,
        "episode_metadata": {
            "task": {
                "id": episode.task_id,
                "name": episode.task_name,
            },
            "embodiment": {
                "id": episode.embodiment_id,
                "name": episode.embodiment_name,
            },
            "duration_seconds": duration_seconds(raw),
            "training_readiness_state": episode.readiness_state,
            "training_ready": training_ready(episode.readiness_state),
            "sensor_qa": raw.get("sensor_qa") or {},
            "interventions": raw.get("interventions") or [],
            "failure_modes": raw.get("failure_modes") or [],
            "review": raw.get("review") or {},
            "mock_data": bool(raw.get("mock_data", True)),
        },
        "steps": _segment_steps(episode),
    }


def build_rlds_metadata_export(
    payload: Any,
    *,
    dataset_name: str = "auraone_mock_rlds_metadata",
) -> dict[str, Any]:
    """Build an RLDS-style metadata JSON export from mock teleop episodes."""

    episodes = normalize_episodes(payload)
    episode_payloads = [_episode_payload(episode, index) for index, episode in enumerate(episodes)]
    task_names = sorted({episode.task_name for episode in episodes})

    return {
        "export_type": "rlds_metadata_bridge",
        "format": "RLDS-style metadata JSON",
        "compatibility": "metadata_only",
        "dataset_info": {
            "name": dataset_name,
            "generated_by": "auraone-robotics-reviewkit",
            "episode_count": len(episode_payloads),
            "task_names": task_names,
            "mock_data": True,
        },
        "episodes": episode_payloads,
        "limitations": METADATA_ONLY_LIMITATIONS,
    }


def write_rlds_metadata_export(
    payload: Any,
    output_dir: str | Path,
    *,
    dataset_name: str = "auraone_mock_rlds_metadata",
) -> dict[str, Any]:
    """Write a deterministic RLDS-style metadata directory."""

    output = Path(output_dir)
    export = build_rlds_metadata_export(payload, dataset_name=dataset_name)

    _json_dump(output / "manifest.json", export)
    _json_dump(output / "dataset_info.json", export["dataset_info"] | {"compatibility": export["compatibility"]})
    for episode in export["episodes"]:
        _json_dump(output / "episodes" / f"{episode['episode_id']}.json", episode)

    return export

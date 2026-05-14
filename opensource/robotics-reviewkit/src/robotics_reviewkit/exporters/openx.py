"""Open X-Embodiment-style metadata bridge for mock teleop review episodes."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from robotics_reviewkit.episode import duration_seconds
from robotics_reviewkit.episode import normalize_episodes
from robotics_reviewkit.episode import sensor_names
from robotics_reviewkit.episode import training_ready

METADATA_ONLY_LIMITATIONS = [
    "Exports OpenX-style manifest JSON metadata only.",
    "Does not generate Open X-Embodiment tensor payloads, TFDS features, images, videos, or action arrays.",
    "Mock examples are tutorial data and are not human-validated training datasets.",
]


def _json_dump(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def build_openx_metadata_export(
    payload: Any,
    *,
    dataset_name: str = "auraone_mock_openx_metadata",
) -> dict[str, Any]:
    """Build an OpenX-style manifest from mock teleop review metadata."""

    episodes = normalize_episodes(payload)
    episode_entries: list[dict[str, Any]] = []

    for index, episode in enumerate(episodes):
        raw = episode.raw
        episode_entries.append(
            {
                "episode_id": episode.episode_id,
                "episode_index": index,
                "metadata_only": True,
                "task": {
                    "id": episode.task_id,
                    "name": episode.task_name,
                },
                "robot": {
                    "embodiment_id": episode.embodiment_id,
                    "embodiment_name": episode.embodiment_name,
                },
                "duration_seconds": duration_seconds(raw),
                "split": "train" if training_ready(episode.readiness_state) else "review",
                "sensors": sensor_names(raw),
                "review_metadata": {
                    "segments": raw.get("segments") or [],
                    "interventions": raw.get("interventions") or [],
                    "failure_modes": raw.get("failure_modes") or [],
                    "sensor_qa": raw.get("sensor_qa") or {},
                    "training_readiness_state": episode.readiness_state,
                    "review": raw.get("review") or {},
                },
                "assets": {
                    "observations": None,
                    "actions": None,
                    "videos": None,
                    "note": "No training payload assets are emitted by this metadata export.",
                },
            }
        )

    return {
        "export_type": "openx_metadata_bridge",
        "format": "OpenX-style manifest JSON",
        "compatibility": "metadata_only",
        "dataset": {
            "name": dataset_name,
            "generated_by": "auraone-robotics-reviewkit",
            "episode_count": len(episode_entries),
            "mock_data": True,
        },
        "episodes": episode_entries,
        "limitations": METADATA_ONLY_LIMITATIONS,
    }


def write_openx_metadata_export(
    payload: Any,
    output_dir: str | Path,
    *,
    dataset_name: str = "auraone_mock_openx_metadata",
) -> dict[str, Any]:
    """Write a deterministic OpenX-style metadata manifest directory."""

    output = Path(output_dir)
    export = build_openx_metadata_export(payload, dataset_name=dataset_name)

    _json_dump(output / "manifest.json", export)
    _json_dump(output / "openx_manifest.json", export)
    for episode in export["episodes"]:
        _json_dump(output / "episodes" / f"{episode['episode_id']}.openx.json", episode)

    return export

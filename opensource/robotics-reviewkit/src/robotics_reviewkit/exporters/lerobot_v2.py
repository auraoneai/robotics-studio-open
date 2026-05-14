from __future__ import annotations

from typing import Any

from robotics_reviewkit.analyzers import summarize_events, validate_event_stream


def export_episode_v2(episode: dict[str, Any]) -> dict[str, Any]:
    """Build a metadata-only LeRobot v2-compatible episode envelope.

    The exporter intentionally preserves review metadata and synthetic step
    descriptors, but does not claim to write video, tensor, parquet, or action
    array shards.
    """

    required = ["episode_id", "task", "review_version", "event_stream", "steps"]
    for field in required:
        if field not in episode:
            raise ValueError(f"missing required field: {field}")
    if episode.get("review_version") != "v2":
        raise ValueError("LeRobot v2 export requires review_version='v2'")

    events = validate_event_stream(episode["event_stream"])
    steps = [_normalize_step(step, index) for index, step in enumerate(episode.get("steps", []))]
    task = str(episode["task"])
    return {
        "format": "lerobot-v2-metadata-bridge",
        "compatibility": "metadata_only",
        "disclosure": "Synthetic/mock metadata bridge; no LeRobot media, tensors, parquet shards, or real robot data are included.",
        "dataset": {
            "episode_count": 1,
            "task_count": 1,
            "synthetic": bool(episode.get("synthetic", True)),
            "features": {
                "observation": "metadata-placeholder",
                "action": "metadata-placeholder",
                "event_stream": "review-labels",
            },
        },
        "tasks": [{"task_index": 0, "task": task}],
        "episodes": [
            {
                "episode_index": 0,
                "episode_id": episode["episode_id"],
                "task_index": 0,
                "duration_seconds": float(episode.get("duration_seconds", 0.0)),
                "frame_count": len(steps),
                "review_version": "v2",
                "metadata_only": True,
                "synthetic": bool(episode.get("synthetic", True)),
                "rubric_anchors": episode.get("rubric_anchors", []),
                "event_summary": summarize_events(events),
                "events": events,
                "steps": steps,
            }
        ],
    }


def _normalize_step(step: dict[str, Any], index: int) -> dict[str, Any]:
    return {
        "frame_index": int(step.get("frame_index", index)),
        "timestamp_s": float(step.get("timestamp_s", index)),
        "observation": step.get("observation", {"placeholder": True}),
        "action": step.get("action", {"placeholder": True}),
        "metadata_only": True,
    }

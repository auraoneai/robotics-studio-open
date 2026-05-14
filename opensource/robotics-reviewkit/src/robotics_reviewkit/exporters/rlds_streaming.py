from __future__ import annotations

import json
from collections.abc import Iterable, Iterator
from pathlib import Path
from typing import Any

from robotics_reviewkit.analyzers import validate_event_stream


def stream_episode(episode: dict[str, Any]) -> Iterator[dict[str, Any]]:
    """Yield RLDS-style metadata records one step at a time."""

    yield from stream_episode_records(
        episode_id=str(episode.get("episode_id", "unknown")),
        steps=episode.get("steps", []),
        event_stream=episode.get("event_stream", []),
        synthetic=bool(episode.get("synthetic", True)),
    )


def stream_episode_records(
    episode_id: str,
    steps: Iterable[dict[str, Any]],
    event_stream: Iterable[dict[str, Any]] = (),
    synthetic: bool = True,
) -> Iterator[dict[str, Any]]:
    events = validate_event_stream(event_stream)
    event_cursor = 0
    for index, step in enumerate(steps):
        timestamp = float(step.get("timestamp_s", index))
        attached: list[dict[str, Any]] = []
        while event_cursor < len(events) and events[event_cursor]["timestamp_s"] <= timestamp:
            attached.append(events[event_cursor])
            event_cursor += 1
        yield {
            "episode_id": episode_id,
            "step_index": index,
            "timestamp_s": timestamp,
            "is_first": index == 0,
            "is_last": False,
            "is_terminal": False,
            "observation": step.get("observation", {"placeholder": True}),
            "action": step.get("action", {"placeholder": True}),
            "review_events": attached,
            "synthetic": synthetic,
            "metadata_only": True,
        }
    if not events[event_cursor:]:
        return
    yield {
        "episode_id": episode_id,
        "step_index": None,
        "timestamp_s": events[-1]["timestamp_s"],
        "is_first": False,
        "is_last": True,
        "is_terminal": True,
        "observation": {"placeholder": True},
        "action": {"placeholder": True},
        "review_events": events[event_cursor:],
        "synthetic": synthetic,
        "metadata_only": True,
    }


def write_jsonl_stream(episode: dict[str, Any], output_path: str | Path) -> Path:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in stream_episode(episode):
            handle.write(json.dumps(record, sort_keys=True) + "\n")
    return path

from __future__ import annotations

from collections.abc import Iterable
from typing import Any


VALID_EVENT_LABELS = {"success", "contact", "safety", "drift", "recovery", "intervention"}


def validate_event_stream(events: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return a timestamp-sorted event list after validating the v2 event contract."""

    normalized: list[dict[str, Any]] = []
    previous = -1.0
    for index, event in enumerate(events):
        if "timestamp_s" not in event:
            raise ValueError(f"event {index} missing timestamp_s")
        if "label" not in event:
            raise ValueError(f"event {index} missing label")
        timestamp = float(event["timestamp_s"])
        label = str(event["label"])
        if timestamp < 0:
            raise ValueError(f"event {index} timestamp_s must be non-negative")
        if timestamp < previous:
            raise ValueError("event stream timestamps must be monotonically increasing")
        if label not in VALID_EVENT_LABELS:
            raise ValueError(f"unsupported event label: {label}")
        normalized.append(
            {
                "timestamp_s": timestamp,
                "label": label,
                "severity": event.get("severity", "info"),
                "notes": event.get("notes", ""),
            }
        )
        previous = timestamp
    return normalized


def summarize_events(events: Iterable[dict[str, Any]]) -> dict[str, Any]:
    normalized = validate_event_stream(events)
    counts: dict[str, int] = {label: 0 for label in sorted(VALID_EVENT_LABELS)}
    first_timestamp = normalized[0]["timestamp_s"] if normalized else 0.0
    last_timestamp = normalized[-1]["timestamp_s"] if normalized else 0.0
    for event in normalized:
        counts[event["label"]] += 1
    return {
        "event_count": len(normalized),
        "counts": counts,
        "first_timestamp_s": first_timestamp,
        "last_timestamp_s": last_timestamp,
        "duration_observed_s": max(0.0, last_timestamp - first_timestamp),
        "synthetic": True,
    }

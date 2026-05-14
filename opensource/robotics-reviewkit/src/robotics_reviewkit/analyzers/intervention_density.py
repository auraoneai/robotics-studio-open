from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from .event_stream import validate_event_stream


def intervention_density(events: Iterable[dict[str, Any]], duration_seconds: float) -> dict[str, float]:
    normalized = validate_event_stream(events)
    interventions = sum(1 for event in normalized if event["label"] == "intervention")
    recoveries = sum(1 for event in normalized if event["label"] == "recovery")
    safety_events = sum(1 for event in normalized if event["label"] == "safety")
    minutes = max(float(duration_seconds) / 60.0, 1e-9)
    return {
        "interventions": float(interventions),
        "recoveries": float(recoveries),
        "safety_events": float(safety_events),
        "duration_minutes": minutes,
        "events_per_minute": interventions / minutes,
        "recoveries_per_minute": recoveries / minutes,
        "safety_events_per_minute": safety_events / minutes,
    }


def per_task_density(episodes: Iterable[dict[str, Any]]) -> dict[str, dict[str, float]]:
    grouped: dict[str, list[float]] = {}
    for episode in episodes:
        task = str(episode.get("task", "unknown"))
        density = intervention_density(
            episode.get("event_stream", []),
            float(episode.get("duration_seconds", 60.0)),
        )["events_per_minute"]
        grouped.setdefault(task, []).append(density)
    return {
        task: {
            "episode_count": float(len(values)),
            "mean_events_per_minute": sum(values) / len(values),
            "max_events_per_minute": max(values),
        }
        for task, values in grouped.items()
    }

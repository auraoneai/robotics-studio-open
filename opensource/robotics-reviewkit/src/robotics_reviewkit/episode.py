"""Shared helpers for mock Teleop Review Schema episode metadata."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

Episode = dict[str, Any]

READINESS_STATES = {
    "approved",
    "blocked",
    "needs_review",
    "not_ready",
    "quarantined",
    "ready",
    "rejected",
    "training_ready",
}


@dataclass(frozen=True)
class NormalizedEpisode:
    """Small normalized view used by metadata exporters."""

    raw: Episode
    episode_id: str
    task_id: str
    task_name: str
    embodiment_id: str
    embodiment_name: str
    readiness_state: str


def _require_mapping(value: Any, field_name: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be an object")
    return value


def _read_required_string(source: dict[str, Any], keys: tuple[str, ...], field_name: str) -> str:
    for key in keys:
        value = source.get(key)
        if isinstance(value, str) and value.strip():
            return value
    raise ValueError(f"missing required field: {field_name}")


def _normalize_named_ref(value: Any, field_name: str) -> tuple[str, str]:
    if isinstance(value, str) and value.strip():
        return value, value
    mapping = _require_mapping(value, field_name)
    ref_id = _read_required_string(mapping, ("id", f"{field_name}_id", "key"), f"{field_name}.id")
    name = mapping.get("name") or mapping.get("label") or mapping.get("title") or ref_id
    if not isinstance(name, str) or not name.strip():
        raise ValueError(f"{field_name}.name must be a non-empty string when provided")
    return ref_id, name


def _normalize_readiness(raw: Episode) -> str:
    readiness = raw.get("training_readiness")
    if readiness is None and isinstance(raw.get("review"), dict):
        readiness = raw["review"].get("training_readiness")
    if readiness is None:
        return "needs_review"

    if isinstance(readiness, str):
        state = readiness
    elif isinstance(readiness, dict):
        state = readiness.get("state") or readiness.get("status") or readiness.get("label")
    else:
        raise ValueError("training_readiness must be a string or object")

    if not isinstance(state, str) or not state.strip():
        raise ValueError("training_readiness.state must be a non-empty string")

    normalized = state.strip().lower().replace("-", "_").replace(" ", "_")
    if normalized not in READINESS_STATES:
        allowed = ", ".join(sorted(READINESS_STATES))
        raise ValueError(f"training_readiness.state must be one of: {allowed}")
    return normalized


def validate_episode_metadata(raw: Episode) -> NormalizedEpisode:
    """Validate the minimal metadata subset required by PRDs 42-43.

    This validates metadata only. It intentionally does not require real tensor,
    image, video, proprioception, or action-array payloads.
    """

    episode = _require_mapping(raw, "episode")
    episode_id = _read_required_string(episode, ("episode_id", "id"), "episode_id")
    task_id, task_name = _normalize_named_ref(episode.get("task"), "task")
    if episode.get("embodiment") is None:
        embodiment_id, embodiment_name = "unspecified_mock_embodiment", "Unspecified Mock Embodiment"
    else:
        embodiment_id, embodiment_name = _normalize_named_ref(episode.get("embodiment"), "embodiment")
    readiness_state = _normalize_readiness(episode)

    sensors = episode.get("sensors", [])
    if sensors is None:
        sensors = []
    if not isinstance(sensors, list):
        raise ValueError("sensors must be an array when provided")

    for collection_name in ("segments", "interventions", "failure_modes"):
        collection = episode.get(collection_name, [])
        if collection is None:
            collection = []
        if not isinstance(collection, list):
            raise ValueError(f"{collection_name} must be an array when provided")

    for index, segment in enumerate(episode.get("segments") or []):
        segment_mapping = _require_mapping(segment, f"segments[{index}]")
        start = segment_mapping.get(
            "start_seconds",
            segment_mapping.get("start_time_seconds", segment_mapping.get("start_s")),
        )
        end = segment_mapping.get(
            "end_seconds",
            segment_mapping.get("end_time_seconds", segment_mapping.get("end_s")),
        )
        if start is not None and end is not None:
            if not isinstance(start, (int, float)) or not isinstance(end, (int, float)):
                raise ValueError(f"segments[{index}] start/end times must be numbers")
            if start < 0 or end < 0 or end < start:
                raise ValueError(f"segments[{index}] has an invalid time range")

    return NormalizedEpisode(
        raw=episode,
        episode_id=episode_id,
        task_id=task_id,
        task_name=task_name,
        embodiment_id=embodiment_id,
        embodiment_name=embodiment_name,
        readiness_state=readiness_state,
    )


def normalize_episodes(payload: Any) -> list[NormalizedEpisode]:
    """Load one episode, a list of episodes, or {"episodes": [...]}."""

    if isinstance(payload, dict) and isinstance(payload.get("episodes"), list):
        episodes = payload["episodes"]
    elif isinstance(payload, list):
        episodes = payload
    elif isinstance(payload, dict):
        episodes = [payload]
    else:
        raise ValueError("input must be an episode object, an episode array, or an object with episodes")

    if not episodes:
        raise ValueError("input must contain at least one episode")

    return [validate_episode_metadata(episode) for episode in episodes]


def sensor_names(raw: Episode) -> list[str]:
    names: list[str] = []
    for index, sensor in enumerate(raw.get("sensors") or []):
        if isinstance(sensor, str) and sensor.strip():
            names.append(sensor)
        elif isinstance(sensor, dict):
            sensor_id = sensor.get("id") or sensor.get("name") or sensor.get("type") or f"sensor_{index}"
            names.append(str(sensor_id))
        else:
            names.append(f"sensor_{index}")
    if not names and isinstance(raw.get("sensor_qa"), list):
        for index, qa_entry in enumerate(raw["sensor_qa"]):
            if isinstance(qa_entry, dict):
                names.append(str(qa_entry.get("sensor") or qa_entry.get("id") or f"sensor_{index}"))
    return names


def duration_seconds(raw: Episode) -> float | None:
    value = raw.get("duration_seconds")
    if isinstance(value, (int, float)) and value >= 0:
        return float(value)
    value = raw.get("duration_s")
    if isinstance(value, (int, float)) and value >= 0:
        return float(value)
    timestamps = raw.get("timestamps")
    if isinstance(timestamps, dict):
        start = timestamps.get("start_seconds")
        end = timestamps.get("end_seconds")
        if isinstance(start, (int, float)) and isinstance(end, (int, float)) and end >= start:
            return float(end - start)
    return None


def training_ready(readiness_state: str) -> bool:
    return readiness_state in {"approved", "ready", "training_ready"}

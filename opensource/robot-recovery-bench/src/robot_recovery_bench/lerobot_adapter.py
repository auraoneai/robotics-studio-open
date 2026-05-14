from __future__ import annotations

from typing import Any


def from_lerobot_episode(episode: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in episode.get("interventions", []):
        rows.append(
            {
                "episode_id": str(episode.get("episode_id", "")),
                "task": episode.get("task", ""),
                "failure_reason": item.get("reason", ""),
                "intervention_type": item.get("type", ""),
                "start_time": item.get("failure_time", item.get("start_time", 0)),
                "intervention_time": item.get("start_time", 0),
                "end_time": item.get("end_time", 0),
                "recovery_success": item.get("recovery_success", False),
                "operator_action": item.get("operator_action", ""),
                "training_ready": item.get("training_ready", False),
            }
        )
    return rows

from __future__ import annotations

from typing import Any


def from_rlds_steps(episode_id: str, task: str, steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for step in steps:
        if "intervention" not in step:
            continue
        item = step["intervention"]
        rows.append(
            {
                "episode_id": episode_id,
                "task": task,
                "failure_reason": item.get("reason", ""),
                "intervention_type": item.get("type", ""),
                "start_time": item.get("failure_time", step.get("timestamp", 0)),
                "intervention_time": item.get("start_time", step.get("timestamp", 0)),
                "end_time": item.get("end_time", step.get("timestamp", 0)),
                "recovery_success": item.get("recovery_success", False),
                "operator_action": item.get("operator_action", ""),
                "training_ready": item.get("training_ready", False),
            }
        )
    return rows

from __future__ import annotations

from typing import Any, Dict, List

REQUIRED = ["episode_id", "data_source", "task", "segments", "interventions", "sensor_qa"]


def validate_episode(episode: Dict[str, Any]) -> List[str]:
    errors = [f"missing {field}" for field in REQUIRED if field not in episode]
    if episode.get("data_source") not in {"mock", "synthetic_tutorial", "customer_permissioned"}:
        errors.append("data_source must be explicit")
    for field in ["segments", "interventions", "sensor_qa"]:
        if field in episode and not isinstance(episode[field], list):
            errors.append(f"{field} must be a list")
    return errors

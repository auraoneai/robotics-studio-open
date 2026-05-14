from __future__ import annotations


def minimal_card(name: str, robot_type: str) -> dict:
    return {
        "name": name,
        "robot": {"type": robot_type, "morphology": "unspecified"},
        "sensors": [],
        "action_space": {},
        "coordinate_frames": [],
        "control_rate_hz": 0,
        "teleop_method": "unspecified",
        "environment": {},
        "safety_boundaries": [],
        "limitations": [],
    }


from __future__ import annotations

REQUIRED_FIELDS = [
    "name",
    "robot",
    "sensors",
    "action_space",
    "coordinate_frames",
    "control_rate_hz",
    "teleop_method",
    "environment",
    "safety_boundaries",
    "limitations",
]


def validate_card(card: dict) -> list[str]:
    errors: list[str] = []
    for field in REQUIRED_FIELDS:
        if field not in card:
            errors.append(f"missing required field `{field}`")
    if not card.get("coordinate_frames"):
        errors.append("coordinate_frames must include at least one frame")
    if not isinstance(card.get("sensors", []), list) or not card.get("sensors"):
        errors.append("sensors must include at least one sensor")
    if not isinstance(card.get("action_space"), dict) or not card.get("action_space"):
        errors.append("action_space must be an object")
    if not isinstance(card.get("control_rate_hz"), (int, float)) or card.get("control_rate_hz", 0) <= 0:
        errors.append("control_rate_hz must be positive")
    return errors


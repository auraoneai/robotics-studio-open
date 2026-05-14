from __future__ import annotations


def normalize_metadata(raw: dict) -> dict:
    return {
        "robot": raw.get("robot", raw.get("robot_type", "unknown")),
        "control_rate_hz": raw.get("control_rate_hz", raw.get("fps", 10)),
        "coordinate_frame": raw.get("coordinate_frame", "base_link"),
        "camera_pose": raw.get("camera_pose", "nominal"),
        "lighting": raw.get("lighting", "normal"),
    }


from __future__ import annotations


def vision_shifts(metadata: dict) -> list[dict]:
    base = dict(metadata)
    dim = dict(metadata)
    dim["lighting"] = "dim"
    shifted = dict(metadata)
    shifted["camera_pose"] = "slightly_shifted"
    return [
        {"family": "vision", "variant": "original", "metadata": base},
        {"family": "vision", "variant": "dim_lighting", "metadata": dim},
        {"family": "vision", "variant": "camera_shift", "metadata": shifted},
    ]


from __future__ import annotations


def embodiment_shifts(metadata: dict) -> list[dict]:
    base = dict(metadata)
    wrong = dict(metadata)
    wrong["control_rate_hz"] = max(1, int(metadata.get("control_rate_hz", 10)) // 2)
    missing = dict(metadata)
    missing.pop("coordinate_frame", None)
    return [
        {"family": "metadata", "variant": "original", "metadata": base},
        {"family": "metadata", "variant": "control_rate_mismatch", "metadata": wrong},
        {"family": "metadata", "variant": "missing_frame", "metadata": missing},
    ]


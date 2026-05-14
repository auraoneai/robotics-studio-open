from __future__ import annotations


FAIL_VARIANTS = {"dim_lighting", "camera_shift", "control_rate_mismatch", "missing_frame", "verify_before_act"}


def score(episode: dict, perturbation: dict) -> dict:
    variant = perturbation["variant"]
    family = perturbation["family"]
    passed = variant not in FAIL_VARIANTS and "fragile" not in episode.get("tags", [])
    confidence = 0.92 if passed else 0.31
    cluster = "none" if passed else f"{family}_{variant}"
    return {"passed": passed, "confidence": confidence, "cluster": cluster}


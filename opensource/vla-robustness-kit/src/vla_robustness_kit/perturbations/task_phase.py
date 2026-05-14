from __future__ import annotations


def task_phase_reorders(phases: list[str]) -> list[dict]:
    if not phases:
        phases = ["approach", "act", "verify"]
    return [
        {"family": "task_phase", "variant": "original", "phases": phases},
        {"family": "task_phase", "variant": "verify_before_act", "phases": phases[:-2] + phases[-1:] + phases[-2:-1] if len(phases) >= 2 else phases},
    ]


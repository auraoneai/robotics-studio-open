from __future__ import annotations

from collections import Counter

from .validate import RecoverySegment


def compute_metrics(segments: list[RecoverySegment]) -> dict[str, object]:
    total = len(segments)
    if total == 0:
        return {
            "segments": 0,
            "intervention_rate": 0.0,
            "recovery_success_rate": 0.0,
            "training_ready_rate": 0.0,
            "avg_time_to_intervention": 0.0,
            "avg_recovery_duration": 0.0,
            "failure_clusters": {},
        }
    success = sum(1 for item in segments if item.recovery_success)
    ready = sum(1 for item in segments if item.training_ready)
    time_to_intervention = [item.intervention_time - item.start_time for item in segments]
    recovery_duration = [item.end_time - item.intervention_time for item in segments]
    clusters = Counter(item.failure_reason for item in segments)
    return {
        "segments": total,
        "intervention_rate": 1.0,
        "recovery_success_rate": success / total,
        "training_ready_rate": ready / total,
        "avg_time_to_intervention": sum(time_to_intervention) / total,
        "avg_recovery_duration": sum(recovery_duration) / total,
        "failure_clusters": dict(sorted(clusters.items())),
    }

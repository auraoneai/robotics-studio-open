from __future__ import annotations

import json


def render_report(metrics: dict[str, object], fmt: str = "markdown") -> str:
    if fmt == "json":
        return json.dumps(metrics, indent=2, sort_keys=True) + "\n"
    if fmt != "markdown":
        raise ValueError(f"unsupported report format: {fmt}")
    lines = [
        "# Robot Recovery Bench Report",
        "",
        f"- Segments: `{metrics['segments']}`",
        f"- Recovery success rate: `{metrics['recovery_success_rate']:.2f}`",
        f"- Training-ready rate: `{metrics['training_ready_rate']:.2f}`",
        f"- Average time to intervention: `{metrics['avg_time_to_intervention']:.3f}`",
        f"- Average recovery duration: `{metrics['avg_recovery_duration']:.3f}`",
        "",
        "## Failure Clusters",
        "",
    ]
    clusters = metrics.get("failure_clusters", {})
    if isinstance(clusters, dict):
        for reason, count in clusters.items():
            lines.append(f"- `{reason}`: {count}")
    lines.extend(["", "## Scope", "", "This is a recovery data-quality diagnostic, not a robot safety benchmark."])
    return "\n".join(lines) + "\n"

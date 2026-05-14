from __future__ import annotations

from .metrics import recommendations, summarize


def render_markdown(results: list[dict]) -> str:
    summary = summarize(results)
    lines = [
        "# VLA Robustness Diagnostic Report",
        "",
        "This is a robustness diagnostic, not a robot safety claim.",
        "",
        f"- Perturbation runs: `{summary['total']}`",
        f"- Aggregate pass rate: `{summary['pass_rate']:.2f}`",
        "",
        "## Perturbation Families",
        "",
    ]
    for family, rate in sorted(summary["family_rates"].items()):
        lines.append(f"- `{family}`: `{rate:.2f}`")
    lines.extend(["", "## Failure Clusters", ""])
    if summary["clusters"]:
        for cluster, count in sorted(summary["clusters"].items()):
            lines.append(f"- `{cluster}`: {count}")
    else:
        lines.append("- No failure clusters.")
    lines.extend(["", "## Recommended Follow-Up Data Collection", ""])
    for rec in recommendations(summary):
        lines.append(f"- {rec}")
    lines.append("")
    return "\n".join(lines)


from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .checks.actions import check_action_state_shapes
from .checks.cards import check_dataset_card
from .checks.episodes import check_episodes
from .checks.interventions import check_interventions
from .checks.metadata import check_metadata
from .checks.sensors import check_sensors
from .checks.video import check_videos
from .dataset_loader import DatasetInfo, load_dataset
from .findings import SEVERITY_ORDER, Finding


@dataclass
class QualityReport:
    dataset: DatasetInfo
    findings: list[Finding]

    @property
    def ok(self) -> bool:
        return not self.findings

    def failing_findings(self, threshold: str) -> list[Finding]:
        if threshold == "none":
            return []
        return [finding for finding in self.findings if SEVERITY_ORDER[finding.severity] >= SEVERITY_ORDER[threshold]]

    def to_dict(self) -> dict[str, object]:
        counts: dict[str, int] = {}
        for finding in self.findings:
            counts[finding.severity] = counts.get(finding.severity, 0) + 1
        return {
            "root": str(self.dataset.root),
            "source": self.dataset.source,
            "remote": self.dataset.remote,
            "finding_count": len(self.findings),
            "counts": counts,
            "episode_count": len(self.dataset.episodes),
            "findings": [finding.to_dict() for finding in self.findings],
        }


def run_quality_gates(path: str | Path) -> QualityReport:
    return run_quality_gates_for_dataset(load_dataset(path))


def run_quality_gates_for_dataset(dataset: DatasetInfo) -> QualityReport:
    findings: list[Finding] = []
    for check in [
        check_metadata,
        check_episodes,
        check_sensors,
        check_action_state_shapes,
        check_videos,
        check_interventions,
        check_dataset_card,
    ]:
        findings.extend(check(dataset))
    return QualityReport(dataset=dataset, findings=findings)


def render_report(report: QualityReport, fmt: str) -> str:
    if fmt == "json":
        return json.dumps(report.to_dict(), indent=2, sort_keys=True) + "\n"
    if fmt == "markdown":
        return _markdown(report)
    if fmt == "hf-card":
        return _hf_card(report)
    if fmt == "badge":
        return json.dumps(_badge(report), indent=2, sort_keys=True) + "\n"
    raise ValueError(f"unsupported format: {fmt}")


def _markdown(report: QualityReport) -> str:
    lines = [
        "# LeRobot Quality Gates Report",
        "",
        f"- Dataset: `{report.dataset.source if report.dataset.remote else report.dataset.root}`",
        f"- Episodes: `{len(report.dataset.episodes)}`",
        f"- Findings: `{len(report.findings)}`",
        "",
    ]
    if not report.findings:
        lines.extend(["## Findings", "", "No findings.", ""])
        return "\n".join(lines)
    lines.extend(["## Findings", "", "| Severity | Gate | Path | Finding | Remediation |", "| --- | --- | --- | --- | --- |"])
    for item in report.findings:
        lines.append(f"| {item.severity} | `{item.gate}` | `{item.path}` | {item.message} | {item.remediation} |")
    lines.extend(["", "## Scope", "", "This report is a dataset quality diagnostic, not a robot safety certification or benchmark."])
    return "\n".join(lines) + "\n"


def _hf_card(report: QualityReport) -> str:
    status = "passing" if not report.findings else "needs review"
    lines = [
        "## AuraOne LeRobot Quality Gates",
        "",
        f"- Status: `{status}`",
        f"- Episodes checked: `{len(report.dataset.episodes)}`",
        f"- Findings: `{len(report.findings)}`",
        "",
        "This check reviews metadata, episode integrity, sensors, videos, action/state shapes, intervention labels, and dataset-card disclosure. It is not a safety certification.",
        "",
    ]
    if report.findings:
        lines.extend(["### Open Findings", ""])
        for item in report.findings[:10]:
            lines.append(f"- `{item.severity}` `{item.gate}`: {item.message}")
    return "\n".join(lines) + "\n"


def _badge(report: QualityReport) -> dict[str, str]:
    if report.failing_findings("high"):
        return {"schemaVersion": 1, "label": "lerobot quality", "message": "high risk", "color": "red"}
    if report.failing_findings("medium"):
        return {"schemaVersion": 1, "label": "lerobot quality", "message": "needs review", "color": "yellow"}
    return {"schemaVersion": 1, "label": "lerobot quality", "message": "passing", "color": "brightgreen"}

from __future__ import annotations

from .report import QualityReport, render_report


def badge_json(report: QualityReport) -> str:
    return render_report(report, "badge")

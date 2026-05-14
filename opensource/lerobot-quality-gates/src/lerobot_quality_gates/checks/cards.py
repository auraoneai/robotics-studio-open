from __future__ import annotations

import re

from lerobot_quality_gates.dataset_loader import DatasetInfo
from lerobot_quality_gates.findings import Finding, finding


def check_dataset_card(dataset: DatasetInfo) -> list[Finding]:
    findings: list[Finding] = []
    text = dataset.readme
    if not text:
        return [
            finding(
                "card",
                "medium",
                "Dataset README/card is missing.",
                "README.md",
                "Add a dataset card describing source, robot, sensors, tasks, limitations, and whether examples are mock/tutorial.",
            )
        ]
    required_terms = {
        "robot": "Document the robot or embodiment.",
        "sensor": "Document sensors and cameras.",
        "task": "Document task families.",
        "limitation": "Document known limitations.",
    }
    for term, remediation in required_terms.items():
        if not re.search(term, text, re.I):
            findings.append(finding("card", "low", f"Dataset card does not mention `{term}`.", "README.md", remediation))
    if "mock" not in text.lower() and "synthetic" not in text.lower() and "tutorial" not in text.lower():
        findings.append(finding("card", "medium", "Dataset card does not label examples as mock, synthetic, or tutorial.", "README.md", "Disclose mock/tutorial status for public examples."))
    return findings

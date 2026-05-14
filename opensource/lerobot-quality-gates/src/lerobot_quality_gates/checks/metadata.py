from __future__ import annotations

from lerobot_quality_gates.dataset_loader import DatasetInfo
from lerobot_quality_gates.findings import Finding, finding


REQUIRED_INFO = ["codebase_version", "fps", "features", "splits", "robot_type", "total_episodes"]


def check_metadata(dataset: DatasetInfo) -> list[Finding]:
    findings: list[Finding] = []
    if not dataset.info:
        return [
            finding(
                "metadata",
                "high",
                "`meta/info.json` is missing or invalid.",
                "meta/info.json",
                "Add LeRobot-style dataset metadata with fps, features, splits, robot type, and episode totals.",
            )
        ]
    for key in REQUIRED_INFO:
        if key not in dataset.info:
            findings.append(
                finding(
                    "metadata",
                    "high" if key in {"fps", "features", "total_episodes"} else "medium",
                    f"`meta/info.json` is missing `{key}`.",
                    "meta/info.json",
                    f"Add `{key}` to dataset metadata.",
                )
            )
    if not isinstance(dataset.info.get("fps"), int | float) or dataset.info.get("fps", 0) <= 0:
        findings.append(finding("metadata", "high", "`fps` must be a positive number.", "meta/info.json", "Set the capture/control frame rate."))
    if not isinstance(dataset.info.get("features"), dict):
        findings.append(finding("metadata", "high", "`features` must declare observation/action/state schemas.", "meta/info.json", "Declare LeRobot feature metadata."))
    if dataset.info.get("total_episodes") != len(dataset.episodes):
        findings.append(
            finding(
                "metadata",
                "medium",
                "`total_episodes` does not match `meta/episodes.json`.",
                "meta/info.json",
                "Update `total_episodes` or the episode manifest so they agree.",
            )
        )
    return findings

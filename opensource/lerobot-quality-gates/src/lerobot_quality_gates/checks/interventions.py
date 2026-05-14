from __future__ import annotations

from lerobot_quality_gates.dataset_loader import DatasetInfo
from lerobot_quality_gates.findings import Finding, finding


def check_interventions(dataset: DatasetInfo) -> list[Finding]:
    findings: list[Finding] = []
    claims_hil = bool(dataset.info.get("hil") or dataset.info.get("interventions") or "intervention" in dataset.readme.lower() or "recovery" in dataset.readme.lower())
    if not claims_hil:
        return findings
    for episode in dataset.episodes:
        if not episode.interventions:
            findings.append(
                finding(
                    "interventions",
                    "medium",
                    f"Episode {episode.episode_id} has no intervention records despite HIL/recovery dataset claims.",
                    "meta/episodes.json",
                    "Add intervention/recovery records or remove HIL/recovery claims.",
                )
            )
            continue
        for idx, item in enumerate(episode.interventions):
            for key in ["type", "start_time", "end_time", "reason", "recovery_success"]:
                if key not in item:
                    findings.append(
                        finding(
                            "interventions",
                            "medium",
                            f"Episode {episode.episode_id} intervention {idx} is missing `{key}`.",
                            "meta/episodes.json",
                            f"Add `{key}` so recovery segments can be reviewed and reused.",
                        )
                    )
    return findings

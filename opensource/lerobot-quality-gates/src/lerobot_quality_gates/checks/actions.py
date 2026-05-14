from __future__ import annotations

from lerobot_quality_gates.dataset_loader import DatasetInfo
from lerobot_quality_gates.findings import Finding, finding


def check_action_state_shapes(dataset: DatasetInfo) -> list[Finding]:
    findings: list[Finding] = []
    features = dataset.info.get("features", {}) if isinstance(dataset.info.get("features"), dict) else {}
    expected_action = _shape(features.get("action"))
    expected_state = _shape(features.get("observation.state"))
    for episode in dataset.episodes:
        if expected_action and episode.action_shape != expected_action:
            findings.append(
                finding(
                    "actions",
                    "high",
                    f"Episode {episode.episode_id} action shape `{episode.action_shape}` does not match declared `{expected_action}`.",
                    "meta/episodes.json",
                    "Repair action tensors or update feature metadata.",
                )
            )
        if expected_state and episode.state_shape != expected_state:
            findings.append(
                finding(
                    "actions",
                    "medium",
                    f"Episode {episode.episode_id} state shape `{episode.state_shape}` does not match declared `{expected_state}`.",
                    "meta/episodes.json",
                    "Repair state tensors or update feature metadata.",
                )
            )
    return findings


def _shape(value: object) -> list[int] | None:
    if isinstance(value, dict) and isinstance(value.get("shape"), list):
        shape = value["shape"]
        if all(isinstance(item, int) for item in shape):
            return shape
    return None

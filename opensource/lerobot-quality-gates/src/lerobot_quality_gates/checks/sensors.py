from __future__ import annotations

from lerobot_quality_gates.dataset_loader import DatasetInfo
from lerobot_quality_gates.findings import Finding, finding


def check_sensors(dataset: DatasetInfo) -> list[Finding]:
    findings: list[Finding] = []
    features = dataset.info.get("features", {}) if isinstance(dataset.info.get("features"), dict) else {}
    camera_features = [name for name in features if name.startswith("observation.images.")]
    if not camera_features:
        findings.append(finding("sensors", "medium", "No camera features are declared.", "meta/info.json", "Declare camera observation features used by the dataset."))
    if "action" not in features:
        findings.append(finding("sensors", "high", "`action` feature is missing.", "meta/info.json", "Declare action shape and dtype."))
    if "observation.state" not in features:
        findings.append(finding("sensors", "medium", "`observation.state` feature is missing.", "meta/info.json", "Declare state/proprioception shape and dtype if available."))
    for episode in dataset.episodes:
        for camera in camera_features:
            if camera not in episode.video_paths:
                findings.append(finding("sensors", "high", f"Episode {episode.episode_id} is missing video path for `{camera}`.", "meta/episodes.json", "Add camera video path for every episode or remove the declared feature."))
    return findings

from __future__ import annotations

from lerobot_quality_gates.dataset_loader import DatasetInfo
from lerobot_quality_gates.findings import Finding, finding


def check_videos(dataset: DatasetInfo) -> list[Finding]:
    findings: list[Finding] = []
    for episode in dataset.episodes:
        for camera, rel_path in episode.video_paths.items():
            if dataset.remote:
                continue
            path = dataset.root / rel_path
            if not path.exists():
                findings.append(finding("video", "high", f"Episode {episode.episode_id} video for `{camera}` is missing.", rel_path, "Add the referenced video file or update the manifest."))
            elif path.stat().st_size <= 1:
                findings.append(finding("video", "high", f"Episode {episode.episode_id} video for `{camera}` is empty or only a placeholder.", rel_path, "Replace empty placeholder videos before training."))
            elif path.suffix.lower() not in {".mp4", ".mov", ".avi", ".mkv"}:
                findings.append(finding("video", "low", f"Episode {episode.episode_id} video for `{camera}` has unusual extension.", rel_path, "Use MP4 or document the video container."))
    return findings

from __future__ import annotations

from lerobot_quality_gates.dataset_loader import DatasetInfo
from lerobot_quality_gates.findings import Finding, finding


def check_episodes(dataset: DatasetInfo) -> list[Finding]:
    findings: list[Finding] = []
    if not dataset.episodes:
        return [
            finding(
                "episodes",
                "high",
                "`meta/episodes.json` has no episode records.",
                "meta/episodes.json",
                "Add one record per episode with id, task, frame count, timestamps, data path, and video paths.",
            )
        ]
    seen: set[int] = set()
    for episode in dataset.episodes:
        prefix = f"episode {episode.episode_id}"
        if episode.episode_id < 0:
            findings.append(finding("episodes", "high", "Episode is missing a valid id.", "meta/episodes.json", "Add a non-negative episode id."))
        if episode.episode_id in seen:
            findings.append(finding("episodes", "high", f"Duplicate episode id `{episode.episode_id}`.", "meta/episodes.json", "Use unique episode ids."))
        seen.add(episode.episode_id)
        if not episode.task:
            findings.append(finding("episodes", "medium", f"{prefix} is missing a task label.", "meta/episodes.json", "Add a task label for split and training analysis."))
        if not episode.frames or episode.frames <= 0:
            findings.append(finding("episodes", "high", f"{prefix} has invalid frame count.", "meta/episodes.json", "Set a positive frame count."))
        if episode.start_time is None or episode.end_time is None or episode.end_time <= episode.start_time:
            findings.append(finding("episodes", "high", f"{prefix} has invalid start/end timestamps.", "meta/episodes.json", "Record monotonic episode start and end times."))
        if episode.frames and episode.timestamps and len(episode.timestamps) != episode.frames:
            findings.append(finding("episodes", "medium", f"{prefix} timestamp count does not match frames.", "meta/episodes.json", "Ensure every frame has one timestamp."))
        if episode.timestamps and any(curr <= prev for prev, curr in zip(episode.timestamps, episode.timestamps[1:])):
            findings.append(finding("episodes", "high", f"{prefix} timestamps are not strictly monotonic.", "meta/episodes.json", "Sort or repair frame timestamps before training."))
        if episode.data_path and not dataset.remote and not (dataset.root / episode.data_path).exists():
            findings.append(finding("episodes", "high", f"{prefix} data file is missing.", episode.data_path, "Add the referenced data shard or update the manifest."))
    return findings

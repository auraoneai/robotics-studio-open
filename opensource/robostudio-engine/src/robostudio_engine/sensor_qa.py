from __future__ import annotations

import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path
from statistics import mean, pstdev
from typing import Any

from .contracts import EpisodeMeta


@dataclass(frozen=True)
class QAFinding:
    check: str
    severity: str
    episode_id: str
    sensor: str
    message: str
    evidence: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class SensorQARunner:
    def __init__(
        self,
        dropped_frame_threshold: float = 0.05,
        av_sync_tolerance_ms: float = 25.0,
        joint_sigma_threshold: float = 3.0,
    ) -> None:
        self.dropped_frame_threshold = dropped_frame_threshold
        self.av_sync_tolerance_ms = av_sync_tolerance_ms
        self.joint_sigma_threshold = joint_sigma_threshold

    def run(self, episodes: list[EpisodeMeta]) -> dict[str, Any]:
        findings: list[QAFinding] = []
        for episode in episodes:
            findings.extend(self._episode_findings(episode))
        counts: dict[str, int] = {}
        for finding in findings:
            counts[finding.severity] = counts.get(finding.severity, 0) + 1
        return {"finding_count": len(findings), "counts": counts, "findings": [finding.to_dict() for finding in findings]}

    def render_markdown(self, report: dict[str, Any]) -> str:
        lines = [
            "# Robotics Studio Sensor QA Report",
            "",
            f"- Findings: `{report['finding_count']}`",
            f"- Counts: `{json.dumps(report['counts'], sort_keys=True)}`",
            "",
            "| Severity | Check | Episode | Sensor | Finding |",
            "| --- | --- | --- | --- | --- |",
        ]
        for item in report["findings"]:
            lines.append(f"| {item['severity']} | `{item['check']}` | `{item['episode_id']}` | `{item['sensor']}` | {item['message']} |")
        lines.append("")
        return "\n".join(lines)

    def _episode_findings(self, episode: EpisodeMeta) -> list[QAFinding]:
        metadata = episode.metadata.get("episode", episode.metadata)
        if isinstance(metadata, dict) and isinstance(metadata.get("first_record"), dict):
            metadata = {**metadata, **metadata["first_record"]}
        findings: list[QAFinding] = []
        findings.extend(self._timestamp_monotonicity(episode, metadata))
        findings.extend(self._sample_rate_stability(episode, metadata))
        findings.extend(self._dropped_frames(episode, metadata))
        findings.extend(self._joint_continuity(episode, metadata))
        findings.extend(self._av_sync(episode, metadata))
        findings.extend(self._calibration_drift(episode, metadata))
        return findings

    def _timestamp_monotonicity(self, episode: EpisodeMeta, metadata: dict[str, Any]) -> list[QAFinding]:
        timestamps = metadata.get("timestamps", [])
        if not isinstance(timestamps, list) or len(timestamps) < 2:
            return []
        bad = [idx for idx in range(1, len(timestamps)) if _number(timestamps[idx]) is not None and _number(timestamps[idx - 1]) is not None and timestamps[idx] <= timestamps[idx - 1]]
        if bad:
            return [QAFinding("timestamp_monotonicity", "error", episode.episode_id, "timeline", "timestamps are not strictly increasing", {"indices": bad[:10]})]
        return []

    def _sample_rate_stability(self, episode: EpisodeMeta, metadata: dict[str, Any]) -> list[QAFinding]:
        timestamps = [float(value) for value in metadata.get("timestamps", []) if isinstance(value, int | float)]
        if len(timestamps) < 4:
            return []
        deltas = [b - a for a, b in zip(timestamps, timestamps[1:]) if b > a]
        if len(deltas) < 3:
            return []
        avg = mean(deltas)
        jitter = pstdev(deltas) if len(deltas) > 1 else 0.0
        if avg and jitter / avg > 0.15:
            return [QAFinding("sample_rate_stability", "warn", episode.episode_id, "timeline", "sample-rate jitter exceeds 15%", {"mean_delta": avg, "jitter": jitter})]
        return []

    def _dropped_frames(self, episode: EpisodeMeta, metadata: dict[str, Any]) -> list[QAFinding]:
        expected = metadata.get("expected_frames") or episode.frame_count
        observed = metadata.get("observed_frames") or metadata.get("frames")
        if not isinstance(expected, int) or not isinstance(observed, int) or expected <= 0:
            return []
        ratio = max(0, expected - observed) / expected
        if ratio > self.dropped_frame_threshold:
            return [QAFinding("dropped_frames", "error", episode.episode_id, "video", "dropped-frame ratio exceeds threshold", {"expected": expected, "observed": observed, "ratio": ratio})]
        return []

    def _joint_continuity(self, episode: EpisodeMeta, metadata: dict[str, Any]) -> list[QAFinding]:
        series = metadata.get("joint_state", metadata.get("states", []))
        if not isinstance(series, list) or len(series) < 3:
            return []
        values = [_flatten_numeric(row) for row in series]
        if any(any(math.isnan(value) for value in row) for row in values):
            return [QAFinding("joint_state_continuity", "error", episode.episode_id, "joint_state", "joint state contains NaN", {})]
        diffs = [abs(b - a) for row_a, row_b in zip(values, values[1:]) for a, b in zip(row_a, row_b)]
        if len(diffs) < 3:
            return []
        threshold = mean(diffs) + self.joint_sigma_threshold * (pstdev(diffs) or 0.0)
        outliers = [value for value in diffs if value > threshold and value > 0]
        if outliers:
            return [QAFinding("joint_state_continuity", "warn", episode.episode_id, "joint_state", "joint-state jump exceeds sigma threshold", {"max_jump": max(outliers), "threshold": threshold})]
        return []

    def _av_sync(self, episode: EpisodeMeta, metadata: dict[str, Any]) -> list[QAFinding]:
        offset = metadata.get("audio_video_offset_ms", metadata.get("av_offset_ms"))
        if isinstance(offset, int | float) and abs(offset) > self.av_sync_tolerance_ms:
            return [QAFinding("audio_video_sync", "warn", episode.episode_id, "audio", "audio/video sync offset exceeds tolerance", {"offset_ms": offset})]
        return []

    def _calibration_drift(self, episode: EpisodeMeta, metadata: dict[str, Any]) -> list[QAFinding]:
        drift = metadata.get("calibration_drift")
        if isinstance(drift, dict):
            findings = []
            for sensor, value in drift.items():
                if isinstance(value, int | float) and value > 0.02:
                    findings.append(QAFinding("calibration_drift", "warn", episode.episode_id, str(sensor), "camera calibration drift exceeds tolerance", {"drift": value}))
            return findings
        return []


def write_sensor_qa_report(report: dict[str, Any], out: str | Path, fmt: str = "json") -> Path:
    path = Path(out)
    path.parent.mkdir(parents=True, exist_ok=True)
    if fmt == "markdown":
        path.write_text(SensorQARunner().render_markdown(report), encoding="utf8")
    else:
        path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf8")
    return path


def _number(value: Any) -> float | None:
    return float(value) if isinstance(value, int | float) else None


def _flatten_numeric(value: Any) -> list[float]:
    if isinstance(value, int | float):
        return [float(value)]
    if isinstance(value, list):
        return [float(item) if isinstance(item, int | float) else math.nan for item in value]
    return []

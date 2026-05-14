from __future__ import annotations

from .adapters import load_dataset


def sensor_qa_report(dataset_path: str) -> dict:
    dataset = load_dataset(dataset_path)
    findings = []
    for episode in dataset.episodes:
        for sensor in episode.sensors:
            if sensor.dropped_frames > 0:
                findings.append(_finding(episode.episode_id, sensor.name, "dropped_frames", sensor.dropped_frames))
            if abs(sensor.av_sync_ms) > 40:
                findings.append(_finding(episode.episode_id, sensor.name, "av_sync", sensor.av_sync_ms))
            if sensor.calibration_error > 0.02:
                findings.append(_finding(episode.episode_id, sensor.name, "calibration_drift", sensor.calibration_error))
            if sensor.kind in {"joint_state", "action"} and (
                sensor.sample_rate_hz is None or sensor.sample_rate_hz <= 0
            ):
                findings.append(_finding(episode.episode_id, sensor.name, "joint_state_continuity", sensor.sample_rate_hz))
    return {
        "dataset": str(dataset.path),
        "adapter": dataset.adapter,
        "episode_count": len(dataset.episodes),
        "status": "fail" if findings else "pass",
        "findings": findings,
    }


def _finding(episode_id: str, sensor: str, check: str, value: float | int | None) -> dict:
    return {"episode_id": episode_id, "sensor": sensor, "check": check, "value": value}

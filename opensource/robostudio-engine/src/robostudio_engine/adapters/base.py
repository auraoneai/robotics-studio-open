from __future__ import annotations

import json
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from robostudio_engine.contracts import Dataset, Episode, SensorStream


class Adapter(ABC):
    name: str

    @abstractmethod
    def detect(self, path: Path) -> bool:
        raise NotImplementedError

    @abstractmethod
    def load(self, path: Path) -> Dataset:
        raise NotImplementedError


def load_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def normalize_sensor(raw: dict[str, Any]) -> SensorStream:
    return SensorStream(
        name=str(raw.get("name", raw.get("id", "sensor"))),
        kind=str(raw.get("kind", raw.get("type", "unknown"))),
        sample_rate_hz=float(raw.get("sample_rate_hz", raw.get("hz", 30.0))),
        path=raw.get("path"),
        dropped_frames=int(raw.get("dropped_frames", 0)),
        calibration_error=float(raw.get("calibration_error", 0.0)),
        av_sync_ms=float(raw.get("av_sync_ms", 0.0)),
    )


def normalize_episode(path: Path, raw: dict[str, Any], default_task: str = "unspecified") -> Episode:
    sensors = [normalize_sensor(sensor) for sensor in raw.get("sensors", [])]
    return Episode(
        episode_id=str(raw.get("episode_id", raw.get("id", raw.get("episode", "episode-unknown")))),
        dataset_path=str(path),
        duration_s=float(raw.get("duration_s", raw.get("duration", 0.0))),
        task=str(raw.get("task", raw.get("task_name", default_task))),
        split=str(raw.get("split", "train")),
        language_instruction=str(raw.get("language_instruction", raw.get("instruction", ""))),
        success=raw.get("success"),
        embodiment=str(raw.get("embodiment", raw.get("robot", "unknown"))),
        sensors=sensors,
        markers=list(raw.get("markers", raw.get("segments", []))),
        interventions=list(raw.get("interventions", [])),
        failure_modes=list(raw.get("failure_modes", raw.get("failures", []))),
        anomaly_notes=list(raw.get("anomaly_notes", raw.get("notes", []))),
    )


def dataset_from_rows(path: Path, adapter: str, version: str, rows: list[dict[str, Any]], metadata: dict[str, Any]) -> Dataset:
    return Dataset(
        path=path,
        adapter=adapter,
        format_version=version,
        episodes=[normalize_episode(path, row, metadata.get("task", "unspecified")) for row in rows],
        metadata=metadata,
    )

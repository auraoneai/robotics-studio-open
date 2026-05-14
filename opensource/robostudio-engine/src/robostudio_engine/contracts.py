from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Callable, Iterable, Protocol


Json = dict[str, Any]
ProgressCallback = Callable[[dict[str, Any]], None]


@dataclass(frozen=True)
class SensorStream:
    name: str
    kind: str
    rate_hz: float | None = None
    sample_rate_hz: float | None = None
    shape: list[int] = field(default_factory=list)
    path: str | None = None
    dropped_frames: int = 0
    calibration_error: float = 0.0
    av_sync_ms: float = 0.0
    metadata: Json = field(default_factory=dict)

    def to_dict(self) -> Json:
        return asdict(self)


@dataclass(frozen=True)
class EpisodeMeta:
    episode_id: str
    dataset_format: str
    format_version: str
    root: Path
    relative_path: str | None = None
    duration_seconds: float | None = None
    frame_count: int | None = None
    success: bool | None = None
    intervention_count: int = 0
    embodiment: str | None = None
    task_tag: str | None = None
    created_at: str | None = None
    sensor_schema: list[SensorStream] = field(default_factory=list)
    video_paths: dict[str, str] = field(default_factory=dict)
    metadata: Json = field(default_factory=dict)
    source_mtime: float = 0.0

    def to_dict(self) -> Json:
        payload = asdict(self)
        payload["root"] = str(self.root)
        payload["sensor_schema"] = [stream.to_dict() for stream in self.sensor_schema]
        return payload


@dataclass(frozen=True)
class EpisodeHandle:
    meta: EpisodeMeta
    payload_path: Path | None = None
    metadata: Json = field(default_factory=dict)


@dataclass(frozen=True)
class Episode:
    episode_id: str
    dataset_path: str
    duration_s: float
    task: str
    split: str = "train"
    language_instruction: str = ""
    success: bool | None = None
    embodiment: str = "unknown"
    sensors: list[SensorStream] = field(default_factory=list)
    markers: list[Json] = field(default_factory=list)
    interventions: list[Json] = field(default_factory=list)
    failure_modes: list[str] = field(default_factory=list)
    anomaly_notes: list[str] = field(default_factory=list)

    def to_dict(self) -> Json:
        return asdict(self)


@dataclass(frozen=True)
class Dataset:
    path: Path
    adapter: str
    format_version: str
    episodes: list[Episode]
    metadata: Json = field(default_factory=dict)

    def to_manifest(self) -> Json:
        return {
            "path": str(self.path),
            "adapter": self.adapter,
            "format_version": self.format_version,
            "episode_count": len(self.episodes),
            "metadata": self.metadata,
            "episodes": [episode.to_dict() for episode in self.episodes],
        }


@dataclass(frozen=True)
class FrameBatch:
    timestamp: float
    frames: list[Any]
    metadata: Json = field(default_factory=dict)


class StreamHandle(Protocol):
    name: str
    kind: str

    def seek(self, timestamp: float) -> None: ...

    def read(self, n_frames: int = 1) -> FrameBatch: ...


class EpisodeAdapter(Protocol):
    name: str

    def can_open(self, root: Path) -> bool: ...

    def list_episodes(self, root: Path) -> Iterable[EpisodeMeta]: ...

    def open_episode(self, meta: EpisodeMeta) -> EpisodeHandle: ...

    def streams_of(self, handle: EpisodeHandle) -> dict[str, StreamHandle]: ...

    def close(self, handle: EpisodeHandle) -> None: ...


class MetadataStream:
    def __init__(self, stream: SensorStream, samples: list[Any] | None = None) -> None:
        self.name = stream.name
        self.kind = stream.kind
        self._samples = samples or []
        self._cursor = 0
        self._timestamp = 0.0

    def seek(self, timestamp: float) -> None:
        self._timestamp = max(0.0, float(timestamp))
        if self._samples:
            self._cursor = min(len(self._samples) - 1, int(self._timestamp * 30))

    def read(self, n_frames: int = 1) -> FrameBatch:
        if not self._samples:
            return FrameBatch(timestamp=self._timestamp, frames=[], metadata={"empty": True})
        end = min(len(self._samples), self._cursor + max(1, n_frames))
        frames = self._samples[self._cursor:end]
        self._cursor = end
        return FrameBatch(timestamp=self._timestamp, frames=frames)

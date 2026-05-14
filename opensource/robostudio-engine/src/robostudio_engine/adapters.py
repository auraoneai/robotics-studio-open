from __future__ import annotations

import json
import os
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from .contracts import EpisodeHandle, EpisodeMeta, MetadataStream, SensorStream, StreamHandle


class UnsafeDatasetPathError(ValueError):
    pass


def _safe_relative_path(value: Any, field: str) -> str | None:
    if value in (None, ""):
        return None
    candidate = Path(str(value))
    if candidate.is_absolute() or ".." in candidate.parts or "\\" in str(value):
        raise UnsafeDatasetPathError(f"unsafe {field}: {value}")
    return candidate.as_posix()


def _read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        for line in path.read_text(encoding="utf8").splitlines():
            if line.strip():
                value = json.loads(line)
                if isinstance(value, dict):
                    rows.append(value)
    except (OSError, json.JSONDecodeError):
        return []
    return rows


def _mtime(path: Path) -> float:
    try:
        return path.stat().st_mtime
    except OSError:
        return 0.0


def _duration_from_times(item: dict[str, Any]) -> float | None:
    for key in ("duration_seconds", "duration_s", "episode_length_seconds"):
        value = item.get(key)
        if isinstance(value, int | float) and value >= 0:
            return float(value)
    start = item.get("start_time", item.get("start_timestamp"))
    end = item.get("end_time", item.get("end_timestamp"))
    if isinstance(start, int | float) and isinstance(end, int | float) and end >= start:
        return float(end - start)
    return None


def _success(item: dict[str, Any]) -> bool | None:
    for key in ("success", "succeeded", "task_success"):
        if isinstance(item.get(key), bool):
            return item[key]
    readiness = item.get("training_readiness")
    if isinstance(readiness, str):
        return readiness.lower() in {"ready", "approved", "training_ready"}
    if isinstance(readiness, dict) and isinstance(readiness.get("state"), str):
        return readiness["state"].lower() in {"ready", "approved", "training_ready"}
    return None


def _feature_streams(info: dict[str, Any], fps: float | None = None) -> list[SensorStream]:
    streams: list[SensorStream] = []
    features = info.get("features", {})
    if isinstance(features, dict):
        for name, feature in features.items():
            if not isinstance(feature, dict):
                continue
            dtype = str(feature.get("dtype", feature.get("type", "custom")))
            kind = "rgb" if dtype == "video" or "image" in name else "joint_state" if "state" in name else "action" if name == "action" else dtype
            rate = fps if kind in {"rgb", "depth"} else feature.get("rate_hz")
            streams.append(SensorStream(name=name, kind=kind, rate_hz=rate if isinstance(rate, int | float) else None, shape=list(feature.get("shape", []))))
    sensors = info.get("sensors", [])
    if isinstance(sensors, list):
        for index, sensor in enumerate(sensors):
            if isinstance(sensor, dict):
                streams.append(
                    SensorStream(
                        name=str(sensor.get("name") or sensor.get("id") or f"sensor_{index}"),
                        kind=str(sensor.get("type") or "custom"),
                        rate_hz=float(sensor["rate_hz"]) if isinstance(sensor.get("rate_hz"), int | float) else None,
                        metadata=dict(sensor),
                    )
                )
    return streams


@dataclass(frozen=True)
class AdapterProfile:
    name: str
    version: str


class BaseAdapter:
    name = "base"
    version = "unknown"

    def can_open(self, root: Path) -> bool:
        return False

    def list_episodes(self, root: Path) -> Iterable[EpisodeMeta]:
        return []

    def open_episode(self, meta: EpisodeMeta) -> EpisodeHandle:
        payload_path = meta.root / meta.relative_path if meta.relative_path else None
        return EpisodeHandle(meta=meta, payload_path=payload_path, metadata=meta.metadata)

    def streams_of(self, handle: EpisodeHandle) -> dict[str, StreamHandle]:
        return {stream.name: MetadataStream(stream) for stream in handle.meta.sensor_schema}

    def close(self, handle: EpisodeHandle) -> None:
        return None


class LeRobotAdapter(BaseAdapter):
    name = "lerobot"

    def can_open(self, root: Path) -> bool:
        return (root / "meta" / "info.json").exists() and (
            (root / "meta" / "episodes.json").exists() or (root / "meta" / "episodes.jsonl").exists()
        )

    def list_episodes(self, root: Path) -> Iterable[EpisodeMeta]:
        info = _read_json(root / "meta" / "info.json")
        version = str(info.get("codebase_version") or info.get("lerobot_version") or "v2-best-effort")
        episodes_path = root / "meta" / "episodes.json"
        if episodes_path.exists():
            payload = _read_json(episodes_path)
            rows = payload.get("episodes", payload if isinstance(payload, list) else [])
        else:
            episodes_path = root / "meta" / "episodes.jsonl"
            rows = _read_jsonl(episodes_path)
        fps = float(info["fps"]) if isinstance(info.get("fps"), int | float) else None
        streams = _feature_streams(info if isinstance(info, dict) else {}, fps)
        for item in rows if isinstance(rows, list) else []:
            if not isinstance(item, dict):
                continue
            videos = {
                str(k): path
                for k, v in dict(item.get("video_paths", {})).items()
                if (path := _safe_relative_path(v, f"video_paths.{k}")) is not None
            }
            yield EpisodeMeta(
                episode_id=str(item.get("episode_id", item.get("id", ""))),
                dataset_format="lerobot",
                format_version="v3" if str(version).startswith("v3") else "v2",
                root=root,
                relative_path=_safe_relative_path(item.get("data_path"), "data_path"),
                duration_seconds=_duration_from_times(item),
                frame_count=item.get("frames") if isinstance(item.get("frames"), int) else None,
                success=_success(item),
                intervention_count=len(item.get("interventions", [])) if isinstance(item.get("interventions"), list) else 0,
                embodiment=str(info.get("robot_type") or item.get("embodiment") or "") or None,
                task_tag=str(item.get("task") or item.get("task_tag") or "") or None,
                sensor_schema=streams,
                video_paths=videos,
                metadata={"info": info, "episode": item},
                source_mtime=max(_mtime(episodes_path), *[_mtime(root / path) for path in videos.values()] or [0.0]),
            )


class RldsAdapter(BaseAdapter):
    name = "rlds"

    def can_open(self, root: Path) -> bool:
        return any((root / name).exists() for name in ("episodes.jsonl", "rlds/episodes.jsonl", "dataset_info.json"))

    def list_episodes(self, root: Path) -> Iterable[EpisodeMeta]:
        info = _read_json(root / "dataset_info.json")
        path = root / "episodes.jsonl"
        if not path.exists():
            path = root / "rlds" / "episodes.jsonl"
        rows = _read_jsonl(path)
        for index, item in enumerate(rows):
            steps = item.get("steps", [])
            metadata = item.get("metadata", {})
            yield EpisodeMeta(
                episode_id=str(item.get("episode_id", item.get("id", f"rlds-{index}"))),
                dataset_format="rlds",
                format_version="tfds-trajectory",
                root=root,
                duration_seconds=_duration_from_times(item),
                frame_count=len(steps) if isinstance(steps, list) else item.get("frame_count"),
                success=_success(item),
                intervention_count=len(item.get("interventions", [])) if isinstance(item.get("interventions"), list) else 0,
                embodiment=str(metadata.get("robot") or item.get("embodiment") or "") or None if isinstance(metadata, dict) else None,
                task_tag=str(item.get("language_instruction") or item.get("task") or "") or None,
                sensor_schema=_feature_streams(info if isinstance(info, dict) else {}),
                metadata={"dataset_info": info, "episode": item},
                source_mtime=_mtime(path),
            )


class OpenXAdapter(RldsAdapter):
    name = "openx"

    def can_open(self, root: Path) -> bool:
        markers = ("openx_manifest.json", "openx/episodes.jsonl")
        info = _read_json(root / "dataset_info.json")
        return any((root / marker).exists() for marker in markers) or str(info.get("builder_name", "")).lower().startswith("openx")

    def list_episodes(self, root: Path) -> Iterable[EpisodeMeta]:
        path = root / "openx" / "episodes.jsonl"
        rows = _read_jsonl(path) if path.exists() else list(_read_jsonl(root / "episodes.jsonl"))
        manifest = _read_json(root / "openx_manifest.json")
        for index, item in enumerate(rows):
            meta = item.get("metadata", {})
            yield EpisodeMeta(
                episode_id=str(item.get("episode_id", item.get("id", f"openx-{index}"))),
                dataset_format="openx",
                format_version=str(manifest.get("version") or "openx-rlds"),
                root=root,
                duration_seconds=_duration_from_times(item),
                frame_count=len(item.get("steps", [])) if isinstance(item.get("steps"), list) else item.get("frame_count"),
                success=_success(item),
                intervention_count=len(item.get("interventions", [])) if isinstance(item.get("interventions"), list) else 0,
                embodiment=str(meta.get("embodiment") or meta.get("robot") or "") if isinstance(meta, dict) else None,
                task_tag=str(item.get("task") or item.get("language_instruction") or "") or None,
                sensor_schema=_feature_streams(manifest if isinstance(manifest, dict) else {}),
                metadata={"manifest": manifest, "episode": item},
                source_mtime=max(_mtime(path), _mtime(root / "openx_manifest.json")),
            )


class Hdf5Adapter(BaseAdapter):
    name = "hdf5"
    profiles = {
        "aloha": ("observations/images", "action"),
        "act": ("observations/qpos", "action"),
        "robomimic": ("data", "actions"),
        "generic": ("observations", "actions"),
    }

    def can_open(self, root: Path) -> bool:
        return any(root.glob("*.hdf5")) or any(root.glob("*.h5")) or (root / "hdf5_manifest.json").exists()

    def list_episodes(self, root: Path) -> Iterable[EpisodeMeta]:
        manifest = _read_json(root / "hdf5_manifest.json")
        files = sorted(list(root.glob("*.hdf5")) + list(root.glob("*.h5")))
        if isinstance(manifest.get("episodes"), list):
            for item in manifest["episodes"]:
                if isinstance(item, dict):
                    yield self._from_manifest_item(root, item, manifest)
            return
        for file in files:
            sidecar = _read_json(file.with_suffix(file.suffix + ".json"))
            profile = str(sidecar.get("profile") or self._infer_profile(file, sidecar))
            yield EpisodeMeta(
                episode_id=str(sidecar.get("episode_id") or file.stem),
                dataset_format="hdf5",
                format_version=profile,
                root=root,
                relative_path=file.name,
                duration_seconds=_duration_from_times(sidecar),
                frame_count=sidecar.get("frame_count") if isinstance(sidecar.get("frame_count"), int) else None,
                success=_success(sidecar),
                intervention_count=len(sidecar.get("interventions", [])) if isinstance(sidecar.get("interventions"), list) else 0,
                embodiment=str(sidecar.get("embodiment") or "") or None,
                task_tag=str(sidecar.get("task") or "") or None,
                sensor_schema=_feature_streams(sidecar),
                metadata={"profile": profile, "sidecar": sidecar},
                source_mtime=max(_mtime(file), _mtime(file.with_suffix(file.suffix + ".json"))),
            )

    def _from_manifest_item(self, root: Path, item: dict[str, Any], manifest: dict[str, Any]) -> EpisodeMeta:
        path = _safe_relative_path(item.get("path"), "path") or ""
        return EpisodeMeta(
            episode_id=str(item.get("episode_id") or item.get("id") or Path(path).stem),
            dataset_format="hdf5",
            format_version=str(item.get("profile") or manifest.get("profile") or "generic"),
            root=root,
            relative_path=path,
            duration_seconds=_duration_from_times(item),
            frame_count=item.get("frame_count") if isinstance(item.get("frame_count"), int) else None,
            success=_success(item),
            intervention_count=len(item.get("interventions", [])) if isinstance(item.get("interventions"), list) else 0,
            embodiment=str(item.get("embodiment") or manifest.get("embodiment") or "") or None,
            task_tag=str(item.get("task") or "") or None,
            sensor_schema=_feature_streams(item),
            metadata={"manifest": manifest, "episode": item},
            source_mtime=_mtime(root / path),
        )

    def _infer_profile(self, file: Path, sidecar: dict[str, Any]) -> str:
        if isinstance(sidecar.get("profile"), str):
            return sidecar["profile"]
        try:
            import h5py  # type: ignore

            with h5py.File(file, "r") as handle:
                keys = set(handle.keys())
                if "data" in keys:
                    return "robomimic"
                if "observations" in keys and "action" in keys:
                    return "aloha"
        except Exception:
            pass
        return "generic"


class RosbagAdapter(BaseAdapter):
    name = "rosbag"

    def can_open(self, root: Path) -> bool:
        return any(root.glob("*.db3")) or any(root.glob("*.bag")) or (root / "metadata.yaml").exists()

    def list_episodes(self, root: Path) -> Iterable[EpisodeMeta]:
        db3_files = sorted(root.glob("*.db3"))
        bag_files = sorted(root.glob("*.bag"))
        for file in db3_files:
            topics, count = self._read_rosbag2(file)
            yield EpisodeMeta(
                episode_id=file.stem,
                dataset_format="rosbag",
                format_version="rosbag2-sqlite",
                root=root,
                relative_path=file.name,
                frame_count=count,
                sensor_schema=[SensorStream(name=topic, kind="ros_topic") for topic in topics],
                metadata={"topics": topics},
                source_mtime=_mtime(file),
            )
        for file in bag_files:
            sidecar = _read_json(file.with_suffix(".json"))
            raw_topics = sidecar.get("topics", [])
            topics = raw_topics if isinstance(raw_topics, list) else []
            yield EpisodeMeta(
                episode_id=file.stem,
                dataset_format="rosbag",
                format_version="rosbag1-legacy",
                root=root,
                relative_path=file.name,
                frame_count=sidecar.get("message_count") if isinstance(sidecar.get("message_count"), int) else None,
                sensor_schema=[SensorStream(name=str(topic), kind="ros_topic") for topic in topics if isinstance(topic, str)],
                metadata={"legacy": True, "sidecar": sidecar},
                source_mtime=max(_mtime(file), _mtime(file.with_suffix(".json"))),
            )

    def _read_rosbag2(self, file: Path) -> tuple[list[str], int | None]:
        try:
            conn = sqlite3.connect(file)
            try:
                topics = [row[0] for row in conn.execute("SELECT name FROM topics ORDER BY id").fetchall()]
                count = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
                return [str(topic) for topic in topics], int(count)
            finally:
                conn.close()
        except sqlite3.DatabaseError:
            return [], None


class Mp4JsonlFolderAdapter(BaseAdapter):
    name = "folder-of-mp4-jsonl"

    def can_open(self, root: Path) -> bool:
        return bool(list(root.glob("*.mp4")) and list(root.glob("*.jsonl")))

    def list_episodes(self, root: Path) -> Iterable[EpisodeMeta]:
        if (root / "episodes.jsonl").exists():
            yield from self._from_episode_manifest(root)
            return

        videos = {path.stem: path for path in root.glob("*.mp4")}
        jsonls = {path.stem: path for path in root.glob("*.jsonl")}
        for stem in sorted(set(videos) | set(jsonls)):
            rows = _read_jsonl(jsonls[stem]) if stem in jsonls else []
            first = rows[0] if rows else {}
            yield EpisodeMeta(
                episode_id=str(first.get("episode_id") or stem),
                dataset_format="folder-of-mp4-jsonl",
                format_version="auraone-capture-fallback",
                root=root,
                relative_path=jsonls[stem].name if stem in jsonls else videos[stem].name,
                duration_seconds=_duration_from_times(first),
                frame_count=len(rows) or None,
                success=_success(first),
                intervention_count=sum(1 for row in rows if row.get("intervention")),
                embodiment=str(first.get("embodiment") or "") or None,
                task_tag=str(first.get("task") or first.get("instruction") or "") or None,
                sensor_schema=[
                    SensorStream(name="rgb", kind="rgb", path=videos[stem].name if stem in videos else None),
                    SensorStream(name="events", kind="jsonl", path=jsonls[stem].name if stem in jsonls else None),
                ],
                video_paths={"rgb": videos[stem].name} if stem in videos else {},
                metadata={**first, "first_record": first, "records": len(rows)},
                source_mtime=max(_mtime(videos.get(stem, root)), _mtime(jsonls.get(stem, root))),
            )

    def _from_episode_manifest(self, root: Path) -> Iterable[EpisodeMeta]:
        episodes_path = root / "episodes.jsonl"
        rows = _read_jsonl(episodes_path)
        videos = sorted(root.glob("*.mp4"))
        jsonls = sorted(path for path in root.glob("*.jsonl") if path.name != "episodes.jsonl")
        jsonl_counts = {path.name: len(_read_jsonl(path)) for path in jsonls}
        streams = [
            SensorStream(
                name=video.stem,
                kind="rgb" if any(marker in video.stem.lower() for marker in ("cam", "camera", "front", "rgb")) else "video",
                path=video.name,
            )
            for video in videos
        ]
        streams.extend(
            SensorStream(name=path.stem, kind="jsonl", path=path.name, metadata={"records": jsonl_counts[path.name]})
            for path in jsonls
        )
        video_paths = {video.stem: video.name for video in videos}
        for index, item in enumerate(rows):
            if not isinstance(item, dict):
                continue
            intervention_count = item.get("intervention_count")
            yield EpisodeMeta(
                episode_id=str(item.get("episode_id") or item.get("id") or f"episode-{index}"),
                dataset_format="folder-of-mp4-jsonl",
                format_version="auraone-capture-fallback",
                root=root,
                relative_path=episodes_path.name,
                duration_seconds=_duration_from_times(item),
                frame_count=item.get("frame_count") if isinstance(item.get("frame_count"), int) else None,
                success=_success(item),
                intervention_count=int(intervention_count) if isinstance(intervention_count, int | float) else 0,
                embodiment=str(item.get("embodiment") or "") or None,
                task_tag=str(item.get("task") or item.get("instruction") or "") or None,
                sensor_schema=streams,
                video_paths=video_paths,
                metadata={**item, "episode": item, "jsonl_records": jsonl_counts},
                source_mtime=max(_mtime(episodes_path), *[_mtime(path) for path in [*videos, *jsonls]] or [0.0]),
            )


ADAPTERS: list[BaseAdapter] = [
    LeRobotAdapter(),
    OpenXAdapter(),
    Mp4JsonlFolderAdapter(),
    RldsAdapter(),
    Hdf5Adapter(),
    RosbagAdapter(),
]


def get_adapter(name: str) -> BaseAdapter:
    for adapter in ADAPTERS:
        if adapter.name == name:
            return adapter
    raise ValueError(f"unknown adapter: {name}")


def detect_adapter(root: str | os.PathLike[str]) -> BaseAdapter:
    path = Path(root)
    for adapter in ADAPTERS:
        if adapter.can_open(path):
            return adapter
    raise ValueError(f"no Robotics Studio adapter could open {path}")


def list_episodes(root: str | os.PathLike[str], adapter_name: str | None = None) -> list[EpisodeMeta]:
    path = Path(root)
    adapter = get_adapter(adapter_name) if adapter_name else detect_adapter(path)
    return list(adapter.list_episodes(path))

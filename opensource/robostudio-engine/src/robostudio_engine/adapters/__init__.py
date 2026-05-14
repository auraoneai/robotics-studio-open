from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

from robostudio_engine.contracts import Dataset, Episode, EpisodeMeta, SensorStream

from .base import Adapter, load_json
from .folder_mp4_jsonl import FolderMp4JsonlAdapter
from .hdf5 import Hdf5Adapter
from .lerobot import LeRobotAdapter
from .openx import OpenXAdapter
from .rlds import RldsAdapter
from .rosbag import RosbagAdapter

_legacy_path = Path(__file__).resolve().parents[1] / "adapters.py"
_legacy_spec = importlib.util.spec_from_file_location("robostudio_engine._adapter_file", _legacy_path)
_legacy = importlib.util.module_from_spec(_legacy_spec)
assert _legacy_spec and _legacy_spec.loader
sys.modules[_legacy_spec.name] = _legacy
_legacy_spec.loader.exec_module(_legacy)

BaseAdapter = _legacy.BaseAdapter
LegacyLeRobotAdapter = _legacy.LeRobotAdapter
LegacyRldsAdapter = _legacy.RldsAdapter
LegacyOpenXAdapter = _legacy.OpenXAdapter
LegacyHdf5Adapter = _legacy.Hdf5Adapter
LegacyRosbagAdapter = _legacy.RosbagAdapter
Mp4JsonlFolderAdapter = _legacy.Mp4JsonlFolderAdapter
UnsafeDatasetPathError = _legacy.UnsafeDatasetPathError

SIMPLE_ADAPTERS: tuple[Adapter, ...] = (
    LeRobotAdapter(),
    RldsAdapter(),
    OpenXAdapter(),
    Hdf5Adapter(),
    RosbagAdapter(),
    FolderMp4JsonlAdapter(),
)
ADAPTERS = [*getattr(_legacy, "ADAPTERS"), *SIMPLE_ADAPTERS]


def detect_adapter(path: str | Path):
    dataset_path = Path(path)
    try:
        return _legacy.detect_adapter(dataset_path)
    except ValueError:
        for adapter in SIMPLE_ADAPTERS:
            if adapter.detect(dataset_path):
                return adapter
    raise ValueError(f"No Robotics Studio adapter recognized {dataset_path}")


def get_adapter(name: str):
    try:
        return _legacy.get_adapter(name)
    except ValueError:
        for adapter in SIMPLE_ADAPTERS:
            if adapter.name == name:
                return adapter
    raise ValueError(f"unknown adapter: {name}")


def list_episodes(root: str | Path, adapter_name: str | None = None) -> list[EpisodeMeta]:
    path = Path(root)
    adapter = get_adapter(adapter_name) if adapter_name else detect_adapter(path)
    if hasattr(adapter, "list_episodes"):
        return list(adapter.list_episodes(path))
    dataset = adapter.load(path)
    return [_episode_to_meta(dataset.path, dataset.adapter, dataset.format_version, episode) for episode in dataset.episodes]


def load_dataset(path: str | Path) -> Dataset:
    dataset_path = Path(path)
    for adapter in SIMPLE_ADAPTERS:
        if adapter.detect(dataset_path):
            return adapter.load(dataset_path)
    episodes = list_episodes(dataset_path)
    adapter = detect_adapter(dataset_path)
    return Dataset(
        path=dataset_path,
        adapter=adapter.name,
        format_version=episodes[0].format_version if episodes else "unknown",
        episodes=[_meta_to_episode(meta) for meta in episodes],
        metadata={"source": "EpisodeMeta adapter"},
    )


def _meta_to_episode(meta: EpisodeMeta) -> Episode:
    return Episode(
        episode_id=meta.episode_id,
        dataset_path=str(meta.root),
        duration_s=float(meta.duration_seconds or 0),
        task=meta.task_tag or "unspecified",
        success=meta.success,
        embodiment=meta.embodiment or "unknown",
        sensors=meta.sensor_schema,
        interventions=list(meta.metadata.get("episode", {}).get("interventions", [])) if isinstance(meta.metadata.get("episode"), dict) else [],
        failure_modes=_failure_modes(meta),
    )


def _episode_to_meta(path: Path, adapter: str, version: str, episode: Episode) -> EpisodeMeta:
    return EpisodeMeta(
        episode_id=episode.episode_id,
        dataset_format=adapter,
        format_version=version,
        root=path,
        duration_seconds=episode.duration_s,
        success=episode.success,
        intervention_count=len(episode.interventions),
        embodiment=episode.embodiment,
        task_tag=episode.task,
        sensor_schema=episode.sensors,
        metadata={"episode": episode.to_dict()},
    )


def _failure_modes(meta: EpisodeMeta) -> list[str]:
    episode = meta.metadata.get("episode", {})
    if isinstance(episode, dict):
        raw = episode.get("failure_modes", episode.get("tags", []))
        if isinstance(raw, list):
            return [str(item.get("id", item.get("tag", "")) if isinstance(item, dict) else item) for item in raw if item]
    return []


__all__ = [
    "ADAPTERS",
    "Adapter",
    "BaseAdapter",
    "FolderMp4JsonlAdapter",
    "Hdf5Adapter",
    "LeRobotAdapter",
    "Mp4JsonlFolderAdapter",
    "OpenXAdapter",
    "RldsAdapter",
    "RosbagAdapter",
    "UnsafeDatasetPathError",
    "detect_adapter",
    "get_adapter",
    "list_episodes",
    "load_dataset",
    "load_json",
]

from __future__ import annotations

from pathlib import Path

from robostudio_engine.contracts import Dataset

from .base import Adapter, dataset_from_rows, load_json, load_jsonl


class LeRobotAdapter(Adapter):
    name = "lerobot"

    def detect(self, path: Path) -> bool:
        meta = load_json(path / "meta.json", {})
        return bool(meta.get("lerobot_version") or (path / "episodes.jsonl").exists() or (path / "data").exists())

    def load(self, path: Path) -> Dataset:
        meta = load_json(path / "meta.json", {})
        version = str(meta.get("lerobot_version", meta.get("version", "v2-best-effort")))
        rows = load_jsonl(path / "episodes.jsonl")
        if not rows:
            episodes = load_json(path / "episodes.json", [])
            rows = episodes if isinstance(episodes, list) else episodes.get("episodes", [])
        return dataset_from_rows(path, self.name, version, rows, meta)

from __future__ import annotations

from pathlib import Path

from robostudio_engine.contracts import Dataset

from .base import Adapter, dataset_from_rows, load_json, load_jsonl


class RldsAdapter(Adapter):
    name = "rlds"

    def detect(self, path: Path) -> bool:
        meta = load_json(path / "dataset_info.json", {})
        return bool(meta.get("module_name") == "rlds" or (path / "rlds_episodes.jsonl").exists())

    def load(self, path: Path) -> Dataset:
        meta = load_json(path / "dataset_info.json", {})
        rows = load_jsonl(path / "rlds_episodes.jsonl")
        return dataset_from_rows(path, self.name, str(meta.get("version", "rlds-jsonl")), rows, meta)

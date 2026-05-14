from __future__ import annotations

from pathlib import Path

from robostudio_engine.contracts import Dataset

from .base import Adapter, dataset_from_rows, load_json, load_jsonl


class FolderMp4JsonlAdapter(Adapter):
    name = "folder-mp4-jsonl"

    def detect(self, path: Path) -> bool:
        return bool(list(path.glob("*.mp4")) and ((path / "metadata.jsonl").exists() or (path / "episodes.jsonl").exists()))

    def load(self, path: Path) -> Dataset:
        metadata = load_json(path / "capture_manifest.json", {})
        rows = load_jsonl(path / "episodes.jsonl") or load_jsonl(path / "metadata.jsonl")
        return dataset_from_rows(path, self.name, "auraone-capture-jsonl", rows, metadata)

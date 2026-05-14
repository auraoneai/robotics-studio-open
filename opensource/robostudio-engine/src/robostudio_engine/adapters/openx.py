from __future__ import annotations

from pathlib import Path

from robostudio_engine.contracts import Dataset

from .base import Adapter, dataset_from_rows, load_json


class OpenXAdapter(Adapter):
    name = "openx"

    def detect(self, path: Path) -> bool:
        manifest = load_json(path / "openx_manifest.json", {})
        return bool(manifest.get("format") == "openx" or manifest.get("openx_schema"))

    def load(self, path: Path) -> Dataset:
        manifest = load_json(path / "openx_manifest.json", {})
        rows = list(manifest.get("episodes", []))
        return dataset_from_rows(path, self.name, str(manifest.get("version", "openx-v1")), rows, manifest)

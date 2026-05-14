from __future__ import annotations

from pathlib import Path

from robostudio_engine.contracts import Dataset

from .base import Adapter, dataset_from_rows, load_json

PROFILES = {"aloha", "act", "robomimic", "generic"}


class Hdf5Adapter(Adapter):
    name = "hdf5"

    def detect(self, path: Path) -> bool:
        return bool(list(path.glob("*.hdf5")) or list(path.glob("*.h5")) or (path / "hdf5_manifest.json").exists())

    def load(self, path: Path) -> Dataset:
        manifest = load_json(path / "hdf5_manifest.json", {})
        profile = str(manifest.get("profile", "generic")).lower()
        if profile not in PROFILES:
            profile = "generic"
        rows = list(manifest.get("episodes", []))
        if not rows:
            rows = [
                {
                    "episode_id": file.stem,
                    "duration_s": 0,
                    "task": manifest.get("task", "hdf5-import"),
                    "sensors": manifest.get("sensors", []),
                }
                for file in sorted([*path.glob("*.hdf5"), *path.glob("*.h5")])
            ]
        metadata = {**manifest, "profile": profile}
        return dataset_from_rows(path, self.name, profile, rows, metadata)

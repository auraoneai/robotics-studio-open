from __future__ import annotations

from pathlib import Path

from robostudio_engine.contracts import Dataset

from .base import Adapter, dataset_from_rows, load_json


class RosbagAdapter(Adapter):
    name = "rosbag"

    def detect(self, path: Path) -> bool:
        return bool((path / "metadata.yaml").exists() or list(path.glob("*.db3")) or list(path.glob("*.bag")))

    def load(self, path: Path) -> Dataset:
        manifest = load_json(path / "rosbag_manifest.json", {})
        bag_files = sorted([*path.glob("*.db3"), *path.glob("*.bag")])
        rows = list(manifest.get("episodes", []))
        if not rows:
            rows = [
                {
                    "episode_id": bag.stem,
                    "duration_s": manifest.get("duration_s", 0),
                    "task": manifest.get("task", "rosbag-review"),
                    "sensors": manifest.get("sensors", []),
                }
                for bag in bag_files
            ]
        version = "rosbag2-sqlite" if list(path.glob("*.db3")) else "rosbag1-legacy"
        return dataset_from_rows(path, self.name, version, rows, manifest)

from __future__ import annotations

from .adapters import load_dataset


def generate_embodiment_card(dataset_path: str) -> dict:
    dataset = load_dataset(dataset_path)
    embodiments = sorted({episode.embodiment for episode in dataset.episodes})
    sensor_kinds = sorted({sensor.kind for episode in dataset.episodes for sensor in episode.sensors})
    return {
        "schema": "auraone.robotics.embodiment-card.v1",
        "dataset": str(dataset.path),
        "adapter": dataset.adapter,
        "embodiments": embodiments,
        "sensor_kinds": sensor_kinds,
        "control_rate_hz": dataset.metadata.get("control_rate_hz", 30),
        "teleop_method": dataset.metadata.get("teleop_method", "unknown"),
        "coordinate_frames": dataset.metadata.get("coordinate_frames", []),
        "joint_limits": dataset.metadata.get("joint_limits", {}),
        "license": dataset.metadata.get("license", "unknown"),
    }

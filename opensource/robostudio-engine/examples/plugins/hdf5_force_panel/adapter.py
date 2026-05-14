"""Example Robotics Studio Open adapter plugin entrypoint."""

from pathlib import Path


def can_open(root: str) -> bool:
    return (Path(root) / "force_profile.h5").exists()

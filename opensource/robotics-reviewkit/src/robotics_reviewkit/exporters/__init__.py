"""Metadata exporters for Robotics ReviewKit."""

from __future__ import annotations

from typing import Any

from robotics_reviewkit.exporters.lerobot import build_lerobot_metadata_export
from robotics_reviewkit.exporters.lerobot_v2 import export_episode_v2
from robotics_reviewkit.exporters.openx import build_openx_metadata_export
from robotics_reviewkit.exporters.rlds import build_rlds_metadata_export
from robotics_reviewkit.exporters.rlds_streaming import stream_episode, stream_episode_records, write_jsonl_stream


def export_lerobot_metadata(episode: dict[str, Any]) -> dict[str, Any]:
    """Backward-compatible helper for the existing mock ReviewKit test shape."""

    export = build_lerobot_metadata_export(episode)
    return {
        "format": "lerobot-metadata-bridge-v0.1",
        "disclosure": "Metadata bridge from mock Teleop Review Schema; not full LeRobot tensor/video dataset.",
        "episode_index": export["episodes"][0]["episode_id"],
        "task": episode.get("task", {}),
        "frames": [],
        "annotations": export["episodes"][0]["annotations"],
        "metadata_only_export": export,
    }


def export_rlds_openx_metadata(episode: dict[str, Any]) -> dict[str, Any]:
    """Backward-compatible helper for the existing mock ReviewKit test shape."""

    rlds = build_rlds_metadata_export(episode)
    openx = build_openx_metadata_export(episode)
    return {
        "format": "rlds-openx-metadata-bridge-v0.1",
        "disclosure": "Metadata bridge only; full RLDS/OpenX generation requires real observations, actions, tensors, and media.",
        "episode_metadata": rlds["episodes"][0]["episode_metadata"],
        "steps": rlds["episodes"][0]["steps"],
        "review_annotations": openx["episodes"][0]["review_metadata"],
        "metadata_only_exports": {
            "rlds": rlds,
            "openx": openx,
        },
    }


__all__ = [
    "build_lerobot_metadata_export",
    "build_openx_metadata_export",
    "build_rlds_metadata_export",
    "export_episode_v2",
    "export_lerobot_metadata",
    "export_rlds_openx_metadata",
    "stream_episode",
    "stream_episode_records",
    "write_jsonl_stream",
]

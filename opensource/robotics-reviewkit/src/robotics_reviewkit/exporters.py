from __future__ import annotations

from typing import Any, Dict


def export_lerobot_metadata(episode: Dict[str, Any]) -> Dict[str, Any]:
    return {"format":"lerobot-metadata-bridge-v0.1","disclosure":"Metadata bridge from mock Teleop Review Schema; not full LeRobot tensor/video dataset.","episode_index":episode.get("episode_id"),"task":episode.get("task",{}),"frames":[],"annotations":{"segments":episode.get("segments",[]),"interventions":episode.get("interventions",[]),"failure_modes":episode.get("failure_modes",[]),"sensor_qa":episode.get("sensor_qa",[])}}


def export_rlds_openx_metadata(episode: Dict[str, Any]) -> Dict[str, Any]:
    return {"format":"rlds-openx-metadata-bridge-v0.1","disclosure":"Metadata bridge only; full RLDS/OpenX generation requires real observations, actions, tensors, and media.","episode_metadata":{"episode_id":episode.get("episode_id"),"task":episode.get("task",{}),"duration_s":episode.get("duration_s")},"steps":[],"review_annotations":{"segments":episode.get("segments",[]),"interventions":episode.get("interventions",[]),"failure_modes":episode.get("failure_modes",[]),"sensor_qa":episode.get("sensor_qa",[])}}

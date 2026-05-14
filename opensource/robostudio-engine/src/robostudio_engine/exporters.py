from __future__ import annotations

import json
import zipfile
from datetime import datetime, timezone
from hashlib import sha256
from platform import system
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from .adapters import load_dataset
from .clustering import cluster_failures
from .embodiment import generate_embodiment_card
from .qa import sensor_qa_report


EXPORT_FORMATS = {"lerobot", "rlds", "openx", "hdf5", "manifest"}
INTAKE_SCHEMA_ID = "https://schemas.auraone.ai/open-studio/intake-packet/v1.json"
INTAKE_ENDPOINT = "https://intake.auraone.ai/v1/packets/"


def export_local(dataset_path: str, output_dir: str, export_format: str = "manifest") -> dict:
    if export_format not in EXPORT_FORMATS:
        raise ValueError(f"Unsupported export format {export_format}")
    dataset = load_dataset(dataset_path)
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schema": "auraone.robotics.reviewed-export.v1",
        "format": export_format,
        "source_adapter": dataset.adapter,
        "episode_count": len(dataset.episodes),
        "episodes": [episode.to_dict() for episode in dataset.episodes],
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
    return manifest


def export_hf_manifest(dataset_path: str, repo_id: str, output_file: str) -> dict:
    dataset = load_dataset(dataset_path)
    manifest = {
        "schema": "auraone.robotics.hf-export.v1",
        "repo_id": repo_id,
        "requires_auth": True,
        "dry_run": True,
        "episode_count": len(dataset.episodes),
        "files": ["manifest.json", "dataset_card.md", "sensor_qa.json", "clusters.json"],
    }
    Path(output_file).write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
    return manifest


def create_intake_packet(dataset_path: str, output_file: str) -> dict:
    payloads = {
        "payload/reviewed_subset_manifest.json": export_local(
            dataset_path,
            str(Path(output_file).with_suffix("")),
            "manifest",
        ),
        "payload/sensor_qa_report.json": sensor_qa_report(dataset_path),
        "payload/failure_clusters.json": cluster_failures(dataset_path),
        "payload/embodiment_card.json": generate_embodiment_card(dataset_path),
    }
    created_at = datetime.now(timezone.utc).isoformat()
    role_by_path = {
        "payload/reviewed_subset_manifest.json": "robotics_reviewed_subset_manifest",
        "payload/sensor_qa_report.json": "robotics_sensor_qa_report",
        "payload/failure_clusters.json": "robotics_failure_cluster",
        "payload/embodiment_card.json": "robotics_embodiment_card",
    }
    manifest = _intake_manifest(dataset_path, payloads, role_by_path, created_at)
    with zipfile.ZipFile(output_file, "w", compression=zipfile.ZIP_DEFLATED) as packet:
        packet.writestr("manifest.json", json.dumps(manifest, indent=2, sort_keys=True))
        for name, payload in payloads.items():
            packet.writestr(name, json.dumps(payload, indent=2, sort_keys=True))
    return manifest


def _intake_manifest(
    dataset_path: str,
    payloads: dict[str, object],
    role_by_path: dict[str, str],
    created_at: str,
) -> dict:
    return {
        "$schema": INTAKE_SCHEMA_ID,
        "manifest_version": "1.0.0",
        "product": "robotics-studio-open",
        "product_version": "0.1.0",
        "platform_version": "0.3.0",
        "created_at": created_at,
        "project_id": str(uuid5(NAMESPACE_URL, str(Path(dataset_path).resolve()))),
        "creator": {"display_name": "Robotics Studio Open local user"},
        "intent": "AuraOne Robotics Programs managed review intake",
        "redaction": {
            "file_paths": True,
            "hostnames": True,
            "api_keys": True,
            "user_pii_other_than_explicit_intake": True,
            "custom_rules_applied": [
                "dataset_root_replaced",
                "absolute_paths_removed",
                "raw_robot_media_excluded",
            ],
        },
        "consent": {
            "user_acknowledged_preview": True,
            "user_acknowledged_transport": True,
            "timestamp": created_at,
        },
        "payload_manifest": [
            {
                "path": path,
                "role": role_by_path[path],
                "sha256": sha256(
                    json.dumps(payload, indent=2, sort_keys=True).encode("utf8")
                ).hexdigest(),
                "size_bytes": len(
                    json.dumps(payload, indent=2, sort_keys=True).encode("utf8")
                ),
            }
            for path, payload in sorted(payloads.items())
        ],
        "provenance": {
            "engine_libs": {"robostudio-engine": "0.1.0"},
            "os": _platform_os(),
            "os_version": system(),
            "app_install_id_hash": sha256(b"robotics-studio-open-local-export").hexdigest(),
        },
        "transport": {
            "destination": INTAKE_ENDPOINT,
            "intended_at": created_at,
        },
    }


def _platform_os() -> str:
    name = system().lower()
    if name == "darwin":
        return "darwin"
    if name == "windows":
        return "windows"
    return "linux"

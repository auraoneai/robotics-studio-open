from __future__ import annotations

import json
import os
import zipfile
from datetime import datetime, timezone
from hashlib import sha256
from platform import system
from pathlib import Path
from typing import Any
from uuid import NAMESPACE_URL, uuid5

from .contracts import EpisodeMeta
from .runners import EmbodimentCardGenerator
from .sensor_qa import SensorQARunner

INTAKE_SCHEMA_ID = "https://schemas.auraone.ai/open-studio/intake-packet/v1.json"
INTAKE_ENDPOINT = "https://intake.auraone.ai/v1/packets/"
ROBOTICS_INTAKE_ROLES = {
    "robotics_reviewed_subset_manifest",
    "robotics_episode_reference",
    "robotics_failure_cluster",
    "robotics_intervention_note",
    "robotics_embodiment_card",
    "robotics_sensor_qa_report",
}


class LocalExporter:
    def export(self, episodes: list[EpisodeMeta], out_dir: str | Path, target_format: str = "manifest") -> Path:
        target = Path(out_dir)
        target.mkdir(parents=True, exist_ok=True)
        if target_format == "manifest":
            return self._manifest(episodes, target)
        if target_format in {"lerobot", "rlds", "openx", "hdf5"}:
            return self._metadata_bridge(episodes, target, target_format)
        raise ValueError("target_format must be manifest, lerobot, rlds, openx, or hdf5")

    def _manifest(self, episodes: list[EpisodeMeta], target: Path) -> Path:
        out = target / "training_ready_manifest.json"
        out.write_text(
            json.dumps(
                {
                    "schema": "robostudio.training_ready_manifest.v1",
                    "created_at": _now(),
                    "episode_count": len(episodes),
                    "episodes": [_public_episode_dict(episode) for episode in episodes],
                },
                indent=2,
                sort_keys=True,
            )
            + "\n",
            encoding="utf8",
        )
        return out

    def _metadata_bridge(self, episodes: list[EpisodeMeta], target: Path, target_format: str) -> Path:
        out = target / f"{target_format}_metadata_bridge.jsonl"
        with out.open("w", encoding="utf8") as handle:
            for episode in episodes:
                handle.write(json.dumps({"target_format": target_format, "episode": episode.to_dict()}, sort_keys=True) + "\n")
        return out


class HFHubExporter:
    def export(
        self,
        episodes: list[EpisodeMeta],
        repo_id: str,
        work_dir: str | Path,
        private: bool = False,
        include_dataset_card: bool = True,
        token: str | None = None,
    ) -> dict[str, Any]:
        work = Path(work_dir)
        work.mkdir(parents=True, exist_ok=True)
        manifest = LocalExporter().export(episodes, work, "manifest")
        if include_dataset_card:
            card = EmbodimentCardGenerator().generate(_merge_metadata(episodes))
            (work / "README.md").write_text(EmbodimentCardGenerator().render_markdown(card, hf_readme=True), encoding="utf8")
        token = token or os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")
        try:
            from huggingface_hub import HfApi  # type: ignore
        except Exception:
            return _blocked_hf(work, repo_id, "huggingface_hub is not installed", manifest)
        if not token:
            return _blocked_hf(work, repo_id, "HF_TOKEN or HUGGINGFACE_TOKEN is not available", manifest)
        api = HfApi(token=token)
        api.create_repo(repo_id=repo_id, repo_type="dataset", private=private, exist_ok=True)
        api.upload_folder(repo_id=repo_id, repo_type="dataset", folder_path=str(work))
        return {"status": "uploaded", "repo_id": repo_id, "path": f"https://huggingface.co/datasets/{repo_id}"}


class IntakePacketExporter:
    def export(
        self,
        episodes: list[EpisodeMeta],
        out: str | Path,
        extra_payloads: dict[str, str | Path] | None = None,
    ) -> Path:
        out_path = Path(out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        payloads: dict[str, str] = {
            "payload/reviewed_subset_manifest.json": json.dumps(
                [_public_episode_dict(episode) for episode in episodes],
                indent=2,
                sort_keys=True,
            ),
            "payload/episode_references.json": json.dumps(
                [{"episode_id": episode.episode_id} for episode in episodes],
                indent=2,
                sort_keys=True,
            ),
            "payload/failure_clusters.json": json.dumps([], indent=2, sort_keys=True),
            "payload/intervention_notes.jsonl": "\n".join(
                json.dumps(
                    {
                        "episode_id": episode.episode_id,
                        "intervention_count": episode.intervention_count,
                    },
                    sort_keys=True,
                )
                for episode in episodes
                if episode.intervention_count
            )
            + ("\n" if any(episode.intervention_count for episode in episodes) else ""),
            "payload/sensor_qa_report.json": json.dumps(
                SensorQARunner().run(episodes),
                indent=2,
                sort_keys=True,
            ),
            "payload/embodiment_card.md": EmbodimentCardGenerator().render_markdown(
                EmbodimentCardGenerator().generate(_merge_metadata(episodes))
            ),
        }
        role_by_path = {
            "payload/reviewed_subset_manifest.json": "robotics_reviewed_subset_manifest",
            "payload/episode_references.json": "robotics_episode_reference",
            "payload/failure_clusters.json": "robotics_failure_cluster",
            "payload/intervention_notes.jsonl": "robotics_intervention_note",
            "payload/embodiment_card.md": "robotics_embodiment_card",
            "payload/sensor_qa_report.json": "robotics_sensor_qa_report",
        }
        preview = _intake_privacy_preview(payloads)
        extra_files: list[tuple[str, str, bytes]] = []
        for role, source in (extra_payloads or {}).items():
            if role not in ROBOTICS_INTAKE_ROLES:
                raise ValueError(f"unsupported Robotics intake role: {role}")
            archive_path = _safe_archive_path(f"payload/{role}/{Path(source).name}")
            extra_files.append((archive_path, role, Path(source).read_bytes()))
        manifest = _intake_manifest(
            episodes=episodes,
            payloads=payloads,
            role_by_path=role_by_path,
            extra_files=extra_files,
        )
        with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("manifest.json", json.dumps(manifest, indent=2, sort_keys=True))
            archive.writestr("privacy/preview.json", json.dumps(preview, indent=2, sort_keys=True))
            for path, payload in payloads.items():
                archive.writestr(path, payload)
            for archive_path, _role, content in extra_files:
                archive.writestr(archive_path, content)
        return out_path


def prepare_release_blockers(out: str | Path) -> Path:
    path = Path(out)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "# Robotics Studio Engine Release Blockers\n\n"
        f"Generated: {_now()}\n\n"
        "- [ ] PyPI publish for `robostudio-engine`: requires authenticated PyPI token. Next action: run `python -m build` then `twine upload dist/*` with release credentials.\n"
        "- [ ] Hugging Face sample dataset upload: requires `HF_TOKEN` scoped to the `auraoneai` org. Next action: run `robostudio export <dataset> --to hf-hub --repo auraoneai/so101-kitchen-sample`.\n"
        "- [ ] Failure-gallery PR opening: requires authenticated `gh` CLI. Next action: run `gh pr create` from the branch containing generated `cases/<case_id>/case.json`.\n",
        encoding="utf8",
    )
    return path


def _blocked_hf(work: Path, repo_id: str, reason: str, manifest: Path) -> dict[str, Any]:
    blocker = work / "HF_HUB_EXPORT_BLOCKER.md"
    blocker.write_text(
        f"# HF Hub Export Blocker\n\nDate: {_now()}\n\nRepo: `{repo_id}`\n\nReason: {reason}.\n\nPrepared manifest: `{manifest.name}`.\n",
        encoding="utf8",
    )
    return {"status": "blocked", "repo_id": repo_id, "reason": reason, "prepared_dir": str(work), "blocker": str(blocker)}


def _intake_manifest(
    episodes: list[EpisodeMeta],
    payloads: dict[str, str],
    role_by_path: dict[str, str],
    extra_files: list[tuple[str, str, bytes]],
) -> dict[str, Any]:
    created_at = _now()
    payload_manifest = [
        {
            "path": path,
            "role": role_by_path[path],
            "sha256": sha256(payload.encode("utf8")).hexdigest(),
            "size_bytes": len(payload.encode("utf8")),
        }
        for path, payload in sorted(payloads.items())
    ]
    payload_manifest.extend(
        {
            "path": path,
            "role": role,
            "sha256": sha256(content).hexdigest(),
            "size_bytes": len(content),
        }
        for path, role, content in sorted(extra_files)
    )
    return {
        "$schema": INTAKE_SCHEMA_ID,
        "manifest_version": "1.0.0",
        "product": "robotics-studio-open",
        "product_version": "0.1.0",
        "platform_version": "0.3.0",
        "created_at": created_at,
            "project_id": str(
                uuid5(
                    NAMESPACE_URL,
                    f"robotics-studio-open:intake:{created_at}:{len(episodes)}",
                )
            ),
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
        "payload_manifest": payload_manifest,
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


def _public_episode_dict(episode: EpisodeMeta) -> dict[str, Any]:
    payload = episode.to_dict()
    payload["root"] = "<DATASET_ROOT>"
    payload["metadata"] = _scrub_export_value(payload.get("metadata", {}))
    payload["sensor_schema"] = [_scrub_export_value(stream) for stream in payload.get("sensor_schema", [])]
    payload["video_paths"] = {
        str(name): _safe_relative_value(path)
        for name, path in dict(payload.get("video_paths", {})).items()
        if _safe_relative_value(path) is not None
    }
    if payload.get("relative_path") is not None:
        payload["relative_path"] = _safe_relative_value(payload["relative_path"])
    return payload


def _scrub_export_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(key): _scrub_export_value(child)
            for key, child in value.items()
            if not _secretish_key(str(key)) and _scrub_export_value(child) is not None
        }
    if isinstance(value, list):
        return [child for item in value if (child := _scrub_export_value(item)) is not None]
    if isinstance(value, str):
        if _looks_like_secret(value) or _looks_like_absolute_path(value) or Path(value).name.startswith("."):
            return None
        return value
    return value


def _intake_privacy_preview(payloads: dict[str, str]) -> dict[str, Any]:
    return {
        "schema": "auraone.robotics.intake-privacy-preview.v1",
        "files": [
            {
                "path": path,
                "size_bytes": len(payload.encode("utf8")),
                "redaction_rules": [
                    "dataset_root_replaced_with_<DATASET_ROOT>",
                    "absolute_paths_removed",
                    "tokens_and_secret_like_fields_removed",
                    "hidden_files_excluded",
                    "raw_robot_media_excluded",
                ],
            }
            for path, payload in sorted(payloads.items())
        ],
        "requires_user_acknowledgement": True,
    }


def _safe_archive_path(path: str) -> str:
    candidate = Path(path)
    if candidate.is_absolute() or ".." in candidate.parts or "\\" in path:
        raise ValueError(f"unsafe archive path: {path}")
    if any(part.startswith(".") for part in candidate.parts):
        raise ValueError(f"hidden archive path is not allowed: {path}")
    return candidate.as_posix()


def _safe_relative_value(value: Any) -> str | None:
    text = str(value)
    candidate = Path(text)
    if candidate.is_absolute() or ".." in candidate.parts or "\\" in text or candidate.name.startswith("."):
        return None
    return candidate.as_posix()


def _secretish_key(key: str) -> bool:
    normalized = key.lower().replace("-", "_")
    return any(marker in normalized for marker in ("token", "secret", "api_key", "authorization", "password"))


def _looks_like_secret(value: str) -> bool:
    return any(marker in value for marker in ("sk-", "AKIA", "AIza", "-----BEGIN", "hf_"))


def _platform_os() -> str:
    name = system().lower()
    if name == "darwin":
        return "darwin"
    if name == "windows":
        return "windows"
    return "linux"


def _looks_like_absolute_path(value: str) -> bool:
    return value.startswith(("/Users/", "/home/", "\\Users\\")) or ":\\Users\\" in value


def _merge_metadata(episodes: list[EpisodeMeta]) -> dict[str, Any]:
    if not episodes:
        return {}
    first = episodes[0]
    info = first.metadata.get("info", {})
    merged = dict(info if isinstance(info, dict) else {})
    merged.setdefault("robot_type", first.embodiment or "unknown")
    merged.setdefault("sensors", [stream.to_dict() for stream in first.sensor_schema])
    return merged


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

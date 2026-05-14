from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal


Json = dict[str, Any]
PLUGIN_SCHEMA_ID = "https://schemas.auraone.ai/robotics-studio/plugin-manifest/v1.json"
SUPPORTED_PLUGIN_API = "robostudio.plugin.v1"
PLUGIN_KINDS = {"adapter", "panel"}
PANEL_SLOTS = {"episode-sidebar", "dataset-sidebar", "export-drawer", "cluster-detail"}


@dataclass(frozen=True)
class PluginContribution:
    kind: Literal["adapter", "panel"]
    id: str
    title: str
    entrypoint: str
    formats: list[str] = field(default_factory=list)
    slot: str | None = None
    permissions: list[str] = field(default_factory=list)

    def to_dict(self) -> Json:
        return asdict(self)


@dataclass(frozen=True)
class PluginManifest:
    plugin_id: str
    name: str
    version: str
    api: str
    description: str
    author: str
    contributions: list[PluginContribution]
    capabilities: list[str] = field(default_factory=list)

    def to_dict(self) -> Json:
        return {
            "schema": PLUGIN_SCHEMA_ID,
            "plugin_id": self.plugin_id,
            "name": self.name,
            "version": self.version,
            "api": self.api,
            "description": self.description,
            "author": self.author,
            "capabilities": self.capabilities,
            "contributions": [contribution.to_dict() for contribution in self.contributions],
        }


def load_plugin_manifest(path: str | Path) -> PluginManifest:
    manifest_path = Path(path)
    payload = json.loads(manifest_path.read_text(encoding="utf8"))
    errors = validate_plugin_manifest(payload, manifest_path.parent)
    if errors:
        raise ValueError("; ".join(errors))
    return _manifest_from_payload(payload)


def validate_plugin_manifest(payload: Json, root: str | Path | None = None) -> list[str]:
    errors: list[str] = []
    root_path = Path(root) if root is not None else None

    for key in ["schema", "plugin_id", "name", "version", "api", "description", "author", "contributions"]:
        if key not in payload:
            errors.append(f"missing required field: {key}")

    if payload.get("schema") != PLUGIN_SCHEMA_ID:
        errors.append(f"schema must be {PLUGIN_SCHEMA_ID}")
    if payload.get("api") != SUPPORTED_PLUGIN_API:
        errors.append(f"api must be {SUPPORTED_PLUGIN_API}")

    plugin_id = payload.get("plugin_id")
    if isinstance(plugin_id, str):
        if not plugin_id.startswith("ai.auraone.robostudio.plugins."):
            errors.append("plugin_id must start with ai.auraone.robostudio.plugins.")
    elif "plugin_id" in payload:
        errors.append("plugin_id must be a string")

    version = payload.get("version")
    if isinstance(version, str):
        if len(version.split(".")) != 3:
            errors.append("version must use semver major.minor.patch")
    elif "version" in payload:
        errors.append("version must be a string")

    contributions = payload.get("contributions")
    if not isinstance(contributions, list) or not contributions:
        errors.append("contributions must be a non-empty list")
        return errors

    ids: set[str] = set()
    for index, contribution in enumerate(contributions):
        if not isinstance(contribution, dict):
            errors.append(f"contributions[{index}] must be an object")
            continue
        kind = contribution.get("kind")
        contribution_id = contribution.get("id")
        entrypoint = contribution.get("entrypoint")
        title = contribution.get("title")

        if kind not in PLUGIN_KINDS:
            errors.append(f"contributions[{index}].kind must be adapter or panel")
        if not isinstance(contribution_id, str) or not contribution_id:
            errors.append(f"contributions[{index}].id must be a non-empty string")
        elif contribution_id in ids:
            errors.append(f"duplicate contribution id: {contribution_id}")
        else:
            ids.add(contribution_id)
        if not isinstance(title, str) or not title:
            errors.append(f"contributions[{index}].title must be a non-empty string")
        if not isinstance(entrypoint, str) or not entrypoint:
            errors.append(f"contributions[{index}].entrypoint must be a non-empty string")
        elif root_path is not None and _escapes_root(root_path, entrypoint):
            errors.append(f"contributions[{index}].entrypoint must stay inside the plugin directory")

        if kind == "adapter":
            formats = contribution.get("formats")
            if not isinstance(formats, list) or not formats or not all(isinstance(item, str) and item for item in formats):
                errors.append(f"contributions[{index}].formats must list at least one dataset format")
        if kind == "panel":
            slot = contribution.get("slot")
            if slot not in PANEL_SLOTS:
                errors.append(f"contributions[{index}].slot must be one of {', '.join(sorted(PANEL_SLOTS))}")

        permissions = contribution.get("permissions", [])
        if not isinstance(permissions, list) or not all(isinstance(item, str) for item in permissions):
            errors.append(f"contributions[{index}].permissions must be a list of strings")

    return errors


def _escapes_root(root: Path, entrypoint: str) -> bool:
    entrypoint_path = (root / entrypoint).resolve()
    try:
        entrypoint_path.relative_to(root.resolve())
        return False
    except ValueError:
        return True


def _manifest_from_payload(payload: Json) -> PluginManifest:
    contributions = [
        PluginContribution(
            kind=contribution["kind"],
            id=contribution["id"],
            title=contribution["title"],
            entrypoint=contribution["entrypoint"],
            formats=list(contribution.get("formats", [])),
            slot=contribution.get("slot"),
            permissions=list(contribution.get("permissions", [])),
        )
        for contribution in payload["contributions"]
    ]
    return PluginManifest(
        plugin_id=payload["plugin_id"],
        name=payload["name"],
        version=payload["version"],
        api=payload["api"],
        description=payload["description"],
        author=payload["author"],
        capabilities=list(payload.get("capabilities", [])),
        contributions=contributions,
    )

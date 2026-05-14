from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


REQUIRED = ["episode_id", "task", "failure_reason", "intervention_type", "start_time", "intervention_time", "end_time", "recovery_success"]


@dataclass(frozen=True)
class RecoverySegment:
    episode_id: str
    task: str
    failure_reason: str
    intervention_type: str
    start_time: float
    intervention_time: float
    end_time: float
    recovery_success: bool
    operator_action: str = ""
    training_ready: bool = False

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "RecoverySegment":
        return cls(
            episode_id=str(payload.get("episode_id", "")),
            task=str(payload.get("task", "")),
            failure_reason=str(payload.get("failure_reason", "")),
            intervention_type=str(payload.get("intervention_type", "")),
            start_time=float(payload.get("start_time", 0)),
            intervention_time=float(payload.get("intervention_time", 0)),
            end_time=float(payload.get("end_time", 0)),
            recovery_success=bool(payload.get("recovery_success", False)),
            operator_action=str(payload.get("operator_action", "")),
            training_ready=bool(payload.get("training_ready", False)),
        )


def load_segments(path: str | Path) -> list[RecoverySegment]:
    segments: list[RecoverySegment] = []
    for line in Path(path).read_text(encoding="utf8").splitlines():
        if not line.strip():
            continue
        segments.append(RecoverySegment.from_dict(json.loads(line)))
    return segments


def validate_segment(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    for key in REQUIRED:
        if key not in payload:
            errors.append(f"missing `{key}`")
    for key in ["start_time", "intervention_time", "end_time"]:
        if key in payload and not isinstance(payload[key], int | float):
            errors.append(f"`{key}` must be numeric")
    if isinstance(payload.get("start_time"), int | float) and isinstance(payload.get("intervention_time"), int | float):
        if payload["intervention_time"] < payload["start_time"]:
            errors.append("intervention_time must be >= start_time")
    if isinstance(payload.get("intervention_time"), int | float) and isinstance(payload.get("end_time"), int | float):
        if payload["end_time"] < payload["intervention_time"]:
            errors.append("end_time must be >= intervention_time")
    if "recovery_success" in payload and not isinstance(payload["recovery_success"], bool):
        errors.append("`recovery_success` must be boolean")
    return errors


def validate_file(path: str | Path) -> dict[int, list[str]]:
    failures: dict[int, list[str]] = {}
    for line_no, line in enumerate(Path(path).read_text(encoding="utf8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError as exc:
            failures[line_no] = [f"invalid json: {exc}"]
            continue
        errors = validate_segment(payload)
        if errors:
            failures[line_no] = errors
    return failures

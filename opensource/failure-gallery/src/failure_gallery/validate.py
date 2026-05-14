from __future__ import annotations

import json
from pathlib import Path

REQUIRED = ["id", "domain", "title", "description", "review_label", "expected_finding", "related_tool", "reproduce_command", "synthetic"]


def load_cases(path: str | Path) -> list[dict]:
    root = Path(path)
    cases = []
    for case_file in sorted(root.glob("*/case.json")):
        cases.append(json.loads(case_file.read_text(encoding="utf-8")))
    return cases


def validate_cases(path: str | Path) -> list[str]:
    errors: list[str] = []
    cases = load_cases(path)
    if len(cases) < 12:
        errors.append("at least 12 synthetic cases are required")
    domains = {case.get("domain") for case in cases}
    if "agent" not in domains or "robotics" not in domains:
        errors.append("gallery must include both agent and robotics cases")
    for case in cases:
        for field in REQUIRED:
            if field not in case:
                errors.append(f"{case.get('id', 'unknown')}: missing `{field}`")
        if case.get("synthetic") is not True:
            errors.append(f"{case.get('id', 'unknown')}: synthetic must be true")
    return errors


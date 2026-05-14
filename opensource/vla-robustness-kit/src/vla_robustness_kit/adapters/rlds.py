from __future__ import annotations


def normalize_episode(raw: dict) -> dict:
    return {
        "id": raw.get("episode_id", raw.get("id", "unknown")),
        "instruction": raw.get("language_instruction", raw.get("instruction", "")),
        "metadata": raw.get("metadata", {}),
        "phases": raw.get("phases", ["approach", "act", "verify"]),
        "tags": raw.get("tags", []),
    }


#!/usr/bin/env python3
"""Static smoke check for the PRD 38 viewer path."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def smoke_check() -> dict[str, bool]:
    html = (ROOT / "viewer/reviewkit.html").read_text(encoding="utf-8").lower()
    js = (ROOT / "viewer/reviewkit-viewer.js").read_text(encoding="utf-8").lower()
    episode = (ROOT / "examples/teleop_review_mock_episode.json").read_text(encoding="utf-8").lower()

    return {
        "mock_disclosure": ("synthetic" in html or "mock" in html) and "not human validated" in episode,
        "viewer_shell": "episode-file" in html and "timeline" in html and "sensor qa" in html,
        "timeline_layer": "failure_annotations" in js and "interventions" in js and "segments" in js,
    }


def main() -> int:
    result = smoke_check()
    failed = [name for name, passed in result.items() if not passed]
    if failed:
        print(f"viewer smoke failed: {', '.join(failed)}")
        return 1
    print("viewer smoke passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

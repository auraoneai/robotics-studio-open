#!/usr/bin/env python3
"""Export mock Teleop Review Schema metadata to a LeRobot-style JSON skeleton."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from robotics_reviewkit.exporters import export_lerobot_metadata
from robotics_reviewkit.exporters.lerobot import write_lerobot_metadata_export


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="evalkit robotics export-lerobot",
        description="Export mock teleop review metadata to a LeRobot-style metadata-only JSON directory.",
    )
    parser.add_argument("input", type=Path, help="Teleop Review Schema mock episode JSON.")
    parser.add_argument("output", type=Path, help="Output directory, or a .json file for the legacy single-file shape.")
    parser.add_argument("--dataset-name", default="auraone_mock_lerobot_metadata")
    args = parser.parse_args(argv)

    payload = json.loads(args.input.read_text(encoding="utf-8"))
    if args.output.suffix == ".json":
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(export_lerobot_metadata(payload), indent=2, sort_keys=True) + "\n", encoding="utf-8")
        summary = {"compatibility": "metadata_only", "export_type": "lerobot_metadata_bridge", "output_file": str(args.output)}
    else:
        export = write_lerobot_metadata_export(payload, args.output, dataset_name=args.dataset_name)
        summary = {
            "compatibility": export["compatibility"],
            "episode_count": export["dataset"]["episode_count"],
            "export_type": export["export_type"],
            "output_dir": str(args.output),
        }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Export mock Teleop Review Schema metadata to RLDS/OpenX-style JSON skeletons."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from robotics_reviewkit.exporters import export_rlds_openx_metadata
from robotics_reviewkit.exporters.openx import write_openx_metadata_export
from robotics_reviewkit.exporters.rlds import write_rlds_metadata_export


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="evalkit robotics export-rlds",
        description="Export mock teleop review metadata to metadata-only RLDS/OpenX-style JSON.",
    )
    parser.add_argument("input", type=Path, help="Teleop Review Schema mock episode JSON.")
    parser.add_argument("output", type=Path, help="Output directory, or a .json file for the legacy single-file shape.")
    parser.add_argument("--format", choices=("rlds", "openx", "both"), default="rlds")
    parser.add_argument("--dataset-name", default=None)
    args = parser.parse_args(argv)

    payload = json.loads(args.input.read_text(encoding="utf-8"))
    if args.output.suffix == ".json":
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(export_rlds_openx_metadata(payload), indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        summary = {"compatibility": "metadata_only", "export_type": "rlds_openx_metadata_bridge", "output_file": str(args.output)}
    else:
        summary: dict[str, object] = {"exports": [], "output_dir": str(args.output)}
        if args.format in {"rlds", "both"}:
            export = write_rlds_metadata_export(
                payload,
                args.output / "rlds" if args.format == "both" else args.output,
                dataset_name=args.dataset_name or "auraone_mock_rlds_metadata",
            )
            summary["exports"].append(
                {
                    "compatibility": export["compatibility"],
                    "episode_count": export["dataset_info"]["episode_count"],
                    "export_type": export["export_type"],
                }
            )
        if args.format in {"openx", "both"}:
            export = write_openx_metadata_export(
                payload,
                args.output / "openx" if args.format == "both" else args.output,
                dataset_name=args.dataset_name or "auraone_mock_openx_metadata",
            )
            summary["exports"].append(
                {
                    "compatibility": export["compatibility"],
                    "episode_count": export["dataset"]["episode_count"],
                    "export_type": export["export_type"],
                }
            )
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

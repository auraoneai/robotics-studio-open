from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .metrics import compute_metrics
from .report import render_report
from .validate import load_segments, validate_file


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="robot-recovery-bench")
    sub = parser.add_subparsers(dest="command", required=True)
    val = sub.add_parser("validate", help="validate recovery segment JSONL")
    val.add_argument("path")
    rep = sub.add_parser("report", help="generate recovery metrics report")
    rep.add_argument("path")
    rep.add_argument("--format", choices=["markdown", "json"], default="markdown")
    rep.add_argument("--out", required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "validate":
        failures = validate_file(args.path)
        if failures:
            sys.stdout.write(json.dumps(failures, indent=2, sort_keys=True) + "\n")
            return 1
        print("valid")
        return 0
    if args.command == "report":
        metrics = compute_metrics(load_segments(args.path))
        Path(args.out).write_text(render_report(metrics, args.format), encoding="utf8")
        return 0
    parser.error("unknown command")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

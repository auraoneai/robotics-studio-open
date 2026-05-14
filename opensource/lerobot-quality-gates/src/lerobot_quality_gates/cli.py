from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .dataset_loader import load_hf_dataset
from .report import SEVERITY_ORDER, render_report, run_quality_gates, run_quality_gates_for_dataset


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="lerobot-quality-gates")
    sub = parser.add_subparsers(dest="command", required=True)
    check = sub.add_parser("check", help="check a LeRobot-style dataset")
    check.add_argument("path", nargs="?", default=".", help="dataset path")
    check.add_argument("--hf-repo", help="inspect Hugging Face dataset metadata without downloading media files")
    check.add_argument("--format", choices=["markdown", "json", "hf-card", "badge"], default="markdown")
    check.add_argument("--out", help="write report to file")
    check.add_argument("--fail-on", choices=list(SEVERITY_ORDER), default="high")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "check":
        report = run_quality_gates_for_dataset(load_hf_dataset(args.hf_repo)) if args.hf_repo else run_quality_gates(args.path)
        rendered = render_report(report, args.format)
        if args.out:
            Path(args.out).write_text(rendered, encoding="utf8")
        else:
            sys.stdout.write(rendered)
        return 1 if report.failing_findings(args.fail_on) else 0
    parser.error("unknown command")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

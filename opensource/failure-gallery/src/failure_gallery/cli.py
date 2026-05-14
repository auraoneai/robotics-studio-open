from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .render import render_index
from .validate import load_cases, validate_cases


def validate(args: argparse.Namespace) -> int:
    errors = validate_cases(args.cases)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    print("valid")
    return 0


def render(args: argparse.Namespace) -> int:
    errors = validate_cases(args.cases)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(render_index(load_cases(args.cases)), encoding="utf-8")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="failure-gallery")
    sub = parser.add_subparsers(dest="command", required=True)
    validate_parser = sub.add_parser("validate")
    validate_parser.add_argument("cases")
    validate_parser.set_defaults(func=validate)
    render_parser = sub.add_parser("render")
    render_parser.add_argument("cases")
    render_parser.add_argument("--out", required=True)
    render_parser.set_defaults(func=render)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())


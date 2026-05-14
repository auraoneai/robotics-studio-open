from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .hf_readme import render_hf_readme
from .render import render_markdown
from .schema import validate_card


def load_card(path: str | Path) -> dict:
    with Path(path).open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise SystemExit("card must be a JSON object")
    return data


def validate(args: argparse.Namespace) -> int:
    errors = validate_card(load_card(args.card))
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    print("valid")
    return 0


def render(args: argparse.Namespace) -> int:
    card = load_card(args.card)
    errors = validate_card(card)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    output = render_hf_readme(card) if args.hf_readme else render_markdown(card)
    if args.out:
        Path(args.out).write_text(output, encoding="utf-8")
    else:
        sys.stdout.write(output)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="embodiment-card")
    sub = parser.add_subparsers(dest="command", required=True)
    validate_parser = sub.add_parser("validate")
    validate_parser.add_argument("card")
    validate_parser.set_defaults(func=validate)
    render_parser = sub.add_parser("render")
    render_parser.add_argument("card")
    render_parser.add_argument("--out")
    render_parser.add_argument("--hf-readme", action="store_true")
    render_parser.set_defaults(func=render)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())


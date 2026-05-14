from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .adapters.mock_policy import score
from .perturbations.language import paraphrase_instruction
from .perturbations.metadata import embodiment_shifts
from .perturbations.task_phase import task_phase_reorders
from .perturbations.vision import vision_shifts
from .report import render_markdown


def load_episodes(path: str | Path) -> list[dict]:
    target = Path(path)
    if target.is_dir():
        target = target / "episodes.jsonl"
    episodes = []
    with target.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                episodes.append(json.loads(line))
    return episodes


def build_perturbations(episode: dict) -> list[dict]:
    metadata = episode.get("metadata", {})
    items = []
    items.extend(paraphrase_instruction(episode.get("instruction", "")))
    items.extend(vision_shifts(metadata))
    items.extend(embodiment_shifts(metadata))
    items.extend(task_phase_reorders(episode.get("phases", [])))
    return items


def run(args: argparse.Namespace) -> int:
    if args.policy != "mock":
        raise SystemExit("only the deterministic mock policy is bundled by default")
    results = []
    for episode in load_episodes(args.episodes):
        for perturbation in build_perturbations(episode):
            policy_result = score(episode, perturbation)
            results.append({"episode_id": episode.get("id"), **perturbation, **policy_result})
    output = render_markdown(results)
    if args.out:
        Path(args.out).write_text(output, encoding="utf-8")
    else:
        sys.stdout.write(output)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="vla-robustness-kit")
    sub = parser.add_subparsers(dest="command", required=True)
    run_parser = sub.add_parser("run")
    run_parser.add_argument("episodes")
    run_parser.add_argument("--policy", default="mock")
    run_parser.add_argument("--out")
    run_parser.set_defaults(func=run)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())


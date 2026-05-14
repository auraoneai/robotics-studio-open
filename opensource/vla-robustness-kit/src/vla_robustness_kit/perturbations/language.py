from __future__ import annotations


def paraphrase_instruction(instruction: str) -> list[dict[str, str]]:
    return [
        {"family": "language", "variant": "original", "instruction": instruction},
        {"family": "language", "variant": "polite_paraphrase", "instruction": f"Please {instruction}."},
        {"family": "language", "variant": "phase_explicit", "instruction": f"First localize the target, then {instruction}."},
    ]


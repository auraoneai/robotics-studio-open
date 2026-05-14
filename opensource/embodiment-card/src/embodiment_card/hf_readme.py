from __future__ import annotations

from .render import render_markdown


def render_hf_readme(card: dict) -> str:
    front_matter = "---\ntags:\n- robotics\n- embodiment-card\n---\n\n"
    return front_matter + render_markdown(card)


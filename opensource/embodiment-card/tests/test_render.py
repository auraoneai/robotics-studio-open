from pathlib import Path

from embodiment_card.cli import main
from embodiment_card.render import render_markdown


def test_render_contains_key_sections():
    import json

    card = json.loads(Path("examples/mock_so101_card.json").read_text(encoding="utf-8"))
    rendered = render_markdown(card)
    assert "Coordinate Frames" in rendered
    assert "Action Space" in rendered
    assert "Known Limitations" in rendered


def test_cli_validate_and_render(tmp_path: Path):
    out = tmp_path / "card.md"
    assert main(["validate", "examples/mock_so101_card.json"]) == 0
    assert main(["render", "examples/mock_so101_card.json", "--out", str(out)]) == 0
    assert "Mock SO-101" in out.read_text(encoding="utf-8")


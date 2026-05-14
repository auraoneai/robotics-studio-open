from pathlib import Path

from failure_gallery.cli import main
from failure_gallery.validate import load_cases, validate_cases


def test_cases_validate():
    assert validate_cases("cases") == []
    cases = load_cases("cases")
    assert len(cases) >= 12
    assert sum(1 for case in cases if case["domain"] == "agent") >= 6
    assert sum(1 for case in cases if case["domain"] == "robotics") >= 6


def test_static_site_renders(tmp_path: Path):
    out = tmp_path / "index.html"
    assert main(["render", "cases", "--out", str(out)]) == 0
    text = out.read_text(encoding="utf-8")
    assert "AuraOne Failure Gallery" in text
    assert "Failures worth reviewing before they reach production" in text
    assert "AuraGlass" in text

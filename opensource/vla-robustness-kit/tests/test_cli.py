from pathlib import Path

from vla_robustness_kit.cli import main


def test_cli_generates_report(tmp_path: Path):
    out = tmp_path / "report.md"
    assert main(["run", "examples/mock_episode_set", "--policy", "mock", "--out", str(out)]) == 0
    text = out.read_text(encoding="utf-8")
    assert "VLA Robustness Diagnostic Report" in text
    assert "Failure Clusters" in text
    assert "Recommended Follow-Up Data Collection" in text


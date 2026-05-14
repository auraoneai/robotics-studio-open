import runpy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_prd_viewer_smoke_script_runs():
    result = runpy.run_path(str(ROOT / "tests/viewer_smoke.py"))
    assert result is not None


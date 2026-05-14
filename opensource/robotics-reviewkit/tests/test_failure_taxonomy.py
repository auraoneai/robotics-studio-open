from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def test_prd_failure_taxonomy_compatibility_path_exists_and_loads():
    data = yaml.safe_load((ROOT / "taxonomy/failure_modes.yaml").read_text(encoding="utf-8"))
    assert len(data["failure_modes"]) >= 10


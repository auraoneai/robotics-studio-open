from __future__ import annotations

import json
import runpy
import subprocess
import sys
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


def test_prd_taxonomy_and_task_paths_alias_canonical_schema() -> None:
    aliases = [
        ("taxonomy/failure_modes.yaml", "schema/taxonomy/failure_modes.yaml"),
        ("taxonomy/intervention_ontology.yaml", "schema/taxonomy/intervention_ontology.yaml"),
        ("taxonomy/sensor_qa_flags.yaml", "schema/taxonomy/sensor_qa_flags.yaml"),
        ("tasks/teleop_tasks.yaml", "schema/tasks/teleop_tasks.yaml"),
    ]

    for alias, canonical in aliases:
        alias_path = ROOT / alias
        canonical_path = ROOT / canonical
        assert alias_path.exists(), f"missing PRD compatibility path: {alias}"
        assert yaml.safe_load(alias_path.read_text(encoding="utf-8")) == yaml.safe_load(
            canonical_path.read_text(encoding="utf-8")
        )


def test_prd_validate_teleop_path_validates_canonical_mock_episode() -> None:
    result = subprocess.run(
        [
            sys.executable,
            str(ROOT / "src/validate_teleop.py"),
            str(ROOT / "examples/teleop_review_mock_episode.json"),
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    assert json.loads(result.stdout)["valid"] is True


def test_viewer_smoke_path_runs_without_external_services() -> None:
    namespace = runpy.run_path(str(ROOT / "tests/viewer_smoke.py"))
    assert namespace["smoke_check"]() == {
        "mock_disclosure": True,
        "viewer_shell": True,
        "timeline_layer": True,
    }


def test_prd_exporter_paths_reexport_canonical_metadata_bridges() -> None:
    import exporters.lerobot as prd_lerobot
    import exporters.openx as prd_openx
    import exporters.rlds as prd_rlds
    from robotics_reviewkit.exporters.lerobot import build_lerobot_metadata_export
    from robotics_reviewkit.exporters.openx import build_openx_metadata_export
    from robotics_reviewkit.exporters.rlds import build_rlds_metadata_export

    assert (ROOT / "src/exporters/lerobot.py").exists()
    assert (ROOT / "src/exporters/rlds.py").exists()
    assert (ROOT / "src/exporters/openx.py").exists()
    assert prd_lerobot.build_lerobot_metadata_export is build_lerobot_metadata_export
    assert prd_rlds.build_rlds_metadata_export is build_rlds_metadata_export
    assert prd_openx.build_openx_metadata_export is build_openx_metadata_export

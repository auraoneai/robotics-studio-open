import json
import os
import subprocess
import sys
from pathlib import Path

from robot_recovery_bench.lerobot_adapter import from_lerobot_episode
from robot_recovery_bench.metrics import compute_metrics
from robot_recovery_bench.rlds_adapter import from_rlds_steps
from robot_recovery_bench.report import render_report
from robot_recovery_bench.validate import load_segments, validate_file

ROOT = Path(__file__).resolve().parents[1]


def test_validate_and_load_segments():
    failures = validate_file(ROOT / "examples/mock_recovery_segments.jsonl")
    assert failures == {}
    segments = load_segments(ROOT / "examples/mock_recovery_segments.jsonl")
    assert len(segments) == 3


def test_invalid_segments_fail_validation():
    failures = validate_file(ROOT / "examples/mock_invalid_segments.jsonl")
    assert 1 in failures
    assert any("intervention_time" in item for item in failures[1])
    assert any("recovery_success" in item for item in failures[1])


def test_metrics_and_report():
    metrics = compute_metrics(load_segments(ROOT / "examples/mock_recovery_segments.jsonl"))
    assert metrics["segments"] == 3
    assert round(metrics["recovery_success_rate"], 2) == 0.67
    assert metrics["failure_clusters"]["grasp_misalignment"] == 2
    markdown = render_report(metrics)
    assert "Robot Recovery Bench Report" in markdown
    assert json.loads(render_report(metrics, "json"))["segments"] == 3


def test_adapters():
    lerobot_rows = from_lerobot_episode(
        {
            "episode_id": 7,
            "task": "mock_task",
            "interventions": [
                {"type": "human_correction", "reason": "object_slip", "start_time": 1.0, "end_time": 2.0, "recovery_success": True}
            ],
        }
    )
    assert lerobot_rows[0]["episode_id"] == "7"
    rlds_rows = from_rlds_steps("e1", "mock", [{"timestamp": 1.0, "intervention": {"type": "reset", "reason": "unsafe_motion", "end_time": 2.0}}])
    assert rlds_rows[0]["failure_reason"] == "unsafe_motion"


def test_cli_validate_and_report(tmp_path):
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT / "src")
    valid = subprocess.run(
        [sys.executable, "-m", "robot_recovery_bench.cli", "validate", str(ROOT / "examples/mock_recovery_segments.jsonl")],
        text=True,
        capture_output=True,
        env=env,
    )
    assert valid.returncode == 0, valid.stderr + valid.stdout
    out = tmp_path / "report.md"
    report = subprocess.run(
        [sys.executable, "-m", "robot_recovery_bench.cli", "report", str(ROOT / "examples/mock_recovery_segments.jsonl"), "--out", str(out)],
        text=True,
        capture_output=True,
        env=env,
    )
    assert report.returncode == 0, report.stderr + report.stdout
    assert "grasp_misalignment" in out.read_text()

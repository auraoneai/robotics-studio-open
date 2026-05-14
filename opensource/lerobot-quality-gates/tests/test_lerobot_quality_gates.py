import json
import os
import subprocess
import sys
from pathlib import Path

from lerobot_quality_gates import run_quality_gates
from lerobot_quality_gates.dataset_loader import load_hf_dataset
from lerobot_quality_gates.report import render_report, run_quality_gates_for_dataset

ROOT = Path(__file__).resolve().parents[1]


def test_good_mock_dataset_passes():
    report = run_quality_gates(ROOT / "examples/mock_lerobot_v3_good")
    assert report.findings == []
    assert report.dataset.info["fps"] == 30
    assert len(report.dataset.episodes) == 2


def test_bad_mock_dataset_emits_actionable_findings():
    report = run_quality_gates(ROOT / "examples/mock_lerobot_v3_bad")
    assert len(report.findings) >= 10
    gates = {finding.gate for finding in report.findings}
    assert {"metadata", "episodes", "sensors", "actions", "video", "interventions", "card"}.issubset(gates)
    assert all(finding.remediation for finding in report.findings)


def test_report_formats():
    report = run_quality_gates(ROOT / "examples/mock_lerobot_v3_bad")
    markdown = render_report(report, "markdown")
    assert "# LeRobot Quality Gates Report" in markdown
    payload = json.loads(render_report(report, "json"))
    assert payload["finding_count"] >= 10
    card = render_report(report, "hf-card")
    assert "AuraOne LeRobot Quality Gates" in card
    badge = json.loads(render_report(report, "badge"))
    assert badge["schemaVersion"] == 1


def test_hf_repo_loader_uses_lightweight_metadata_only():
    def fetcher(repo_id, filename):
        assert repo_id == "auraone/mock-lerobot"
        payloads = {
            "meta/info.json": json.dumps(
                {
                    "codebase_version": "v3",
                    "fps": 30,
                    "features": {
                        "action": {"shape": [6]},
                        "observation.state": {"shape": [6]},
                        "observation.images.front": {"shape": [480, 640, 3]},
                    },
                    "splits": {"train": "0:1"},
                    "robot_type": "mock_arm",
                    "total_episodes": 1,
                }
            ),
            "meta/episodes.json": json.dumps(
                {
                    "episodes": [
                        {
                            "episode_id": 0,
                            "task": "mock pick",
                            "frames": 2,
                            "start_time": 0,
                            "end_time": 1,
                            "data_path": "data/chunk-000/episode_000.parquet",
                            "video_paths": {"observation.images.front": "videos/front.mp4"},
                            "action_shape": [6],
                            "state_shape": [6],
                            "timestamps": [0, 1],
                        }
                    ]
                }
            ),
            "README.md": "Mock robot sensor task limitation dataset card.",
        }
        return payloads.get(filename, "")

    dataset = load_hf_dataset("auraone/mock-lerobot", fetcher=fetcher)
    report = run_quality_gates_for_dataset(dataset)
    payload = report.to_dict()
    assert payload["source"] == "hf://auraone/mock-lerobot"
    assert payload["remote"] is True
    assert "video" not in {finding.gate for finding in report.findings}


def test_cli_good_dataset_writes_report(tmp_path):
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT / "src")
    out = tmp_path / "report.md"
    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "lerobot_quality_gates.cli",
            "check",
            str(ROOT / "examples/mock_lerobot_v3_good"),
            "--out",
            str(out),
        ],
        text=True,
        capture_output=True,
        env=env,
    )
    assert proc.returncode == 0, proc.stderr + proc.stdout
    assert "No findings." in out.read_text()


def test_cli_bad_dataset_fails_on_medium():
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT / "src")
    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "lerobot_quality_gates.cli",
            "check",
            str(ROOT / "examples/mock_lerobot_v3_bad"),
            "--format",
            "json",
            "--fail-on",
            "medium",
        ],
        text=True,
        capture_output=True,
        env=env,
    )
    assert proc.returncode == 1
    assert json.loads(proc.stdout)["finding_count"] >= 10

from __future__ import annotations

import json
from pathlib import Path

from robostudio_engine.cli import main


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "examples" / "mock_multi_format"


def test_cli_inspect_index_export_and_blockers(tmp_path, capsys):
    assert main(["inspect", str(FIXTURES / "lerobot_v3")]) == 0
    inspect_payload = json.loads(capsys.readouterr().out)
    assert inspect_payload["adapter"] == "lerobot"
    assert main(["index", str(FIXTURES / "lerobot_v3")]) == 0
    index_payload = json.loads(capsys.readouterr().out)
    assert index_payload["indexed"] == 2
    assert main(["export", str(FIXTURES / "lerobot_v3"), "--to", "manifest", "--out", str(tmp_path / "export")]) == 0
    export_payload = json.loads(capsys.readouterr().out)
    assert Path(export_payload["out"]).exists()
    assert main(["release-blockers", "--out", str(tmp_path / "RELEASE_BLOCKERS.md")]) == 0
    blockers = json.loads(capsys.readouterr().out)
    assert Path(blockers["out"]).exists()


def test_cli_probe_stream(capsys):
    episodes = ROOT.parent / "vla-robustness-kit" / "examples" / "mock_episode_set"
    assert main(["probe", str(episodes), "--stream"]) == 0
    lines = [json.loads(line) for line in capsys.readouterr().out.splitlines()]
    assert lines[0]["event"] == "probe_trial"
    assert lines[-1]["event"] == "probe_complete"


def test_cli_probe_byo_policy_adapter(tmp_path, capsys):
    policy = tmp_path / "policy.py"
    policy.write_text(
        "#!/usr/bin/env python3\n"
        "import json, sys\n"
        "payload=json.loads(sys.stdin.read())\n"
        "passed=payload['perturbation']['variant'] == 'original'\n"
        "print(json.dumps({'passed': passed, 'confidence': 0.9 if passed else 0.1}))\n",
        encoding="utf8",
    )
    policy.chmod(0o755)

    episodes = ROOT.parent / "vla-robustness-kit" / "examples" / "mock_episode_set"
    assert main(["probe", str(episodes), "--policy", str(policy)]) == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["status"] == "ok"
    assert payload["policy"] == "byo"
    assert payload["summary"]["total"] > 0


def test_cli_plugin_manifest_validate(capsys):
    manifest = ROOT / "examples" / "plugins" / "hdf5_force_panel" / "manifest.json"
    assert main(["plugins", "validate", str(manifest)]) == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["valid"] is True
    assert payload["manifest"]["api"] == "robostudio.plugin.v1"

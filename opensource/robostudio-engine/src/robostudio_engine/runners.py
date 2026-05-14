from __future__ import annotations

import importlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Iterable

MAX_SIDECAR_STDOUT_BYTES = 1_000_000


def _ensure_local_oss_paths() -> None:
    here = Path(__file__).resolve()
    opensource = here.parents[3]
    for project in [
        "lerobot-quality-gates",
        "robot-recovery-bench",
        "vla-robustness-kit",
        "embodiment-card",
        "robotics-reviewkit",
        "failure-gallery",
    ]:
        src = opensource / project / "src"
        if src.exists() and str(src) not in sys.path:
            sys.path.insert(0, str(src))


def _jsonable(value: Any) -> Any:
    if hasattr(value, "to_dict"):
        return value.to_dict()
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    return value


class QualityGateRunner:
    def run(self, dataset: str | Path, fail_on: str = "high") -> dict[str, Any]:
        _ensure_local_oss_paths()
        try:
            report_mod = importlib.import_module("lerobot_quality_gates.report")
            report = report_mod.run_quality_gates(dataset)
            payload = report.to_dict()
            payload["blocked"] = bool(report.failing_findings(fail_on))
            return payload
        except Exception:
            result = subprocess.run(
                [sys.executable, "-m", "lerobot_quality_gates.cli", "check", str(dataset), "--format", "json", "--fail-on", fail_on],
                text=True,
                capture_output=True,
                check=False,
                timeout=60,
            )
            if result.stdout.strip():
                payload = _loads_bounded_json(result.stdout, "quality gates sidecar")
            else:
                payload = {"finding_count": 1, "findings": [{"severity": "error", "message": result.stderr.strip()}]}
            payload["blocked"] = result.returncode != 0
            return payload


class RecoveryAnalyzer:
    def analyze(self, segments_jsonl: str | Path) -> dict[str, Any]:
        _ensure_local_oss_paths()
        validate = importlib.import_module("robot_recovery_bench.validate")
        metrics = importlib.import_module("robot_recovery_bench.metrics")
        return _jsonable(metrics.compute_metrics(validate.load_segments(segments_jsonl)))


class VLAProbeRunner:
    def run(self, episodes: str | Path, policy: str = "mock", stream: bool = False) -> dict[str, Any] | Iterable[dict[str, Any]]:
        if stream:
            return self.stream(episodes, policy=policy)
        return self._run_once(episodes, policy=policy)

    def stream(self, episodes: str | Path, policy: str = "mock") -> Iterable[dict[str, Any]]:
        payload = self._run_once(episodes, policy=policy, emit_trials=True)
        for item in payload.pop("_trial_events", []):
            yield item
        yield {"event": "probe_complete", **payload}

    def _run_once(self, episodes: str | Path, policy: str = "mock", emit_trials: bool = False) -> dict[str, Any]:
        _ensure_local_oss_paths()
        if policy != "mock":
            return self._run_byo_policy(episodes, policy, emit_trials=emit_trials)
        cli = importlib.import_module("vla_robustness_kit.cli")
        mock_policy = importlib.import_module("vla_robustness_kit.adapters.mock_policy")
        results: list[dict[str, Any]] = []
        trial_events: list[dict[str, Any]] = []
        for episode in cli.load_episodes(episodes):
            for perturbation in cli.build_perturbations(episode):
                result = {"episode_id": episode.get("id"), **perturbation, **mock_policy.score(episode, perturbation)}
                results.append(result)
                if emit_trials:
                    trial_events.append({"event": "probe_trial", **result})
        metrics = importlib.import_module("vla_robustness_kit.metrics")
        report = importlib.import_module("vla_robustness_kit.report")
        payload = {"status": "ok", "results": results, "summary": metrics.summarize(results), "markdown": report.render_markdown(results)}
        if emit_trials:
            payload["_trial_events"] = trial_events
        return payload

    def _run_byo_policy(self, episodes: str | Path, policy: str, emit_trials: bool = False) -> dict[str, Any]:
        _ensure_local_oss_paths()
        cli = importlib.import_module("vla_robustness_kit.cli")
        command = _policy_command(policy)
        results: list[dict[str, Any]] = []
        trial_events: list[dict[str, Any]] = []
        for episode in cli.load_episodes(episodes):
            for perturbation in cli.build_perturbations(episode):
                policy_payload = _call_policy_adapter(command, episode, perturbation)
                result = {"episode_id": episode.get("id"), **perturbation, **policy_payload}
                result.setdefault("passed", bool(policy_payload.get("passed", False)))
                result.setdefault("confidence", float(policy_payload.get("confidence", 0.0)))
                result.setdefault("cluster", "none" if result["passed"] else f"{perturbation['family']}_{perturbation['variant']}")
                results.append(result)
                if emit_trials:
                    trial_events.append({"event": "probe_trial", **result})
        metrics = importlib.import_module("vla_robustness_kit.metrics")
        report = importlib.import_module("vla_robustness_kit.report")
        payload = {
            "status": "ok",
            "policy": "byo",
            "policy_command": command,
            "results": results,
            "summary": metrics.summarize(results),
            "markdown": report.render_markdown(results),
        }
        if emit_trials:
            payload["_trial_events"] = trial_events
        return payload


class EmbodimentCardGenerator:
    def generate(self, metadata: dict[str, Any]) -> dict[str, Any]:
        card = {
            "name": metadata.get("name") or metadata.get("dataset_name") or "Robotics Studio Dataset",
            "robot": metadata.get("robot") or {"type": metadata.get("robot_type", "unknown"), "morphology": metadata.get("morphology", "unspecified")},
            "sensors": metadata.get("sensors") or [],
            "action_space": metadata.get("action_space") or {"type": metadata.get("action_type", "unknown"), "dimensions": metadata.get("action_dimensions", 0)},
            "coordinate_frames": metadata.get("coordinate_frames") or [{"name": metadata.get("coordinate_frame", "base_link"), "parent": "world", "description": "Auto-generated from dataset metadata"}],
            "control_rate_hz": metadata.get("control_rate_hz") or metadata.get("fps") or 0,
            "teleop_method": metadata.get("teleop_method", "unspecified"),
            "environment": metadata.get("environment") or {"workspace": "unspecified"},
            "safety_boundaries": metadata.get("safety_boundaries") or ["Review dataset limitations before real-robot use."],
            "limitations": metadata.get("limitations") or ["Auto-generated card; reviewer should verify before publication."],
        }
        return card

    def render_markdown(self, card: dict[str, Any], hf_readme: bool = False) -> str:
        _ensure_local_oss_paths()
        module = importlib.import_module("embodiment_card.hf_readme" if hf_readme else "embodiment_card.render")
        return module.render_hf_readme(card) if hf_readme else module.render_markdown(card)


class ReviewKitValidator:
    def validate_episode(self, episode: dict[str, Any]) -> list[str]:
        _ensure_local_oss_paths()
        try:
            module = importlib.import_module("robotics_reviewkit.episode")
            module.validate_episode_metadata(episode)
            return []
        except Exception as exc:
            return [str(exc)]


class FailureGalleryExporter:
    def build_case(
        self,
        case_id: str,
        title: str,
        summary: str,
        expected_label: str,
        command: str,
        source_episode_ids: list[str],
    ) -> dict[str, Any]:
        return {
            "id": case_id,
            "title": title,
            "domain": "robotics",
            "summary": summary,
            "expected_findings": [expected_label],
            "reproduce": {"command": command},
            "source": {"episode_ids": source_episode_ids, "redaction": "metadata-only"},
            "tools": ["Robotics Studio Open", "robostudio-engine"],
        }

    def write_case(self, case: dict[str, Any], gallery_root: str | Path) -> Path:
        out_dir = Path(gallery_root) / "cases" / str(case["id"])
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / "case.json"
        out.write_text(json.dumps(case, indent=2, sort_keys=True) + "\n", encoding="utf8")
        return out

    def render_preview(self, cases_root: str | Path, out: str | Path) -> Path:
        _ensure_local_oss_paths()
        cli = importlib.import_module("failure_gallery.render")
        validate = importlib.import_module("failure_gallery.validate")
        errors = validate.validate_cases(cases_root)
        if errors:
            raise ValueError("; ".join(errors))
        output = Path(out)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(cli.render_index(validate.load_cases(cases_root)), encoding="utf8")
        return output


def _policy_command(policy: str) -> list[str]:
    path = Path(policy)
    if path.exists() and path.suffix == ".json":
        payload = json.loads(path.read_text(encoding="utf8"))
        command = payload.get("command")
        if isinstance(command, list) and all(isinstance(item, str) for item in command):
            return command
        raise ValueError("BYO policy JSON must contain a string-array `command`.")
    if path.exists():
        return [str(path)]
    raise FileNotFoundError(f"BYO policy adapter not found: {policy}")


def _call_policy_adapter(command: list[str], episode: dict[str, Any], perturbation: dict[str, Any]) -> dict[str, Any]:
    result = subprocess.run(
        command,
        input=json.dumps({"episode": episode, "perturbation": perturbation}),
        text=True,
        capture_output=True,
        check=False,
        timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"BYO policy adapter failed: {result.stderr.strip()}")
    try:
        payload = _loads_bounded_json(result.stdout, "BYO policy adapter")
    except json.JSONDecodeError as exc:
        raise RuntimeError("BYO policy adapter must write a JSON object to stdout.") from exc
    if not isinstance(payload, dict):
        raise RuntimeError("BYO policy adapter must return a JSON object.")
    return payload


def _loads_bounded_json(stdout: str, label: str) -> Any:
    if len(stdout.encode("utf8")) > MAX_SIDECAR_STDOUT_BYTES:
        raise RuntimeError(f"{label} stdout exceeded {MAX_SIDECAR_STDOUT_BYTES} bytes")
    return json.loads(stdout)

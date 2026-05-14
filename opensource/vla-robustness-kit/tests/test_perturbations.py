from vla_robustness_kit.cli import build_perturbations


def test_perturbation_families_are_present():
    episode = {
        "instruction": "pick up the red block",
        "metadata": {"control_rate_hz": 30, "coordinate_frame": "base_link"},
        "phases": ["approach", "grasp", "verify"],
    }
    families = {item["family"] for item in build_perturbations(episode)}
    assert {"language", "vision", "metadata", "task_phase"} <= families


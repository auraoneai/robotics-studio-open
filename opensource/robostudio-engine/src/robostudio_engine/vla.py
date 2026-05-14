from __future__ import annotations

from .adapters import load_dataset


def run_vla_probe(dataset_path: str, policy: str = "mock") -> dict:
    dataset = load_dataset(dataset_path)
    probes = []
    for episode in dataset.episodes:
        perturbations = ["language", "vision", "metadata", "task_phase", "embodiment"]
        robustness = 1.0
        if episode.failure_modes:
            robustness -= 0.18
        if episode.interventions:
            robustness -= 0.12
        if any(sensor.dropped_frames for sensor in episode.sensors):
            robustness -= 0.08
        probes.append(
            {
                "episode_id": episode.episode_id,
                "policy": policy,
                "perturbations": perturbations,
                "robustness_score": round(max(0.0, robustness), 3),
                "runner": "mock-policy" if policy == "mock" else "byo-policy-adapter",
            }
        )
    return {"dataset": str(dataset.path), "policy": policy, "probes": probes}

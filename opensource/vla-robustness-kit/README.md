# vla-robustness-kit

Used inside **Robotics Studio Open** as the VLA robustness probe runner.

`vla-robustness-kit` generates lightweight robustness diagnostics for
vision-language-action policies. It perturbs task instructions, camera and
lighting metadata, embodiment metadata, and task phase order, then reports
failure clusters and follow-up data collection recommendations.

The default runner uses a deterministic mock policy. No simulator, GPU, or real
robot is required for local tests.

These reports are diagnostics, not robot safety claims.

## Quick start

```bash
python -m pip install -e .
vla-robustness-kit run examples/mock_episode_set --policy mock --out report.md
```

## Output

The report includes:

- Perturbation family pass rates.
- Failure clusters.
- Recommendations for additional data collection.
- A clear diagnostic-only warning.

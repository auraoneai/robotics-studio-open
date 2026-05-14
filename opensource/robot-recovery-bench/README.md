# robot-recovery-bench

Used inside **Robotics Studio Open** as the intervention and recovery subsystem.

`robot-recovery-bench` validates and summarizes human intervention and recovery segments in robot episodes. It helps robotics teams understand whether recovery data is reviewable and training-ready without sharing private videos.

This is a HIL/recovery data-quality diagnostic, not a robot safety benchmark.

## Quickstart

```bash
python -m venv .venv
. .venv/bin/activate
pip install robot-recovery-bench
robot-recovery-bench validate examples/mock_recovery_segments.jsonl
robot-recovery-bench report examples/mock_recovery_segments.jsonl --out report.md
```

## Metrics

- intervention rate;
- recovery success rate;
- time-to-intervention;
- average recovery duration;
- repeated failure clusters by reason;
- incomplete segment count.

All bundled examples are mock/tutorial data.

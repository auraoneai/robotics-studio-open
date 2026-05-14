# embodiment-card

Used inside **Robotics Studio Open** as the embodiment card generator.

`embodiment-card` validates and renders structured cards for robot datasets and
VLA model releases. Cards capture robot morphology, sensors, cameras, action
space, coordinate frames, control frequency, teleoperation method, environment
assumptions, safety boundaries, and known dataset limitations.

## Quick start

```bash
python -m pip install -e .
embodiment-card validate examples/mock_so101_card.json
embodiment-card render examples/mock_so101_card.json --out card.md
```

The Markdown renderer can be pasted into Hugging Face dataset or model READMEs.
This standard complements `lerobot-quality-gates`, `robot-recovery-bench`, and
`vla-robustness-kit`.

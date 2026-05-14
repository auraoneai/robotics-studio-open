# lerobot-quality-gates

Used inside **Robotics Studio Open** as the dataset quality gate runner.

`lerobot-quality-gates` checks whether a LeRobot-style robotics dataset is ready for training, review, or publication. It focuses on boring but expensive data issues: missing metadata, inconsistent episode boundaries, timestamp drift, broken camera/video references, action/state shape mismatches, missing intervention labels, and weak dataset-card documentation.

The default checks work on local mock LeRobot v3-style folders and do not download full robot datasets.

## Quickstart

```bash
python -m venv .venv
. .venv/bin/activate
pip install lerobot-quality-gates
lerobot-quality-gates check examples/mock_lerobot_v3_good --out report.md
lerobot-quality-gates check examples/mock_lerobot_v3_bad --format json --fail-on medium
lerobot-quality-gates check --hf-repo owner/dataset-name --format hf-card --out QA.md
```

`--hf-repo` fetches only lightweight repository files such as `README.md`, `meta/info.json`, and `meta/episodes.json`; it does not download videos or full robot data shards.

## What It Checks

- `meta/info.json` exists and declares fps, features, splits, robot type, and total episodes;
- episode records have ids, tasks, frame counts, timestamp ranges, and data/video references;
- timestamps are monotonic and match frame counts;
- action/state shapes match declared features;
- camera features have corresponding video files;
- intervention/recovery labels are present when the dataset claims HIL/recovery data;
- README or dataset card clearly labels mock/tutorial data and documents limitations;
- optional badge JSON can be generated for docs or static hosting.

## What This Is Not

This is not a robot safety certification, benchmark leaderboard, or claim that a dataset is expert-reviewed. It is a deterministic data-quality gate that helps robotics teams find review gaps before training.

All bundled examples are mock/tutorial datasets.

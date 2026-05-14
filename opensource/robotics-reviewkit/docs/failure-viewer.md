# Failure Viewer

Part of AuraOne Robotics ReviewKit. Examples are mock/synthetic metadata and are not real reviewed robotics datasets or training data. This artifact supports review and QA, not data collection claims.

The static viewer in `viewer/reviewkit.html` renders a local teleop review episode with timeline segments, intervention markers, failure annotations, sensor QA flags, and reviewer notes.

## Run Locally

From the repository root:

```bash
python -m http.server 8765 --directory opensource/robotics-reviewkit
```

Open `http://127.0.0.1:8765/viewer/reviewkit.html`.

The viewer loads `examples/teleop_review_mock_episode.json` by default and can load another local Teleop Review Schema JSON file through the file picker. It does not upload data or call external services.

## What It Shows

- episode summary and training-readiness state
- synthetic/mock disclosure
- timeline segments scaled to episode duration
- failure and intervention markers
- sensor inventory and QA flags
- reviewer and operator notes

## Limitations

This is a local inspection demo, not a full labeling tool. It does not play robot video, detect failures, validate privacy, or export training data. Broken JSON or malformed episode structure produces a visible error instead of silently rendering partial data.

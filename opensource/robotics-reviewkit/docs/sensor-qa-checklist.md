# Sensor QA Checklist

Part of AuraOne Robotics ReviewKit. Examples are mock/synthetic metadata and are not real reviewed robotics datasets or training data. This artifact supports review and QA, not data collection claims.

The machine-readable checklist lives at `schema/taxonomy/sensor_qa_flags.yaml`. It helps reviewers decide whether an episode is usable, needs review, or should be rejected before training/export.

## Checklist Areas

- camera desync
- missing frames
- dropped action tokens
- stale or missing calibration
- critical occlusion
- nonmonotonic timestamps
- missing reset state
- unlabeled interventions
- ambiguous task success labels
- missing environment metadata

## Manual QA Versus Automated Validation

The checklist is a review tool. The validators confirm that flag IDs are known and structurally valid. They do not automatically detect dropped frames, unsafe motion, privacy risks, or calibration correctness.

## Recommended Actions

- `usable`: issue is documented and does not block the current review purpose
- `needs_review`: human review or adjudication is required before export or training use
- `reject`: episode should not be used without repair or recollection

## Example

See `examples/sensor_qa_example.json` and the `sensor_qa` section of `examples/teleop_review_mock_episode.json`.

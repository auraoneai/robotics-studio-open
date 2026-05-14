# Teleop Review Schema

Part of AuraOne Robotics ReviewKit. Examples are mock/synthetic metadata and are not real reviewed robotics datasets or training data. This artifact supports review and QA, not data collection claims.

`schema/teleop_episode.schema.json` defines reviewed teleoperation episode metadata. It is a review/QA sidecar, not a raw robotics data format and not a collection protocol.

## Required Layers

- Episode identity: `schema_version`, `data_status`, `episode_id`
- Task metadata: task ID, variant, instruction, environment, reset state, success label
- Embodiment metadata: generic robot kind, hardware profile, end effectors, mobility
- Timing: monotonic episode start/end and segment start/end
- Sensors: modality, frame rate, sync group, calibration status
- Segments: action intervals such as approach, grasp, manipulate, recover, reset
- Interventions: ontology IDs, timing, trigger, operator action, training relevance
- Failures: taxonomy IDs, timing, segment link, severity, reviewer note
- Sensor QA: QA flags, affected sensor IDs, recommended action
- Review: reviewer role, notes, review stage
- Training readiness: ready, needs review, exclude, or not for training
- Privacy: people/private-place indicators and review state

## Validation

The JSON Schema validates required fields, ID shapes, enum values, and basic numeric ranges. `tests/validate_reviewkit.py` adds deterministic cross-reference checks for segment IDs, taxonomy IDs, intervention ontology IDs, sensor QA flag IDs, sensor IDs, and task IDs.

## Example

Use `examples/teleop_review_mock_episode.json` for the full schema fixture. It intentionally has `data_status: synthetic_mock` and `training_readiness.state: not_for_training`.

## Compatibility Notes

LeRobot, RLDS, and OpenX exporters should treat ReviewKit fields as review metadata. Do not flatten away interventions, failure annotations, or QA flags when converting raw action/observation streams.

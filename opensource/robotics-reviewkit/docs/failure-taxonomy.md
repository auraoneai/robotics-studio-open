# Failure Taxonomy

Part of AuraOne Robotics ReviewKit. Examples are mock/synthetic metadata and are not real reviewed robotics datasets or training data. This artifact supports review and QA, not data collection claims.

The machine-readable taxonomy lives at `schema/taxonomy/failure_modes.yaml`. It covers perception, grasp, contact-rich manipulation, occlusion, recovery, force control, sequencing, object state, human interaction, environment reset, sensor desync, and teleoperator intervention.

## How To Use

1. Review raw episode evidence and the task definition.
2. Mark action segments in the teleop schema.
3. Add failure annotations using `failure_annotations[].taxonomy_id`.
4. Link a failure to an intervention when an operator correction changes the episode.
5. Add sensor QA flags separately when evidence is incomplete or unreliable.

## Annotation Guidance

Prefer the narrowest failure ID that explains the review decision. Use `FAIL_SENSOR_DESYNC_TASK_IMPACT` only when desync changes task interpretation; otherwise use a sensor QA flag. Use `FAIL_TELEOP_INTERVENTION_UNLABELED` when human input is visible but the intervention has not been categorized.

## Versioning

IDs are stable. Deprecate rather than rename IDs. Add task-specific IDs only when a generic category cannot support consistent review.

## Examples

`examples/failure_taxonomy_example.json` shows a small synthetic snippet. `examples/teleop_review_mock_episode.json` shows full schema usage.

# LeRobot Dataset Adapter

Exports mock Teleop Review Schema metadata to a LeRobot-style metadata bridge. It does not generate full tensor/video training data.

This is PRD 42's runnable skeleton. It is intentionally limited to reviewed metadata so teams can inspect how teleop review decisions map toward LeRobot-like dataset organization without implying that the output is trainable.

All bundled examples are synthetic tutorial data. They are not expert-authored, not human-validated, not customer data, and not benchmark or certification artifacts.

## Output Files

The writer creates:

- `manifest.json`: full metadata bridge payload.
- `meta/info.json`: dataset-level metadata.
- `meta/tasks.jsonl`: task index rows.
- `episodes/<episode_id>.json`: per-episode reviewed metadata.

The episode JSON preserves task labels, embodiment metadata when present, sensor names or sensor QA names, segments, interventions, failure modes, reviewer notes, and training-readiness state.

## Metadata Only

The fields named `observations` and `actions` are explicit placeholders. The exporter does not write LeRobot parquet shards, tensors, camera frames, video files, proprioception arrays, or action arrays.

## Quickstart

Intended EvalKit namespace:

```bash
evalkit robotics export-lerobot opensource/robotics-reviewkit/examples/lerobot_export/mock_teleop_episode.json /tmp/auraone-lerobot-metadata
```

Until the umbrella command is wired, run the local script:

```bash
python opensource/robotics-reviewkit/cli/export_lerobot.py \
  opensource/robotics-reviewkit/examples/lerobot_export/mock_teleop_episode.json \
  /tmp/auraone-lerobot-metadata
```

## Supported Input Subset

Required fields:

- `episode_id` or `id`
- `task` as a string or object with `id`, `task_id`, and optional `name`

Optional fields:

- `embodiment` as a string or object with `id` and optional `name`
- `training_readiness` as a string or object with `state`; defaults to `needs_review` for older mock fixtures
- `duration_seconds` or `duration_s`
- `sensors`
- `segments`
- `interventions`
- `failure_modes`
- `sensor_qa`
- `review`
- `schema_version`

Segment time ranges are validated when `start_seconds`/`end_seconds` or `start_s`/`end_s` are present.

## Compatibility Notes

The directory names mirror common LeRobot concepts such as `meta`, `tasks`, and `episodes`, but this remains JSON metadata only. A production LeRobot dataset would still need synchronized observation tensors, action tensors, media assets where applicable, and format-specific dataset writing.

Related references:

- `docs/opensource/PRD/35-teleop-review-schema.md`
- `docs/opensource/PRD/42-lerobot-dataset-adapter.md`
- `opensource.md`
- `https://auraone.ai/open`

# RLDS / OpenX Export Tool

Exports mock Teleop Review Schema metadata to an RLDS/OpenX-style JSON structure. Full training dataset generation requires real observations, actions, tensors, and media and is out of scope for this mock launch.

This is PRD 43's runnable skeleton. It preserves reviewed teleop metadata in structures that resemble RLDS episodes and OpenX manifests, while making the metadata-only limitation explicit in every output.

All bundled examples are synthetic tutorial data. They are not expert-authored, not human-validated, not customer data, and not benchmark or certification artifacts.

## RLDS-Style Output

The RLDS-style writer creates:

- `manifest.json`: full metadata bridge payload.
- `dataset_info.json`: dataset-level metadata.
- `episodes/<episode_id>.json`: per-episode metadata with placeholder steps derived from reviewed segments.

Each placeholder step includes `is_first`, `is_last`, `is_terminal`, `observation.placeholder`, and `action.placeholder`. Segment metadata is preserved so review decisions can be inspected deterministically.

## OpenX-Style Output

The OpenX-style writer creates:

- `manifest.json`
- `openx_manifest.json`
- `episodes/<episode_id>.openx.json`

The manifest includes task, embodiment, sensor names, review metadata, split assignment, and explicit `null` asset references for observations, actions, and videos.

## Quickstart

Intended EvalKit namespace:

```bash
evalkit robotics export-rlds opensource/robotics-reviewkit/examples/rlds_export/mock_teleop_episode.json /tmp/auraone-rlds-metadata
evalkit robotics export-rlds --format openx opensource/robotics-reviewkit/examples/rlds_export/mock_teleop_episode.json /tmp/auraone-openx-metadata
```

Until the umbrella command is wired, run the local script:

```bash
python opensource/robotics-reviewkit/cli/export_rlds.py \
  --format both \
  opensource/robotics-reviewkit/examples/rlds_export/mock_teleop_episode.json \
  /tmp/auraone-rlds-openx-metadata
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

## Limitations

This exporter intentionally stops at metadata JSON. Full RLDS/OpenX generation would require real robot observations, action streams, timestamps, synchronized sensor payloads, reward/discount semantics where applicable, asset storage, and format-specific dataset builders.

Related references:

- `docs/opensource/PRD/35-teleop-review-schema.md`
- `docs/opensource/PRD/43-rlds-openx-export-tool.md`
- `opensource/robotics-reviewkit/docs/lerobot-adapter.md`
- `opensource.md`
- `https://auraone.ai/open`

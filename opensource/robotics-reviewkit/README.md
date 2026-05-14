# AuraOne Robotics ReviewKit — schema layer for Robotics Studio Open

Robotics ReviewKit is an open schema, mock examples, viewer, and metadata-export toolkit for reviewed teleop and robotics episodes. It focuses on review and QA: failure modes, intervention boundaries, sensor QA, task metadata, and export bridges.

Used inside **Robotics Studio Open** as the review schema, taxonomy, validator, and export bridge layer while remaining a standalone schema-and-CLI toolkit.

All bundled robotics examples are mock/synthetic metadata. They are not real robot clips, not real reviewed robotics datasets, not expert-authored benchmarks, and not training data.

This folder is separate from AuraOne hosted SDKs and services. It does not require an AuraOne API key, tenant, database, robot, private reviewer pool, or real robot clips. If CLI commands are added in a package later, they should live under the standalone `evalkit` namespace rather than the hosted `aura` CLI.

## Scope

- Teleop Review Schema: `schema/teleop_episode.schema.json`
- Robotics failure taxonomy: `schema/taxonomy/failure_modes.yaml`
- Sensor QA checklist flags: `schema/taxonomy/sensor_qa_flags.yaml`
- Intervention ontology: `schema/taxonomy/intervention_ontology.yaml`
- Teleop task library: `schema/tasks/teleop_tasks.yaml`
- PRD compatibility aliases: `taxonomy/*.yaml` and `tasks/teleop_tasks.yaml`
- Full schema mock fixture: `examples/teleop_review_mock_episode.json`
- Local static ReviewKit viewer: `viewer/reviewkit.html`
- Focused ReviewKit validators/tests: `src/validate_teleop.py`, `tests/validate_reviewkit.py`,
  `tests/test_reviewkit_assets.py`, `tests/test_lerobot_export.py`, `tests/test_rlds_export.py`,
  and `tests/viewer_smoke.py`

## Quickstart

Run Worker 5 schema/taxonomy/viewer validation:

```bash
python -m pytest opensource/robotics-reviewkit/tests/test_reviewkit_assets.py
python -m pytest opensource/robotics-reviewkit/tests/test_prd_compatibility_paths.py
python opensource/robotics-reviewkit/tests/validate_reviewkit.py opensource/robotics-reviewkit/examples/teleop_review_mock_episode.json
python opensource/robotics-reviewkit/src/validate_teleop.py opensource/robotics-reviewkit/examples/teleop_review_mock_episode.json
python opensource/robotics-reviewkit/tests/viewer_smoke.py
cd opensource/robotics-reviewkit/viewer/reviewkit-v2 && npm install --no-audit --no-fund --no-package-lock && npm run build && npm test
```

Run exporter bridge commands where the exporter files are present:

```bash
python opensource/robotics-reviewkit/cli/validate_episode.py opensource/robotics-reviewkit/examples/mock_episode.json
python opensource/robotics-reviewkit/cli/export_lerobot.py opensource/robotics-reviewkit/examples/mock_episode.json /tmp/lerobot.json
python opensource/robotics-reviewkit/cli/export_rlds.py opensource/robotics-reviewkit/examples/mock_episode.json /tmp/rlds.json
```

Open the local review viewer:

```bash
python -m http.server 8765 --directory opensource/robotics-reviewkit
```

Then visit `http://127.0.0.1:8765/viewer/reviewkit.html`. The existing `viewer/index.html` remains a minimal mock metadata page.

## Review Versus Collection

Data collection records raw observations, actions, and environment state. ReviewKit focuses on review and QA metadata layered after or alongside collection: segment boundaries, intervention labels, failure annotations, sensor QA flags, reviewer notes, privacy review, and training-readiness decisions.

An episode can be collected successfully and still fail review because it lacks action boundaries, has unlabeled interventions, hides final object state, or misses reset evidence.

## Documentation Index

- [Failure taxonomy](docs/failure-taxonomy.md)
- [Teleop review schema](docs/teleop-review-schema.md)
- [Robotics dataset card template](docs/robotics-dataset-card-template.md)
- [Sensor QA checklist](docs/sensor-qa-checklist.md)
- [Failure viewer](docs/failure-viewer.md)
- [Intervention ontology](docs/intervention-ontology.md)
- [Teleop task library](docs/teleop-task-library.md)
- [Robotics data failure modes](docs/robotics-data-failure-modes.md)

## Robotics ReviewKit v2

The v2 extension adds VLA episode review schemas, event-stream labels, dexterity/manipulation/navigation/tool-use anchors, intervention-density analyzers, LeRobot v2 metadata export, streaming RLDS JSONL export, and a buildable React viewer at `viewer/reviewkit-v2/`. All v2 examples are synthetic mock metadata.

- [VLA rubric anchors](docs/vla-rubric-anchors.md)
- [Event stream review](docs/event-stream-review.md)
- Synthetic v2 episode: `examples/vla_synthetic_episode_v2.json`

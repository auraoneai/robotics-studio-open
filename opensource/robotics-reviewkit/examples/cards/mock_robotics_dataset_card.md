# Mock Robotics Dataset Card

> Synthetic/tutorial disclosure: this card describes a mock ReviewKit fixture only. It is not an expert-authored dataset, not human-validated, not a benchmark, and not suitable for model training.

## Dataset Summary

- Name: `auraone/robotics-reviewkit-mock-v0.1`
- Status: mock/tutorial fixture
- Intended use: schema, QA, and local viewer demonstration
- Non-goal: claiming real-world robot performance, collection coverage, or training utility

## Embodiment

- Kind: generic single-arm tabletop manipulator
- End effector: parallel gripper
- Mobility: fixed base
- Hardware specificity: intentionally hardware-agnostic

## Sensors

- `cam_overhead`: mock RGB metadata, 30 Hz
- `cam_wrist`: mock RGBD metadata, 30 Hz
- `joint_state`: mock joint-state metadata, 100 Hz
- `action_tokens`: mock action-token metadata, 20 Hz

The repository does not ship real videos, private spaces, people, or customer robotics traces.

## Task And Environment

- Task: `TASK_PLACE_CUP`
- Environment: synthetic tabletop target zone
- Reset state: cup starts left of a clear target zone
- Success label: partial success in the mock episode, intentionally requiring review

## Operators And Teleop Setup

- Operator identity: none; synthetic notes only
- Teleop interface: unspecified mock interface
- Intervention ontology: `INT_OBJECT_REORIENTATION`

## Annotation Layers

- Segments: approach, grasp, transport, recovery, release
- Failure taxonomy IDs: `FAIL_GRASP_UNSTABLE`, `FAIL_OBJECT_STATE_MISMATCH`
- Sensor QA flags: `SQA_CALIBRATION_STALE`, `SQA_SUCCESS_LABEL_AMBIGUOUS`
- Training readiness: `not_for_training`, `tutorial_only`

## Safety And Privacy

- People present: false
- Private places: false
- Privacy review: not required for bundled mock data
- Real robotics datasets should add explicit privacy review for homes, workplaces, faces, voices, bystanders, and location metadata before publication.

## Train/Test Split

No train/test split is provided. This card is for a single synthetic mock fixture and should not be used as a dataset split template without adding real provenance and review evidence.

## Known Biases And Gaps

- Single tabletop task only.
- No real robot dynamics, camera artifacts, operator variability, or hardware failures.
- QA labels are illustrative and deterministic.

## License And Citation

Use the repository license for the template and mock metadata. Do not cite this fixture as a robotics benchmark or validated dataset.

## Publishability Checklist

- [x] Synthetic/mock disclosure appears at the top.
- [x] No real people, private locations, or customer data are included.
- [x] Training utility is explicitly disclaimed.
- [x] Review metadata is separated from collection metadata.
- [ ] Real-data provenance, consent, and privacy review are documented.
- [ ] Real reviewer qualifications and adjudication process are documented.
- [ ] Real sensor calibration and sync evidence are attached.

# Robotics Data Failure Modes Catalog

Robotics data programs often fail at review, not only at collection. Raw videos can look plentiful while still missing the structure needed for training, evaluation, debugging, or procurement decisions.

## Catalog

| Failure | Symptoms | Impact | Detection | Mitigation | ReviewKit Asset |
| --- | --- | --- | --- | --- | --- |
| Raw video without action boundaries | Long clips with no segment IDs | Hard to align actions, observations, and labels | Check for `segments` coverage | Add teleop schema segments | Teleop Review Schema |
| Success labels without failure reason | Binary labels but no taxonomy IDs | Failures cannot be mined or repaired | Compare failures to non-success labels | Add failure annotations | Failure Taxonomy |
| Missing reset state | First frame does not prove initial layout | Episodes contaminate splits and outcomes | Check reset metadata and first frames | Require reset IDs and reset evidence | Sensor QA Checklist |
| Sensor desync | Camera/action/joint streams disagree | Contact and intervention timing become unreliable | Inspect timestamps and shared motion events | Flag desync and repair before export | Sensor QA Checklist |
| Unlabeled interventions | Sudden corrections with no operator label | Autonomous and teleop behavior are mixed | Review trajectory discontinuities | Add intervention ontology IDs | Intervention Ontology |
| Embodiment mismatch | Dataset mixes hardware assumptions silently | Policies learn incompatible action semantics | Inspect embodiment metadata | Add hardware profile and mobility fields | Teleop Review Schema |
| Missing environment metadata | Surface, lighting, obstacle, or prop variant absent | Generalization claims are not reviewable | Compare task requirements to episode fields | Add environment IDs and task variants | Teleop Task Library |
| Operator skill ambiguity | Operator notes and review role absent | Cannot separate task difficulty from operator behavior | Check review and operator notes | Add reviewer/operator notes and interventions | Teleop Review Schema |
| Unsafe/non-repeatable collection | Handoffs, proximity, or force issues undocumented | Safety and privacy review cannot proceed | Inspect human interaction and force-control failures | Add safety notes, privacy review, and critical flags | Failure Taxonomy |
| Object final state ambiguity | Final frame or label conflicts with visible state | Supervision labels are unreliable | Review final segment and success criteria | Add object-state failure and QA flag | Failure Taxonomy |
| Occluded contact evidence | Critical grasp/contact hidden | Cannot judge task or recovery quality | Inspect sensor coverage by segment | Add occlusion failures and sensor flags | Sensor QA Checklist |
| Export flattens review metadata | Sidecar labels lost in conversion | Downstream tools train on unreviewed traces | Compare exporter output to schema | Preserve sidecar tables in LeRobot/RLDS/OpenX adapters | Future exporters |

## Executive Summary

More collection is not enough if episodes cannot be reviewed. A usable robotics data program needs explicit task definitions, segment boundaries, intervention labels, sensor QA, failure taxonomy IDs, privacy review, and training-readiness decisions.

## Public Preview Excerpt

Private robotics datasets can stay private, but the review structure around them should be inspectable. Robotics ReviewKit provides mock, local standards for reviewing teleop episodes without publishing customer data or claiming benchmark status.

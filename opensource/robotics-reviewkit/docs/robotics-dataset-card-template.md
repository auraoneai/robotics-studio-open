# Robotics Dataset Card Template

Part of AuraOne Robotics ReviewKit. Examples are mock/synthetic metadata and are not real reviewed robotics datasets or training data. This artifact supports review and QA, not data collection claims.

Use this template before publishing robotics review datasets or mock fixtures. The top of the card must disclose whether data is synthetic, mock, tutorial, permissioned real, or otherwise restricted.

## Required Sections

1. Dataset summary and status
2. Intended use and non-goals
3. Embodiment
4. Sensors and calibration/sync evidence
5. Task and environment definitions
6. Operators and teleop setup
7. Annotation layers and reviewer process
8. Failure taxonomy and intervention ontology coverage
9. Sensor QA procedure and known flags
10. Safety and privacy review
11. Train/test split and leakage controls
12. Known biases, gaps, and unsupported uses
13. License and citation
14. Publishability checklist

## Disclosure Language

For mock data:

> This card describes synthetic/mock tutorial metadata only. It is not expert-authored, not human-validated, not a benchmark, and not suitable for model training.

For real data, replace that statement with provenance, consent, privacy review, reviewer qualifications, adjudication process, and release limits.

## Integration Notes

The generic Dataset Card Generator from the EvalKit roadmap can emit the general sections. Robotics ReviewKit adds embodiment, sensors, teleop setup, interventions, sensor QA, reset state, and training-readiness sections.

## Example

See `examples/cards/mock_robotics_dataset_card.md`.

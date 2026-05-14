# SO-101 Kitchen Synthetic Fixture

Date: 2026-05-13

## Purpose

This fixture gives Robotics Studio Open a deterministic first-run and smoke-test
dataset. It is intentionally small and metadata-only so tests can exercise
adapter, indexing, sensor QA, failure clustering, embodiment card, VLA probe, and
export flows without shipping real robot clips.

## Provenance

- Author: AuraOne Robotics Open Source Flagship squad.
- Source: hand-authored synthetic metadata rows in `episodes.jsonl` and
  `meta.json`.
- Media: none. Paths such as `front_rgb/so101-0001.mp4` are schema examples, not
  bundled files.
- People, homes, workplaces, customer sites, and partner robot telemetry: none.
- Third-party demonstrations, Hugging Face datasets, ROS bags, or LeRobot
  captures: none.

## License

The fixture is distributed under the same MIT terms as Robotics Studio Open.
`MIT-synthetic` in `meta.json` means the rows are synthetic test metadata and do
not carry separate robot-data rights from a hardware lab, customer, partner, or
public dataset.

## Shipped Files

- `README.md`: fixture summary.
- `DATASET_CARD.md`: license and provenance audit.
- `meta.json`: synthetic dataset metadata.
- `episodes.jsonl`: three synthetic episode records.

## Release Checklist

- No raw video or images are bundled.
- No private reviewer notes are bundled.
- No PII, customer identifiers, local file paths, or secrets are bundled.
- No third-party dataset license is required for the fixture as shipped.

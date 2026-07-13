# SO-101 Kitchen Synthetic Fixture

Date: 2026-05-13

## Purpose

This repository-owned fixture provides deterministic first-run evidence and
regression coverage without shipping real robot media.

## Composition

- 96 generated synthetic episode metadata variants.
- Three documented seed scenes in `seeds.json`: pick apple, place cup, and open
  drawer.
- 30 Hz control and episode frame rate.
- 30 Hz front RGB metadata.
- 30 Hz wrist RGB metadata.
- 15 Hz depth metadata.
- 120 Hz joint-state metadata.
- 1 Hz language metadata.

`scripts/generate_sample_fixture.mjs` deterministically produces `meta.json`,
`manifest.json`, and `episodes.jsonl`. `pnpm fixture:verify` byte-compares the
generated output with the shipped files.

## Provenance

- Author: AuraOne.
- Source: three hand-authored synthetic seed scenes and deterministic generated
  variants.
- Media: none.
- People, homes, workplaces, customers, partners, and real robot telemetry:
  none.
- Third-party demonstrations and public dataset records: none.

## Shipped Files

- `seeds.json`
- `meta.json`
- `manifest.json`
- `episodes.jsonl`
- `README.md`
- `DATASET_CARD.md`

## License

The fixture is distributed under MIT with Robotics Studio Open.

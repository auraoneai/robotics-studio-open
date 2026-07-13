# Source-Build Intake

Robotics Studio Open does not ship binary dataset adapters in the current
source build.

## Supported Inputs

- A JSON object with an `episodes` array.
- A JSON array of episode objects.
- A single JSON episode object.
- A JSONL file with one episode object per non-empty line.

Every episode requires a non-empty `id` or `episode_id`. The parser accepts
known aliases for fields such as `duration_s`, `frame_rate_hz`,
`language_instruction`, and `failure_cluster`. Only values present in the input
are treated as evidence. Missing values remain unknown.

## Unsupported Inputs

Parquet, HDF5, ROS bag, DB3, MP4, and other binary inputs are rejected with:

```text
Binary adapter unavailable in this source build; no episode evidence parsed.
Export JSON or JSONL episode metadata and import that file instead.
```

Selecting binary files alongside supported metadata does not make those binary
files evidence. Their names are recorded only as ignored source-build
limitations.

## Provenance

Imported records are labeled `Imported local manifest`. They never inherit
fixture labels, fixture QA values, synthetic seed identifiers, or generated
episode fields.

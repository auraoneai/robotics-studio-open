# Security Review Checklist

Date: 2026-05-13

## Shared Platform Inheritance

Robotics Studio Open inherits the Open Studio Platform contracts for Tauri CSP,
allowlist, updater, keychain, crash reporting, telemetry, intake packets,
signing, notarization, and install scripts.

## Robotics-Specific Review Items

- [ ] PyO3 embedded Python boundary cannot access arbitrary filesystem paths
  outside selected dataset roots and configured cache directories.
- [ ] Python sidecar subprocesses use bounded timeouts, cancellation, stdout
  size limits, and structured JSON parsing.
- [ ] ROS bag parser fuzzing covers malformed rosbag1 files and rosbag2 sqlite
  databases.
- [ ] Video decoder fuzzing covers malformed mp4/h264/h265/av1 inputs and
  thumbnail worker cancellation.
- [ ] Adapter path traversal checks cover LeRobot, RLDS, OpenX, HDF5, ROS bag,
  and folder-of-mp4-jsonl.
- [ ] HF Hub export never includes local absolute paths, hidden files, or
  tokens.
- [ ] AuraOne intake export privacy preview lists every file and redaction rule
  before packaging.
- [ ] Telemetry event registry contains no dataset paths, filenames, labels,
  identifiers, or episode IDs.
- [ ] Crash-report scrubbing removes dataset paths and sidecar command args.
- [ ] Install script verifies checksums before install and does not execute
  downloaded content before verification.

## Required Evidence

- External security report.
- `pip-audit` report for Python dependencies.
- Rust audit report for desktop crates.
- SBOM (`sbom.cdx.json`) and license report.
- Secret scan report.
- Fuzz corpus location and latest run artifact.

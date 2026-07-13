# Changelog

## 0.2.0 - 2026-07-13

### Changed

- Migrated Robotics Studio Open to the light-first AuraOne Proofline shell.
- Replaced the fixed dark three-column interface with collapsed navigation,
  a responsive inspector drawer, and a credible narrow browser layout.
- Made episode review, synchronized media, events, decisions, QA, failure
  clusters, and generated evidence artifacts the primary workflow.
- Moved VLA Probe and Settings into a separate tools group.
- Added ordered table alternatives for timeline and cluster visualizations.
- Added explicit local-only, network, telemetry, and updater states.
- Kept dark contrast bounded to media inspection surfaces.
- Reworked first run around local input, data boundaries, review, and local
  evidence export without requiring an AuraOne account.
- Removed remote font allowances and reduced the supported desktop minimum to
  980 by 720 after adding responsive drawers.
- Removed the duplicate Babel-based static prototype so Vite and Tauri now
  ship the same typed React application from every entry point.
- Added production-browser checks for 320, 390, 768, and wide layouts,
  keyboard-operated drawers, focus restoration, reduced motion, and forced
  colors.
- Staged signed updater artifact generation and release metadata for 0.2.0.

### Distribution

- Canonical macOS artifact:
  `Robotics.Studio.Open_0.2.0_aarch64.dmg`.
- Windows, AppImage, deb, and rpm artifacts remain release-workflow outputs.
- Checksums, signatures, notarization, package-manager updates, and publication
  status must be recorded only after the corresponding artifacts exist.

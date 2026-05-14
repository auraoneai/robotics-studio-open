# Robotics Studio Open

Robotics Studio Open is the local-first desktop IDE for reviewed teleop and VLA
datasets. The release-ops scaffold in this directory prepares the public OSS
repository for GA without shipping placeholder product behavior.

Current release status is tracked in
`docs/release/release-readiness-2026-05-13.md`.

## Source Layout

- `opensource/robotics-studio`: Vite/React web shell plus Tauri desktop shell.
- `opensource/robostudio-engine`: Python dataset adapters, indexing, QA,
  clustering, exports, and the `robostudio` CLI.
- `opensource/open-studio-platform/packages`: local shared UI and platform
  contracts used by the Studio source build.

## Build From Source

```bash
pnpm install
pnpm --dir opensource/robotics-studio build
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 \
PYTHONPATH=opensource/robostudio-engine/src:opensource/robotics-reviewkit/src:opensource/lerobot-quality-gates/src:opensource/robot-recovery-bench/src:opensource/vla-robustness-kit/src:opensource/embodiment-card/src:opensource/failure-gallery/src \
  python -m pytest -q opensource/robostudio-engine/tests
python -m build opensource/robostudio-engine
```

## Distribution

- macOS: signed and notarized DMG, Homebrew Cask `robotics-studio-open`.
- Linux: AppImage, `.deb`, `.rpm`, and detached signatures.
- Windows: best-effort MSI under package identity `AuraOne.RoboticsStudioOpen`.
- CLI: `robostudio` ships with the desktop installers.

The installer endpoint is reserved as:

```bash
curl -fsSL https://install.auraone.ai/robotics-studio | bash
```

## Contributor Model

Contributions use DCO sign-off. There is no CLA.

```bash
git commit -s
```

See `CONTRIBUTING.md` for the DCO text, review expectations, and release
gates.

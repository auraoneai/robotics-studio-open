# Clean Install Verification

Date: 2026-05-13

## Available Local Target

Current machine can verify macOS command-line prerequisites and Homebrew cask
syntax. It cannot complete signed DMG install verification because release
artifacts and Apple notarization credentials are not available yet.

## Required Commands

```bash
bash opensource/open-studio-platform/installers/robotics-studio-open/install.sh --dry-run
brew audit --cask --new opensource/open-studio-platform/distribution/homebrew/Casks/robotics-studio-open.rb
```

## Unchecked Targets

| Target | Reason | Exact next action |
|---|---|---|
| macOS Apple Silicon signed DMG | No built/notarized DMG. | Run release workflow with Apple secrets and install on clean Apple Silicon host. |
| macOS Intel signed DMG | No built/notarized DMG. | Run release workflow on macOS x64 and install on clean Intel host. |
| Linux x86_64 AppImage/deb/rpm | No release artifacts. | Run release workflow and verify install in clean Ubuntu container/VM. |
| Linux arm64 AppImage/deb/rpm | No release artifacts. | Run release workflow on arm64 runner and verify install in clean Ubuntu arm64 VM. |
| Windows 11 MSI | No signed MSI or EV cert. | Run release workflow with EV cert and install on clean Windows 11 VM. |
| PyPI `robostudio-engine` | No package/token. | Configure trusted publisher and run `python -m build && twine check dist/*`. |

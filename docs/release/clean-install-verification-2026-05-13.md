# Clean Install Verification

Date: 2026-05-13

## Available Local Target

Current machine can verify the macOS Apple Silicon stable installer path. The
installer downloads the v0.1.0 DMG from GitHub Releases, verifies `SHA256SUMS`,
mounts the DMG, and copies the app bundle into the requested install directory.

## Required Commands

```bash
bash release/install.sh --dry-run
bash release/install.sh --install-dir "$HOME/Applications"
```

## Unchecked Targets

| Target | Reason | Exact next action |
|---|---|---|
| macOS Apple Silicon notarization | Apple notarization credentials are not available in this repo. | Run `scripts/sign-and-notarize-macos.sh` with Apple credentials when notarized distribution is required. |
| Linux x86_64 AppImage/deb/rpm | No release artifacts. | Run release workflow and verify install in clean Ubuntu container/VM. |
| Linux arm64 AppImage/deb/rpm | No release artifacts. | Run release workflow on arm64 runner and verify install in clean Ubuntu arm64 VM. |
| Windows 11 MSI | No signed MSI or EV cert. | Run release workflow with EV cert and install on clean Windows 11 VM. |
| PyPI `robostudio-engine` | No package/token. | Configure trusted publisher and run `python -m build && twine check dist/*`. |

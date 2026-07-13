# Robotics Studio Open Distribution Status

Originally created on May 13, 2026 and updated after the public `0.2.0` release
on **July 13, 2026**.

The original macOS signing, notarization, DNS, and production-browser blockers
are resolved. The remaining blockers are destination-specific channels that
were not verified during the macOS release run.

| Requirement | Current status | Next action |
| --- | --- | --- |
| GitHub repository | Live | Maintain protected `main`, signed tags, DCO, and release evidence. |
| Hosted browser | Live at `robotics-studio.auraone.ai` | Reverify after every production deployment. |
| GitHub Release | Live at `robotics-studio-open-v0.2.0` | Preserve immutable artifact hashes and release notes. |
| macOS Apple silicon DMG | Signed, notarized, stapled, Gatekeeper accepted, and published | Rebuild only for a new version or desktop-runtime change. |
| Homebrew cask | Unpublished | Submit after destination-specific cask audit and clean installation evidence. |
| Windows MSI and Winget | Unpublished | Produce signed packages and verify install, launch, update, and uninstall on Windows. |
| Linux AppImage, deb, and rpm | Unpublished | Build and verify on supported Linux distributions. |
| Automatic updater | Unpublished | Publish only after complete signed cross-platform artifacts and updater manifests exist. |
| PyPI `robostudio-engine` | Existing standalone package | Treat its package release independently from the visual Studio desktop release. |
| Hugging Face sample dataset | Unpublished | Publish only with approved synthetic-data documentation and destination credentials. |

## Published macOS Artifact

```text
Robotics.Studio.Open_0.2.0_aarch64.dmg
SHA-256 b6d08f308c7806df2d67dc34d6d12e9df9f33e135afd61ced1cbb16653f4cf05
```

The browser and macOS release are the supported `0.2.0` user-facing channels.
Do not present staged Windows, Linux, package-manager, or updater metadata as a
published download.

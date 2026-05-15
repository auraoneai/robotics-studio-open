# Release Readiness

Date: 2026-05-13

## Public Preview Release

Update: v0.1.0 is published as a public macOS Apple Silicon preview release.

- Release: `https://github.com/auraoneai/robotics-studio-open/releases/tag/v0.1.0`
- Latest release: `https://github.com/auraoneai/robotics-studio-open/releases/latest`
- DMG: `Robotics.Studio.Open_0.1.0_aarch64.dmg`
- SHA-256: `8d87ef9b986d5eff6b196a2f0016b300495bea1bdaa5526869fc5279c31a0c5c`
- Target commit: `bd6ad17c6167903d5bdaf78626d6dc6d6f07cc05`

The preview DMG was downloaded back from GitHub Releases, verified with
`SHA256SUMS`, mounted, and checked with the packaged startup probe. The stable
installer script now targets the v0.1.0 Apple Silicon DMG; notarization remains
separate Apple Developer release work.

## Completed Setup

- Public GitHub repository reserved: `https://github.com/auraoneai/robotics-studio-open`.
- Local repository release skeleton created with MIT license, DCO contribution
  model, CODEOWNERS, security policy, issue templates, PR template, branch
  protection/settings draft, CI, DCO, release, SBOM, license, accessibility, and
  performance workflows.
- Distribution drafts created in the shared Open Studio Platform for Homebrew,
  winget, install scripts, DNS, PyPI trusted publisher, package verification,
  license policy, SBOM policy, and security review.

## Authenticated Access Check

Local environment check on 2026-05-13:

- `gh auth status`: authenticated as `gchahal1982`; org `auraoneai` visible.
- `GH_TOKEN`, `GITHUB_TOKEN`, `PYPI_API_TOKEN`, `HF_TOKEN`,
  `CLOUDFLARE_API_TOKEN`, `APPLE_ID`, `APPLE_TEAM_ID`,
  `APPLE_APP_SPECIFIC_PASSWORD`, `WINDOWS_EV_CERT_THUMBPRINT`: missing from
  local environment.

No secrets were printed.

## Verification Commands

Run from repository root:

```bash
bash release/install.sh --dry-run
```

## Remaining Blockers

See `docs/release/blockers-2026-05-13.md`.

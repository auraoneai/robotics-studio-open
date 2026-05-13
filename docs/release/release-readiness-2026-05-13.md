# Release Readiness

Date: 2026-05-13

## Completed Setup

- Public GitHub repository reserved: `https://github.com/auraoneai/robotics-studio-open`.
- Initial release-readiness scaffold pushed to `main` at commit `44ce1af`.
- GitHub repository settings, labels, and branch protection applied where the
  authenticated GitHub account had access. Main now requires DCO, matrix CI,
  security/SBOM/license, accessibility/performance, 2 approvals, and CODEOWNERS
  review.
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
- `gh repo create`, `git push`, `gh repo edit`, label creation, and branch
  protection succeeded for `auraoneai/robotics-studio-open`.
- `GH_TOKEN`, `GITHUB_TOKEN`, `PYPI_API_TOKEN`, `HF_TOKEN`,
  `CLOUDFLARE_API_TOKEN`, `APPLE_ID`, `APPLE_TEAM_ID`,
  `APPLE_APP_SPECIFIC_PASSWORD`, `WINDOWS_EV_CERT_THUMBPRINT`: missing from
  local environment.

No secrets were printed.

## Verification Commands

Run from repository root:

```bash
node opensource/open-studio-platform/scripts/verify-robotics-release-ops.mjs
bash opensource/open-studio-platform/installers/robotics-studio-open/install.sh --dry-run
pwsh -File opensource/open-studio-platform/installers/robotics-studio-open/install.ps1 -DryRun
brew audit --cask --new opensource/open-studio-platform/distribution/homebrew/Casks/robotics-studio-open.rb
```

## Remaining Blockers

See `docs/release/blockers-2026-05-13.md`.

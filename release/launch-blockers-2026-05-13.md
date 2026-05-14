# Launch Blockers as of 2026-05-13

These are external or environment-dependent items that cannot be truthfully checked off from this local workspace without authenticated account access, human approval, legal review, or target hardware.

| Requirement | Status | Exact Next Action |
|---|---|---|
| GitHub repo `auraoneai/robotics-studio-open` | Done | Public repo exists with branch protection, DCO, CODEOWNERS, issue labels, and release evidence PR. |
| Homebrew cask `robotics-studio-open` | Blocked on AuraOne tap credentials | Submit cask after first signed release artifact exists. |
| PyPI package `robostudio-engine` | Blocked on PyPI publishing token | Publish package from `opensource/robostudio-engine` after owner approval. |
| `install.auraone.ai/robotics-studio` | Blocked on DNS/CDN admin | Point route to `opensource/open-studio-platform/installers/robotics-studio-open/install.sh` and signed artifact manifest. |
| `robotics-studio.auraone.ai` | Blocked on DNS admin | Add CNAME to website host and verify TLS. |
| Windows identity `AuraOne.RoboticsStudioOpen` | Blocked on EV cert/HSM access | Register identity and run MSI signing workflow. |
| Apple signing identifier `ai.auraone.roboticsstudio` | Blocked on Apple Developer admin | Register identifier and run notarized DMG workflow. |
| HF Hub sample dataset space | Blocked on HF org token | Create `auraoneai/robotics-studio-so101-synthetic` and upload fixture/readme. |
| Trademark/legal/privacy/TOS review | Blocked on human legal review | Review PRD, MIT license, telemetry.md, privacy policy, and intake terms. |
| Design partners, HN post, newsletter, podcasts | Blocked on business launch timing | Schedule launch motion after signed beta artifacts and partner approvals. |
| Mac/Linux/Windows performance baseline | Partially blocked by hardware matrix | Run `ci/performance-baseline.sh` on M2 Pro, Linux x86_64, Windows 11, and GPU runner. |

# Registry Reservations

Date: 2026-05-13

| Registry | Name | Status | Evidence / Exact next action |
|---|---|---|---|
| GitHub | `auraoneai/robotics-studio-open` | Reserved | Created via `gh repo create` on 2026-05-13. |
| Homebrew | Cask `robotics-studio-open` | Drafted | Submit `distribution/homebrew/Casks/robotics-studio-open.rb` to `auraoneai/homebrew-open`. |
| PyPI | `robostudio-engine` | Blocked | No PyPI token/trusted publisher in local env. Configure trusted publisher from `distribution/pypi/robostudio-engine-trusted-publisher.md`. |
| Install URL | `install.auraone.ai/robotics-studio` | Installer ready | Route DNS/CDN to `release/install.sh` or proxy the raw GitHub installer. |
| Subdomain | `robotics-studio.auraone.ai` | Drafted | Apply DNS record draft and verify HTTPS. |
| winget | `AuraOne.RoboticsStudioOpen` | Drafted | Submit manifest after MSI exists and is signed. |
| Apple bundle id | `ai.auraone.roboticsstudio` | Blocked | Requires Apple Developer access. |
| Windows EV identity | `AuraOne.RoboticsStudioOpen` | Drafted | Requires EV cert secret and signed MSI. |
| Hugging Face | `auraoneai/so101-kitchen-sample` | Blocked | Requires HF org token/access and sample dataset license. |

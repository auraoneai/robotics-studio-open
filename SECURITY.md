# Security Policy

Report security issues privately to `security@auraone.ai`.

Do not open public issues for vulnerabilities, credential leaks, signing
issues, update bypasses, telemetry disclosure, intake-packet privacy leaks, ROS
bag parsing issues, video decoder crashes, or PyO3 sandbox escapes.

Include:

- Affected version or commit.
- Component: app shell, updater, keychain, intake packet, telemetry, engine,
  adapter, video decode, ROS bag parser, install script, or package registry.
- Reproduction steps or proof of concept.
- Impact assessment and whether active exploitation is known.

## Response Targets

| Severity | Response target | Patch target |
|---|---:|---:|
| SEV-1 signing/update compromise or active exploit | 24 hours | 7 days |
| SEV-2 exploitable vulnerability without active exploitation | 48 hours | 30 days |
| SEV-3 defense-in-depth or low-likelihood issue | 5 business days | Next planned release |

## Security-Sensitive Surfaces

The following require CODEOWNERS approval from security:

- Code signing and notarization.
- Windows EV signing.
- Signed update manifests and updater public keys.
- Homebrew, winget, PyPI, and install script changes.
- OS keychain storage.
- Telemetry event registry and forbidden-field enforcement.
- Crash-report scrubbing.
- `.auraonepkg` packet creation, redaction, transport, and manifest validation.
- Tauri CSP and allowlist configuration.
- PyO3 embedding, Python sidecar process boundaries, ROS bag parsing, and video
  decoder inputs.

## PGP

Blocker as of 2026-05-13: the Robotics Studio Open public PGP key and
fingerprint are not provisioned. Next action: security owner publishes the
armored public key here and stores the private key in the incident-response
vault.

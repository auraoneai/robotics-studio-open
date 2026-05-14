# Robotics Studio Open Security Review Checklist

- Platform checklist inherited from `docs/prds/open-studio-platform-prd.md`.
- Tauri CSP is inherited from `opensource/open-studio-platform/packages/platform-contracts` and limits renderer network egress to the shared update, intake, telemetry, and crash-reporting endpoints. Hugging Face export runs through the sidecar and does not expand renderer CSP.
- PyO3 is not enabled in the current release; Python engines run as isolated sidecars.
- ROS bag readers are capability-detected and must pass parser fuzzing before GA.
- Video decoder hardware paths must pass malformed-media smoke tests before GA.
- Keychain storage is required for tokens; plaintext config is blocked for production builds.
- `.auraonepkg` export requires local privacy preview before upload.
- Sample SO-101 fixture is synthetic metadata only and contains no private media.

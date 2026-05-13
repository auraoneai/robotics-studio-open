#!/usr/bin/env bash
set -euo pipefail

if [ -f "playwright.config.ts" ] && [ -d "tests/accessibility" ]; then
  pnpm exec playwright test tests/accessibility
else
  mkdir -p reports
  cat > reports/accessibility-blocker-2026-05-13.md <<'EOF'
# Accessibility Verification Blocker

Date: 2026-05-13

The accessibility workflow is configured, but the Robotics Studio Open renderer
and Playwright accessibility specs are not present in this checkout yet.

Next action: once the Agent 3 Tauri renderer lands, add axe-core tests for:

- Keyboard-only navigation through the app shell, grid, scrubber, cluster view,
  export modal, and command palette.
- Screen reader labels for scrubber controls and sensor panels.
- Reduced-motion behavior.
- Light and dark theme contrast.
EOF
fi

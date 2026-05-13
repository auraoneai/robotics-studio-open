#!/usr/bin/env bash
set -euo pipefail

mkdir -p reports

if [ -x "scripts/run-performance-baseline.sh" ]; then
  scripts/run-performance-baseline.sh
else
  cat > reports/performance-blocker-2026-05-13.md <<'EOF'
# Performance Verification Blocker

Date: 2026-05-13

The performance workflow is configured, but the executable baseline harness and
fixture dataset are not present in this checkout yet.

Next action: once Agent 3/4 land the app and engine, add a fixture-backed
baseline for:

- 50k episode LeRobot cold index <= 30 s.
- Warm index <= 1 s.
- Grid scroll 60 fps.
- 3-camera scrub p90 >= 55 fps.
- 5k episode CLIP clustering <= 90 s CPU and <= 20 s GPU.
EOF
fi

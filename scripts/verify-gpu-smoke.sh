#!/usr/bin/env bash
set -euo pipefail

if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "GPU CI requires nvidia-smi on the runner." >&2
  exit 2
fi

nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader

if [ -x "scripts/run-video-decode-smoke.sh" ]; then
  scripts/run-video-decode-smoke.sh
fi

if [ -x "scripts/run-embedding-smoke.sh" ]; then
  scripts/run-embedding-smoke.sh
fi

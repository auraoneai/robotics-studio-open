#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export AURAONE_FLAGSHIP_ID="robotics-studio-open"
export AURAONE_DISPLAY_NAME="Robotics Studio Open"
export AURAONE_GITHUB_REPO="auraoneai/robotics-studio-open"
export AURAONE_BINARY_NAME="robostudio"
export AURAONE_MAC_APP_NAME="Robotics Studio Open.app"
export AURAONE_MAC_ARM64_ONLY="true"
export AURAONE_RELEASE_EVIDENCE_URL="${AURAONE_RELEASE_EVIDENCE_URL:-https://updates.auraone.ai/release-evidence/robotics-studio-open/stable.json}"
exec "$SCRIPT_DIR/shared-install.sh" "$@"

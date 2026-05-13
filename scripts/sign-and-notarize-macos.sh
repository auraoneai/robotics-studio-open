#!/usr/bin/env bash
set -euo pipefail

artifact_dir="${1:-dist}"

: "${APPLE_ID:?APPLE_ID secret is required for notarization}"
: "${APPLE_TEAM_ID:?APPLE_TEAM_ID secret is required for notarization}"
: "${APPLE_APP_SPECIFIC_PASSWORD:?APPLE_APP_SPECIFIC_PASSWORD secret is required for notarization}"

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun is required for macOS notarization." >&2
  exit 2
fi

find "$artifact_dir" -type f \( -name "*.dmg" -o -name "*.zip" \) -print0 | while IFS= read -r -d '' artifact; do
  xcrun notarytool submit "$artifact" \
    --apple-id "$APPLE_ID" \
    --team-id "$APPLE_TEAM_ID" \
    --password "$APPLE_APP_SPECIFIC_PASSWORD" \
    --wait
done

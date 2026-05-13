#!/usr/bin/env bash
set -euo pipefail

artifact_dir="${1:-dist}"

: "${GPG_SIGNING_KEY:?GPG_SIGNING_KEY secret is required for Linux artifact signing}"

find "$artifact_dir" -type f \( -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" -o -name "*.tar.gz" \) -print0 | while IFS= read -r -d '' artifact; do
  gpg --batch --yes --detach-sign --armor "$artifact"
done

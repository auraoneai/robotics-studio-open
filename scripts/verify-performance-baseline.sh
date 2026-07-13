#!/usr/bin/env bash
set -euo pipefail

pnpm build

bundle_bytes="$(
  while IFS= read -r -d '' artifact; do
    wc -c < "$artifact"
  done < <(find dist -type f -print0) |
    awk '{ total += $1 } END { print total + 0 }'
)"
max_bundle_bytes=$((8 * 1024 * 1024))

printf 'Production web bundle: %s bytes (budget: %s bytes)\n' "$bundle_bytes" "$max_bundle_bytes"
test "$bundle_bytes" -le "$max_bundle_bytes"

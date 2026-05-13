#!/usr/bin/env bash
set -euo pipefail

version="${1:?version required}"
target="${2:?target required}"

mkdir -p dist

case "$target" in
  dmg|appimage-deb-rpm|msi)
    ;;
  *)
    echo "Unsupported release target: $target" >&2
    exit 2
    ;;
esac

if [ ! -f "package.json" ] && [ ! -f "src-tauri/tauri.conf.json" ]; then
  cat > "dist/ROBOTICS_STUDIO_OPEN_RELEASE_BLOCKER.txt" <<EOF
Release artifact build blocker
Date: 2026-05-13
Version: ${version}
Target: ${target}

The release-ops pipeline is configured, but product build inputs are not present
in this repository checkout yet. Next action: land the Agent 2/3 Tauri app and
Agent 4 robostudio-engine package, then replace this blocker artifact with real
DMG/AppImage/deb/rpm/MSI outputs.
EOF
  exit 0
fi

pnpm install --frozen-lockfile
pnpm build

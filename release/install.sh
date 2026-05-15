#!/usr/bin/env bash
set -euo pipefail

REPO="auraoneai/robotics-studio-open"
VERSION="${ROBOTICS_STUDIO_VERSION:-v0.1.0}"
ASSET="${ROBOTICS_STUDIO_ASSET:-Robotics.Studio.Open_0.1.0_aarch64.dmg}"
INSTALL_DIR="${INSTALL_DIR:-/Applications}"
DRY_RUN=0
OPEN_AFTER_INSTALL=0

usage() {
  cat <<'EOF'
Robotics Studio Open macOS installer

Usage:
  release/install.sh [--dry-run] [--install-dir PATH] [--open]

Environment:
  ROBOTICS_STUDIO_VERSION   Release tag to install. Default: v0.1.0
  ROBOTICS_STUDIO_ASSET     DMG asset name. Default: Robotics.Studio.Open_0.1.0_aarch64.dmg
  INSTALL_DIR               Install directory. Default: /Applications

This installer supports Apple Silicon macOS builds only.
EOF
}

while (($#)); do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --install-dir)
      INSTALL_DIR="${2:?--install-dir requires a path}"
      shift 2
      ;;
    --open)
      OPEN_AFTER_INSTALL=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

release_base="https://github.com/${REPO}/releases/download/${VERSION}"
dmg_url="${release_base}/${ASSET}"
sha_url="${release_base}/SHA256SUMS"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

run() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'
  if [[ "$DRY_RUN" -eq 0 ]]; then
    "$@"
  fi
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Robotics Studio Open desktop installer currently supports macOS only." >&2
  exit 1
fi

case "$(uname -m)" in
  arm64|aarch64) ;;
  *)
    echo "This release channel publishes Apple Silicon macOS builds only." >&2
    exit 1
    ;;
esac

for command_name in curl shasum hdiutil ditto find; do
  require_command "$command_name"
done

echo "Robotics Studio Open ${VERSION}"
echo "DMG: ${dmg_url}"
echo "SHA256SUMS: ${sha_url}"
echo "Install directory: ${INSTALL_DIR}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run complete. No files were downloaded or installed."
  exit 0
fi

tmp_root="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
work_dir="$(mktemp -d "${tmp_root}/robotics-studio-open.XXXXXX")"
mount_dir="${work_dir}/mount"

cleanup() {
  hdiutil detach "$mount_dir" -quiet >/dev/null 2>&1 || true
  rm -rf "$work_dir"
}
trap cleanup EXIT

mkdir -p "$mount_dir"

run curl -fL --retry 3 --connect-timeout 15 -o "${work_dir}/${ASSET}" "$dmg_url"
run curl -fL --retry 3 --connect-timeout 15 -o "${work_dir}/SHA256SUMS" "$sha_url"

(
  cd "$work_dir"
  run shasum -a 256 -c SHA256SUMS
)

run hdiutil attach "${work_dir}/${ASSET}" -nobrowse -readonly -mountpoint "$mount_dir"

app_source="$(find "$mount_dir" -maxdepth 2 -type d -name "*.app" | head -n 1)"
if [[ -z "$app_source" ]]; then
  echo "No .app bundle found in ${ASSET}." >&2
  exit 1
fi

app_name="$(basename "$app_source")"
target_app="${INSTALL_DIR}/${app_name}"

if [[ ! -d "$INSTALL_DIR" ]]; then
  run mkdir -p "$INSTALL_DIR"
fi

if [[ -e "$target_app" ]]; then
  if [[ -w "$target_app" || -w "$INSTALL_DIR" ]]; then
    run rm -rf "$target_app"
  else
    run sudo rm -rf "$target_app"
  fi
fi

if [[ -w "$INSTALL_DIR" ]]; then
  run ditto "$app_source" "$target_app"
else
  run sudo ditto "$app_source" "$target_app"
fi

echo "Installed ${app_name} to ${target_app}"

if [[ "$OPEN_AFTER_INSTALL" -eq 1 ]]; then
  run open "$target_app"
fi

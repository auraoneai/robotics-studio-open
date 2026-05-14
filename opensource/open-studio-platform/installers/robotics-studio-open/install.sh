#!/usr/bin/env bash
set -euo pipefail

DISPLAY_NAME="Robotics Studio Open"
REPO="auraoneai/robotics-studio-open"
BINARY_NAME="robostudio"
ARTIFACT_PREFIX="Robotics-Studio-Open"
MAC_APP_NAME="Robotics Studio Open.app"
EXPECTED_GPG_FINGERPRINT="${AURAONE_RELEASE_GPG_FINGERPRINT:-BLOCKED-2026-05-13-AURAONE-OPEN-RELEASE-GPG-FINGERPRINT}"
DRY_RUN="false"

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="true"
fi

die() {
  printf '%s installer: %s\n' "$DISPLAY_NAME" "$1" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64 | amd64)
    AURA_ARCH="x64"
    LINUX_ARCH="amd64"
    ;;
  arm64 | aarch64)
    AURA_ARCH="arm64"
    LINUX_ARCH="arm64"
    ;;
  *)
    die "unsupported architecture: $ARCH"
    ;;
esac

case "$OS" in
  darwin) PLATFORM="macos" ;;
  linux) PLATFORM="linux" ;;
  *) die "unsupported operating system for this installer: $OS" ;;
esac

if [[ "$DRY_RUN" == "true" ]]; then
  if [[ "$PLATFORM" == "macos" ]]; then
    ARTIFACT="${ARTIFACT_PREFIX}_<version>_universal.dmg"
    INSTALL_PATH="$HOME/Applications/$MAC_APP_NAME"
  else
    ARTIFACT="robotics-studio-open_<version>_${LINUX_ARCH}.AppImage"
    INSTALL_PATH="$HOME/.local/bin/$BINARY_NAME"
  fi
  printf 'flagship=robotics-studio-open\nplatform=%s\narch=%s\nartifact=%s\ninstall_path=%s\nrepo=%s\n' \
    "$PLATFORM" "$AURA_ARCH" "$ARTIFACT" "$INSTALL_PATH" "$REPO"
  exit 0
fi

need curl
need shasum
need gpg

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

TAG="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
[[ -n "$TAG" ]] || die "could not resolve latest release tag; signed GA artifacts are not published yet"

VERSION="${TAG#v}"
BASE_URL="https://github.com/$REPO/releases/download/$TAG"

if [[ "$PLATFORM" == "macos" ]]; then
  ARTIFACT="${ARTIFACT_PREFIX}_${VERSION}_universal.dmg"
else
  ARTIFACT="robotics-studio-open_${VERSION}_${LINUX_ARCH}.AppImage"
fi

curl -fsSLo "$TMPDIR/$ARTIFACT" "$BASE_URL/$ARTIFACT"
curl -fsSLo "$TMPDIR/SHA256SUMS" "$BASE_URL/SHA256SUMS"
curl -fsSLo "$TMPDIR/SHA256SUMS.asc" "$BASE_URL/SHA256SUMS.asc"

(
  cd "$TMPDIR"
  grep "  $ARTIFACT$" SHA256SUMS | shasum -a 256 -c -
)

gpg --batch --verify "$TMPDIR/SHA256SUMS.asc" "$TMPDIR/SHA256SUMS"
ACTUAL_FINGERPRINT="$(gpg --batch --status-fd 1 --verify "$TMPDIR/SHA256SUMS.asc" "$TMPDIR/SHA256SUMS" 2>/dev/null | awk '/^\[GNUPG:\] VALIDSIG / {print $3; exit}')"
[[ -n "$ACTUAL_FINGERPRINT" ]] || die "could not read release signing fingerprint"

if [[ "$EXPECTED_GPG_FINGERPRINT" != BLOCKED-* && "$ACTUAL_FINGERPRINT" != "$EXPECTED_GPG_FINGERPRINT" ]]; then
  die "release signing fingerprint mismatch: $ACTUAL_FINGERPRINT"
fi

if [[ "$PLATFORM" == "macos" ]]; then
  need hdiutil
  need spctl
  spctl -a -t open --context context:primary-signature -v "$TMPDIR/$ARTIFACT"
  MOUNT_DIR="$TMPDIR/mount"
  mkdir -p "$MOUNT_DIR"
  hdiutil attach "$TMPDIR/$ARTIFACT" -mountpoint "$MOUNT_DIR" -nobrowse -quiet
  trap 'hdiutil detach "$MOUNT_DIR" -quiet >/dev/null 2>&1 || true; rm -rf "$TMPDIR"' EXIT
  mkdir -p "$HOME/Applications"
  cp -R "$MOUNT_DIR/$MAC_APP_NAME" "$HOME/Applications/"
  hdiutil detach "$MOUNT_DIR" -quiet
  printf '%s installed to %s\n' "$DISPLAY_NAME" "$HOME/Applications/$MAC_APP_NAME"
else
  install_dir="$HOME/.local/bin"
  mkdir -p "$install_dir"
  install -m 0755 "$TMPDIR/$ARTIFACT" "$install_dir/$BINARY_NAME"
  printf '%s installed to %s\n' "$DISPLAY_NAME" "$install_dir/$BINARY_NAME"
fi

printf 'Verified SHA256SUMS signature fingerprint: %s\n' "$ACTUAL_FINGERPRINT"
printf 'Docs: https://auraone.ai/open/robotics-studio\n'

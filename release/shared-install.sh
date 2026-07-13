#!/usr/bin/env bash
set -euo pipefail

: "${AURAONE_FLAGSHIP_ID:?AURAONE_FLAGSHIP_ID is required}"
: "${AURAONE_DISPLAY_NAME:?AURAONE_DISPLAY_NAME is required}"
: "${AURAONE_GITHUB_REPO:?AURAONE_GITHUB_REPO is required}"
: "${AURAONE_BINARY_NAME:?AURAONE_BINARY_NAME is required}"
: "${AURAONE_MAC_APP_NAME:?AURAONE_MAC_APP_NAME is required}"
: "${AURAONE_RELEASE_EVIDENCE_URL:?AURAONE_RELEASE_EVIDENCE_URL is required}"

EXPECTED_GPG_FINGERPRINT="${AURAONE_RELEASE_GPG_FINGERPRINT:-F909806D13D9CD4CF403FA3C8C61E177EB6329E7}"
RELEASE_GPG_KEY_URL="${AURAONE_RELEASE_GPG_KEY_URL:-https://updates.auraone.ai/keys/auraone-open.gpg}"
DRY_RUN="false"
MANIFEST_URL="$AURAONE_RELEASE_EVIDENCE_URL"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN="true"; shift ;;
    --manifest) MANIFEST_URL="$2"; shift 2 ;;
    -h|--help)
      printf 'Usage: install.sh [--dry-run] [--manifest https://.../release-evidence.json]\n'
      exit 0
      ;;
    *) printf '%s installer: unknown option: %s\n' "$AURAONE_DISPLAY_NAME" "$1" >&2; exit 2 ;;
  esac
done

die() { printf '%s installer: %s\n' "$AURAONE_DISPLAY_NAME" "$1" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }

ensure_release_gpg_key() {
  [[ "$EXPECTED_GPG_FINGERPRINT" == BLOCKED-* ]] && return 0
  if gpg --batch --fingerprint --with-colons "$EXPECTED_GPG_FINGERPRINT" 2>/dev/null \
    | awk -F: -v expected="$EXPECTED_GPG_FINGERPRINT" '$1 == "fpr" && $10 == expected { found = 1 } END { exit found ? 0 : 1 }'; then
    return 0
  fi

  curl -fsSLo "$TMPDIR/auraone-open.gpg" "$RELEASE_GPG_KEY_URL"
  gpg --batch --show-keys --with-colons "$TMPDIR/auraone-open.gpg" 2>/dev/null \
    | awk -F: -v expected="$EXPECTED_GPG_FINGERPRINT" '$1 == "fpr" && $10 == expected { found = 1 } END { exit found ? 0 : 1 }' \
    || die "release signing key fingerprint mismatch"
  gpg --batch --import "$TMPDIR/auraone-open.gpg" >/dev/null 2>&1 \
    || die "could not import AuraOne Open release signing key"
}

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) AURA_ARCH="x64"; LINUX_ARCH="amd64" ;;
  arm64|aarch64) AURA_ARCH="arm64"; LINUX_ARCH="arm64" ;;
  *) die "unsupported architecture: $ARCH" ;;
esac

case "$OS" in
  darwin) PLATFORM="macos" ;;
  linux) PLATFORM="linux" ;;
  *) die "unsupported operating system for this installer: $OS" ;;
esac

if [[ "$PLATFORM" == "macos" && "${AURAONE_MAC_ARM64_ONLY:-false}" == "true" ]]; then
  [[ "$ARCH" == "arm64" || "$ARCH" == "aarch64" ]] || die "this release channel publishes Apple Silicon macOS builds only"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  [[ "$PLATFORM" == "macos" ]] \
    && INSTALL_PATH="$HOME/Applications/$AURAONE_MAC_APP_NAME" \
    || INSTALL_PATH="$HOME/.local/bin/$AURAONE_BINARY_NAME"
  printf 'flagship=%s\nplatform=%s\narch=%s\nmanifest=%s\ninstall_path=%s\nrepo=%s\n' \
    "$AURAONE_FLAGSHIP_ID" "$PLATFORM" "$AURA_ARCH" "$MANIFEST_URL" "$INSTALL_PATH" "$AURAONE_GITHUB_REPO"
  exit 0
fi

need curl
need shasum
need python3

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

curl -fsSLo "$TMPDIR/release-evidence.json" "$MANIFEST_URL"
MANIFEST_VALUES="$(python3 - "$TMPDIR/release-evidence.json" "$AURAONE_FLAGSHIP_ID" "$PLATFORM" "$AURA_ARCH" <<'PY'
import json
import shlex
import sys

manifest_path, product_id, platform, arch = sys.argv[1:]
with open(manifest_path, encoding="utf-8") as handle:
    manifest = json.load(handle)
if manifest.get("product", {}).get("id") != product_id:
    raise SystemExit("release evidence product does not match installer")
acceptable = {"verified", "released"}
arch_aliases = {
    "x64": {"x64", "amd64", "x86_64"},
    "arm64": {"arm64", "aarch64"},
}
candidates = [
    artifact
    for artifact in manifest.get("artifacts", [])
    if artifact.get("platform") == platform
    and artifact.get("architecture") in arch_aliases.get(arch, {arch})
    and ((platform == "macos" and artifact.get("type") == "dmg")
         or (platform == "linux" and artifact.get("type") == "appimage"))
]
if len(candidates) != 1:
    raise SystemExit(f"release evidence has {len(candidates)} matching install artifacts")
artifact = candidates[0]
if artifact.get("status") not in acceptable:
    blockers = "; ".join(artifact.get("blockers", [])) or "no verified release evidence"
    raise SystemExit(f"artifact is {artifact.get('status')}: {blockers}")
for key in ("name", "url", "sha256"):
    if not artifact.get(key):
        raise SystemExit(f"verified artifact is missing {key}")
values = {
    "ARTIFACT": artifact["name"],
    "ARTIFACT_URL": artifact["url"],
    "EXPECTED_SHA256": artifact["sha256"],
    "SIGNATURE_URL": artifact.get("signing", {}).get("gpgSignatureUrl") or "",
}
for key, value in values.items():
    print(f"{key}={shlex.quote(str(value))}")
PY
)" || die "release evidence does not contain an installable artifact"
eval "$MANIFEST_VALUES"

curl -fsSLo "$TMPDIR/$ARTIFACT" "$ARTIFACT_URL"
ACTUAL_SHA256="$(shasum -a 256 "$TMPDIR/$ARTIFACT" | awk '{print $1}')"
[[ "$ACTUAL_SHA256" == "$EXPECTED_SHA256" ]] || die "artifact SHA-256 does not match release evidence"

if [[ -n "$SIGNATURE_URL" ]] && curl -fsSLo "$TMPDIR/SHA256SUMS.asc" "$SIGNATURE_URL"; then
  need gpg
  ensure_release_gpg_key
  curl -fsSLo "$TMPDIR/SHA256SUMS" "${SIGNATURE_URL%.asc}"
  grep "  $ARTIFACT$" "$TMPDIR/SHA256SUMS" | grep -q "^$EXPECTED_SHA256  " \
    || die "signed checksum file does not contain the release-evidence digest"
  gpg --batch --verify "$TMPDIR/SHA256SUMS.asc" "$TMPDIR/SHA256SUMS"
  ACTUAL_FINGERPRINT="$(gpg --batch --status-fd 1 --verify "$TMPDIR/SHA256SUMS.asc" "$TMPDIR/SHA256SUMS" 2>/dev/null | awk '/^\[GNUPG:\] VALIDSIG / {print $3; exit}')"
  [[ -n "$ACTUAL_FINGERPRINT" ]] || die "could not read release signing fingerprint"
  if [[ "$EXPECTED_GPG_FINGERPRINT" != BLOCKED-* && "$ACTUAL_FINGERPRINT" != "$EXPECTED_GPG_FINGERPRINT" ]]; then
    die "release signing fingerprint mismatch: $ACTUAL_FINGERPRINT"
  fi
else
  ACTUAL_FINGERPRINT="not-provided"
fi

if [[ "$PLATFORM" == "macos" ]]; then
  need hdiutil
  if [[ "${AURAONE_SKIP_MAC_GATEKEEPER:-false}" != "true" ]]; then
    need spctl
    spctl -a -t open --context context:primary-signature -v "$TMPDIR/$ARTIFACT"
  fi
  MOUNT_DIR="$TMPDIR/mount"
  mkdir -p "$MOUNT_DIR"
  hdiutil attach "$TMPDIR/$ARTIFACT" -mountpoint "$MOUNT_DIR" -nobrowse -quiet
  trap 'hdiutil detach "$MOUNT_DIR" -quiet >/dev/null 2>&1 || true; rm -rf "$TMPDIR"' EXIT
  mkdir -p "$HOME/Applications"
  cp -R "$MOUNT_DIR/$AURAONE_MAC_APP_NAME" "$HOME/Applications/"
  hdiutil detach "$MOUNT_DIR" -quiet
  printf '%s installed to %s\n' "$AURAONE_DISPLAY_NAME" "$HOME/Applications/$AURAONE_MAC_APP_NAME"
else
  install_dir="$HOME/.local/bin"
  mkdir -p "$install_dir"
  install -m 0755 "$TMPDIR/$ARTIFACT" "$install_dir/$AURAONE_BINARY_NAME"
  printf '%s installed to %s\n' "$AURAONE_DISPLAY_NAME" "$install_dir/$AURAONE_BINARY_NAME"
fi

printf 'Verified artifact SHA-256. Verified SHA256SUMS signature fingerprint: %s\n' "$ACTUAL_FINGERPRINT"
printf 'Docs: https://auraone.ai/open/%s/docs/install\n' "$AURAONE_FLAGSHIP_ID"

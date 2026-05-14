#!/usr/bin/env bash
set -euo pipefail

offline=0
if [[ "${1:-}" == "--offline" ]]; then
  offline=1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
platform_dir="${repo_root}/opensource/open-studio-platform"

require_file() {
  [[ -f "$1" ]] || {
    printf 'missing required file: %s\n' "$1" >&2
    exit 1
  }
}

require_contains() {
  local file="$1"
  local pattern="$2"
  if ! grep -Eq "$pattern" "$file"; then
    printf 'required pattern not found in %s: %s\n' "$file" "$pattern" >&2
    exit 1
  fi
}

require_file "${platform_dir}/distribution/homebrew/Casks/rubric-studio-open.rb"
require_file "${platform_dir}/distribution/winget/AuraOne.RubricStudioOpen/0.1.0/AuraOne.RubricStudioOpen.yaml"
require_file "${platform_dir}/distribution/winget/AuraOne.RubricStudioOpen/0.1.0/AuraOne.RubricStudioOpen.installer.yaml"
require_file "${platform_dir}/installers/rubric-studio-open/install.sh"
require_file "${platform_dir}/registries/pypi/rubric-studio/pyproject.toml"
require_file "${platform_dir}/registries/npm/rubric-studio/package.json"
require_file "${platform_dir}/registries/vscode/rubric-studio/package.json"

require_contains "${platform_dir}/distribution/homebrew/Casks/rubric-studio-open.rb" 'cask "rubric-studio-open"'
require_contains "${platform_dir}/distribution/winget/AuraOne.RubricStudioOpen/0.1.0/AuraOne.RubricStudioOpen.installer.yaml" 'PackageIdentifier: AuraOne\.RubricStudioOpen'
require_contains "${platform_dir}/registries/pypi/rubric-studio/pyproject.toml" 'name = "rubric-studio"'
require_contains "${platform_dir}/registries/npm/rubric-studio/package.json" '"name": "@auraone/rubric-studio"'
require_contains "${platform_dir}/registries/vscode/rubric-studio/package.json" '"publisher": "auraone"'

bash "${platform_dir}/installers/rubric-studio-open/install.sh" --dry-run >/tmp/rubric-studio-open-install-dry-run.txt
require_contains /tmp/rubric-studio-open-install-dry-run.txt 'flagship=rubric-studio-open'
require_contains /tmp/rubric-studio-open-install-dry-run.txt 'repo=auraoneai/rubric-studio-open'

if [[ "$offline" != "1" ]]; then
  if command -v brew >/dev/null 2>&1; then
    brew audit --cask --new "${platform_dir}/distribution/homebrew/Casks/rubric-studio-open.rb"
  fi
  if command -v wingetvalidate >/dev/null 2>&1; then
    wingetvalidate "${platform_dir}/distribution/winget/AuraOne.RubricStudioOpen/0.1.0"
  fi
fi

printf 'Rubric Studio Open install path manifests verified\n'

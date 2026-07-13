#!/usr/bin/env bash
set -euo pipefail

pnpm test
pnpm test:browser

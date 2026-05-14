#!/usr/bin/env bash
set -euo pipefail

DATASET="${1:-opensource/robotics-studio/fixtures/sample-so101}"

echo "Robotics Studio Open performance baseline"
echo "dataset=$DATASET"
START="$(date +%s)"
PYTHONPATH=opensource/robostudio-engine/src python -m robostudio_engine.cli index "$DATASET" >/tmp/robotics-studio-index.log
END="$(date +%s)"
echo "index_seconds=$((END - START))"
PYTHONPATH=opensource/robostudio-engine/src python -m robostudio_engine.cli smoke "$DATASET"

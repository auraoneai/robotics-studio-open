# robostudio-engine

Used inside Robotics Studio Open.

`robostudio-engine` is the headless Python engine for Robotics Studio Open. It provides dataset adapters, streaming SQLite indexing, thumbnail generation, hardware decode discovery hooks, sensor QA, failure clustering, subsystem wrappers around the six AuraOne robotics OSS libraries, and CLI export parity for CI and remote Linux review jobs.

## What ships

- Dataset adapters: LeRobot v3/v2, RLDS, OpenX, HDF5 profiles for ALOHA/ACT/RoboMimic/generic, rosbag2 sqlite with rosbag1 legacy fallback, and folder-of-mp4-jsonl.
- `EpisodeAdapter` contract with lazy `EpisodeHandle` and `StreamHandle` primitives.
- Sidecar SQLite index at `<dataset>/.robostudio/index.sqlite` with saved view support.
- Lazy thumbnail worker pool at `<dataset>/.robostudio/thumbs/`, using hardware decode when `ffmpeg` exposes VideoToolbox, VAAPI, NVDEC/CUDA, or DXVA2 and SVG placeholders otherwise.
- Sensor QA for dropped frames, calibration drift, AV sync, joint-state continuity, timestamp monotonicity, and sample-rate stability.
- Failure clustering with privacy-preserving hash, CLIP text embeddings plus HDBSCAN when installed with `robostudio-engine[ml]`, and a custom encoder executable protocol.
- Wrappers for `lerobot-quality-gates`, `robot-recovery-bench`, `vla-robustness-kit`, `embodiment-card`, `robotics-reviewkit`, and `failure-gallery`.
- Local disk, Hugging Face Hub, AuraOne intake packet, and failure-gallery contribution exports.

## CLI

```bash
robostudio inspect examples/mock_multi_format/lerobot_v3
robostudio index examples/mock_multi_format/lerobot_v3 --json-lines
robostudio qa examples/mock_multi_format/lerobot_v3 --format markdown --out /tmp/qa.md
robostudio cluster examples/mock_multi_format/lerobot_v3 --min-cluster-size 1 --out /tmp/clusters.json
robostudio probe ../vla-robustness-kit/examples/mock_episode_set --policy mock --stream
robostudio probe ../vla-robustness-kit/examples/mock_episode_set --policy ./policy_adapter.py --stream
robostudio export examples/mock_multi_format/lerobot_v3 --to manifest --out /tmp/robostudio-export
robostudio export examples/mock_multi_format/lerobot_v3 --to hf-hub --repo owner/name --out /tmp/hf-prep
```

HF Hub upload is attempted only when `huggingface_hub` is installed and `HF_TOKEN` or `HUGGINGFACE_TOKEN` is set. Otherwise the command writes a release-ready prepared directory plus a dated blocker note.

BYO VLA policies are executable adapters. Robotics Studio sends one JSON object on stdin with `episode` and `perturbation`; the adapter returns JSON with `passed`, `confidence`, and optional `cluster`.

## Python API

```python
from robostudio_engine import (
    QualityGateRunner,
    RecoveryAnalyzer,
    VLAProbeRunner,
    EmbodimentCardGenerator,
    ReviewKitValidator,
    FailureGalleryExporter,
    build_streaming_index,
)

stats = build_streaming_index("examples/mock_multi_format/lerobot_v3")
quality = QualityGateRunner().run("examples/mock_multi_format/lerobot_v3")
probe = VLAProbeRunner().run("../vla-robustness-kit/examples/mock_episode_set")
```

## Release blockers when credentials are unavailable

```bash
robostudio release-blockers --out dist/RELEASE_BLOCKERS.md
```

The blocker file records auth-gated steps for PyPI publish, HF Hub sample dataset upload, and failure-gallery PR opening.

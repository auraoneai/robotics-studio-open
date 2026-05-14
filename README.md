# Robotics Studio Open

Robotics Studio Open is AuraOne's local-first IDE for reviewed teleop and VLA datasets.

It is the integrated home for the AuraOne robotics OSS stack:

- `lerobot-quality-gates`
- `robot-recovery-bench`
- `vla-robustness-kit`
- `embodiment-card`
- `robotics-reviewkit`
- `failure-gallery`

The standalone packages remain importable and runnable. Robotics Studio Open gives the daily review workflow a desktop surface.

## What It Does

- Opens LeRobot v3/v2, RLDS, OpenX, HDF5, ROS bag, and folder-of-mp4-jsonl datasets.
- Builds a streaming SQLite sidecar index at `.robostudio/index.sqlite`.
- Scrubs RGB, depth, joint state, force/torque, audio, and language streams in sync.
- Tags action phases, interventions, failures, sensor anomalies, and review decisions.
- Clusters repeated failures with CLIP, hash, or custom encoders.
- Runs VLA robustness probes through `vla-robustness-kit`.
- Generates embodiment cards and sensor QA reports.
- Exports reviewed subsets to Hugging Face Hub, local disk, failure-gallery, or AuraOne Robotics Programs intake.

## Commercial Boundary

Robotics Studio Open is MIT licensed, local-first, and single-user. It does not include hosted dataset storage, shared reviewer queues, approval workflows, audit ledgers, RBAC, SSO, or managed reviewer pools. Those belong to Robotics Studio Cloud, Robotics Studio Enterprise, and AuraOne Robotics Programs.

## Run From Source

```bash
pnpm install
pnpm smoke
pnpm dev
```

`pnpm smoke` builds the vendored Open Studio Platform contracts, type-checks
the app, runs the product smoke tests, and produces the same static Vite
artifact served by the hosted preview.

The hosted preview is:

```text
https://robotics-studio.auraone.ai/
```

Signed installers and public distribution channels remain gated by the release
blockers tracked in `docs/release/blockers-2026-05-13.md`.

## Docs

- Website route: `https://auraone.ai/open/robotics-studio`
- Hosted preview: `https://robotics-studio.auraone.ai/`
- Quickstart: `docs/quickstart.md`
- Adapter docs: `docs/adapters.md`
- VLA guide: `docs/vla-probe.md`
- Clustering guide: `docs/failure-clustering.md`
- Hugging Face export: `docs/hf-export.md`
- AuraOne intake: `docs/intake.md`
- Architecture: `docs/architecture.md`
- Release readiness: `docs/release/release-readiness-2026-05-13.md`

## Example CLI

```bash
robostudio inspect /path/to/lerobot_dataset
robostudio cluster /path/to/dataset --embedding clip --min-cluster-size 5
robostudio probe /path/to/vla_episode_set --policy mock --out probe.md
robostudio export /path/to/dataset --to hf-hub --repo owner/name --out ./hf-prep
robostudio export /path/to/dataset --to intake --out ./programs-intake.auraonepkg
robostudio qa /path/to/dataset --out qa.md
robostudio card /path/to/dataset --out CARD.md
```

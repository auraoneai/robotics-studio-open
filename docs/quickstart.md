# Quickstart

## Choose A Surface

- Browser preview: <https://robotics-studio.auraone.ai/>
- macOS preview DMG: <https://github.com/auraoneai/robotics-studio-open/releases/latest>
- AuraOne download redirect: <https://auraone.ai/open/robotics-studio/download>
- Source checkout: <https://github.com/auraoneai/robotics-studio-open>

The browser preview is for inspection and walkthroughs. Use the desktop app when
you need local dataset access, video decode, sensor QA, or export manifests.

## Verify The Preview DMG

Download `Robotics.Studio.Open_0.1.0_aarch64.dmg` and `SHA256SUMS` from the
release page, then run:

```bash
shasum -a 256 -c SHA256SUMS
```

Expected SHA-256 for v0.1.0:

```text
8d87ef9b986d5eff6b196a2f0016b300495bea1bdaa5526869fc5279c31a0c5c
```

The preview build is not the signed/notarized stable installer. If macOS warns
that the app is from an unidentified developer, right-click the app and choose
Open.

## First Review

1. Open Robotics Studio Open.
2. Choose a LeRobot, RLDS, OpenX, HDF5, ROS bag, or folder-of-mp4-jsonl dataset.
3. Wait for the streaming index to complete.
4. Filter the virtualized grid with `success=false AND failure_modes:*`.
5. Scrub the episode timeline, toggle sensor panels, tag interventions, add anomaly notes, and assign failure taxonomy labels.
6. Run Sensor QA, Failure Clustering, VLA Probe, and Embodiment Card.
7. Export a reviewed subset to local disk, Hugging Face Hub, or AuraOne intake packet.

The bundled `fixtures/sample-so101` dataset is synthetic metadata for a first-run tour.

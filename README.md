# Robotics Studio Open

Robotics Studio Open is AuraOne's MIT-licensed, local source-build cockpit for
reviewing robot episode metadata and producing checksummed evidence artifacts.
The application is an evidence-first React interface with an optional Tauri
shell. The current source build does not connect a native robotics engine.

It is built for robotics dataset curators, teleoperation QA teams, VLA
researchers, and reviewers who need to inspect declared episode evidence
without implying that unsupported media or adapters were decoded. Its
differentiator is explicit provenance and unknown-state handling: the UI only
reports values present in JSON/JSONL metadata and produces deterministic local
artifacts from that evidence.

## Visual Workflow

![Robotics Studio Open synchronized episode review with the synthetic sensor scene, timeline, health selectors, annotations, and decision controls](https://www.auraone.ai/open/robotics-studio/screenshot-overview.webp)

The selected proof image matches the single product view used by the public
website route. Capture provenance is recorded in the
[AuraFoundry release evidence](https://github.com/gchahal1982/AuraFoundry/blob/main/docs/evidence/final-makeover/assets/open-source-capture-provenance.json).

## Implemented Behavior

- Opens browser-selected JSON manifests and JSONL episode records.
- Rejects Parquet, HDF5, ROS bag, DB3, MP4, and other binary dataset inputs with
  an actionable source-build adapter error. No episode records are fabricated.
- Tracks repository fixture and imported-manifest provenance separately.
- Preserves missing imported values as unknown.
- Reviews declared RGB, depth, sensor, phase, intervention, anomaly, taxonomy,
  outcome, and readiness fields.
- Plays episodes with a declared duration and clamps at the episode boundary.
- Groups explicit failure fields deterministically and supports reversible
  split, merge, and undo operations.
- Computes sensor QA summaries only from declared sensor rates and QA values.
- Runs one to four deterministic local mock VLA trials.
- Downloads deterministic probe and QA reports.
- Creates a real local ZIP archive containing the selected manifest,
  intervention records, embodiment card, QA report, failure gallery, and
  SHA-256 checksums as applicable.
- Shows Hugging Face Hub and AuraOne Programs as unavailable network
  destinations. This build does not authenticate, upload, or imply delivery.

## Bundled Fixture

`fixtures/sample-so101` contains 96 deterministic synthetic metadata variants
generated from three documented seed scenes. The fixture declares a 30 Hz
control rate, 30 Hz front and wrist RGB streams, 15 Hz depth, 120 Hz joint
state, and 1 Hz language metadata. It contains no real robot media or
third-party demonstrations.

Verify or regenerate it with:

```bash
pnpm fixture:verify
pnpm fixture:generate
```

## Run From Source

### Hosted Browser

Open [robotics-studio.auraone.ai](https://robotics-studio.auraone.ai) to review
the bundled synthetic fixture or browser-selected JSON/JSONL metadata.

### Public Desktop Release

Download the signed and notarized macOS Apple silicon DMG from
[Robotics Studio Open 0.2.0](https://github.com/auraoneai/robotics-studio-open/releases/tag/v0.2.0).
Verify the downloaded artifact before opening it:

```bash
shasum -a 256 Robotics.Studio.Open_0.2.0_aarch64.dmg
# b6d08f308c7806df2d67dc34d6d12e9df9f33e135afd61ced1cbb16653f4cf05
```

Homebrew is not a verified `0.2.0` distribution channel. Use the GitHub Release
or hosted browser for the current release.

### JavaScript Companion

Install the dependency-free dataset-manifest validator and release metadata
API:

```bash
npm install @auraone/robotics-studio@0.2.0
npx @auraone/robotics-studio validate ./manifest.json
```

The npm package does not bundle the visual application, robot media, native
adapters, or robotics engines.

### Source Checkout

```bash
git clone https://github.com/auraoneai/robotics-studio-open.git
cd robotics-studio-open
pnpm install
pnpm dev
```

The development server listens on `http://127.0.0.1:5173`.
Use Node.js `20.19.5` or newer. This `0.2.0` repository includes the exact
shared AuraOne Open Studio source packages and native keychain crate needed by
the application, so a fresh clone runs without a sibling monorepo checkout.

Product page:
[auraone.ai/open/robotics-studio](https://auraone.ai/open/robotics-studio).

No root-app CLI or native robotics engine is shipped by the current `0.2.0`
visual application.

## Proof And Validation

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:browser
pnpm rust:test
pnpm capture:evidence
pnpm test:capture-evidence
```

The browser suite covers responsive geometry, focus containment and
restoration, native Space activation, playback, local intake, clustering,
downloads, ZIP contents, mobile target sizes, and WCAG 2.2 AA checks. Capture
evidence preserves its original local-render provenance. Public availability is
established separately by the pushed release commit, GitHub Release asset,
checksum, notarization record, and production browser deployment.

## Runtime, Data, And Network Boundary

- Imported JSON/JSONL metadata and generated review state remain in browser
  memory. The browser stores only local presentation preferences such as sensor
  visibility; no dataset database is created.
- Diagnostic event previews are not telemetry delivery and are never sent.
- Local export produces a browser-downloaded ZIP with the selected metadata
  artifacts and SHA-256 checksums. It does not sign the archive.
- Hugging Face Hub and AuraOne Programs are visible as unavailable destinations.
  This source build has no authentication or upload adapter and does not send
  dataset content to either service.
- The optional Tauri shell does not establish a network or native-engine
  capability. Version `0.2.0` has no published automatic update channel.
- Documentation and release links may navigate to public sites, but dataset
  records are not attached to those requests.

## Font Boundary

The public source, web build, npm metadata, and desktop source archive contain
no private licensed font binary. Proofline renders with system sans-serif and
monospace fallbacks. An authorized branded deployment may provide licensed
typography only through a host-owned stylesheet on an approved same-origin
path; if it is absent or blocked, the public system fallback remains supported.
Local capture tooling may use an isolated temporary loopback font boundary, but
those binaries are never copied into source packages or release artifacts.

## Source-Build Boundaries

- Archive signing is unavailable; no signing key is generated or stored.
- Version `0.2.0` is available through the hosted browser and verified macOS
  DMG. `@auraone/robotics-studio@0.2.0` provides the separate JavaScript
  dataset-manifest validator and release metadata companion.
- The optional Tauri package is shell scaffolding, not evidence of a connected
  binary adapter, updater publication, signed installer, or native engine.
- No CLI is shipped by this package.

## Release Truth

Status verified on **July 13, 2026**:

- GitHub Release `robotics-studio-open-v0.2.0` is public.
- `Robotics.Studio.Open_0.2.0_aarch64.dmg` is signed, notarized, stapled,
  Gatekeeper accepted, checksum verified, and offline-install tested.
- The hosted browser edition is publicly reachable and was visually verified
  with the deterministic 96-episode synthetic fixture.
- `@auraone/robotics-studio 0.2.0` is public on npm for JSON dataset-manifest
  validation and release metadata. It does not contain the visual app.
- Homebrew, Windows, Linux, native adapter, and automatic updater channels are
  not published for `0.2.0`.

## Documentation

- [Quickstart](docs/quickstart.md)
- [Dataset adapters](docs/adapters.md)
- [Failure clustering](docs/failure-clustering.md)
- [VLA probe](docs/vla-probe.md)
- [Hugging Face export](docs/hf-export.md)
- [AuraOne intake export](docs/intake.md)
- [Architecture](docs/architecture.md)
- [Keyboard shortcuts](docs/shortcuts.md)

## Next Action

Use the hosted browser or verified `0.2.0` GitHub DMG with the bundled synthetic
fixture. Contributors should add only declared, non-sensitive metadata fixtures
and keep unsupported formats explicitly blocked. Treat Homebrew, Windows,
Linux, native adapter, and automatic updater paths as unavailable until
destination-specific evidence is published.

## License

Robotics Studio Open and its repository-owned synthetic fixture are licensed
under MIT.

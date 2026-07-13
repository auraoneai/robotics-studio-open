# Architecture

Robotics Studio Open is a Vite and React application with an optional Tauri
shell configuration.

## Runtime

- `src/App.tsx` owns the responsive review workflow and browser interactions.
- `src/episodeParsing.ts` normalizes supported JSON and JSONL records without
  creating missing evidence.
- `src/localOperations.ts` implements deterministic clustering, sensor QA,
  mock probe reports, SHA-256 hashing, and an uncompressed ZIP writer.
- `src/data.ts` loads and verifies the repository-owned 96-record synthetic
  fixture.
- `src/platformContracts.ts` exposes shared platform identifiers and a local
  in-memory diagnostic preview buffer. It does not send events or create keys.
- Browser `Blob`, object URL, and WebCrypto APIs provide local downloads and
  checksums.

All active dataset state is held in browser memory. The source build does not
create SQLite indexes, decode media, execute Python sidecars, run CLIP models,
authenticate hosted destinations, or call a native robotics engine.

## Tauri Boundary

`src-tauri` is optional package scaffolding and Rust contract coverage. The web
application does not invoke it for dataset parsing, clustering, QA, probe, or
export operations. A Tauri configuration or updater declaration is not
publication evidence.

## Capture Closure

Release captures hash:

- Robotics source files and the actual monorepo lockfile.
- The complete synthetic fixture and generator-dependent parser.
- Linked Aura IDE Kit, Proofline OSS, and platform-contract runtime source and
  built rendering artifacts.

Every declared path is required. Missing paths fail capture generation and
verification.

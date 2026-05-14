# Architecture

Robotics Studio Open is a Tauri app with a Rust core and TypeScript UI. The UI owns review workflow state and keyboard interactions. The Rust core owns local filesystem walking, platform capability probes, and secure shell integration. `robostudio-engine` runs as a Python sidecar for adapters, SQLite indexing, sensor QA, clustering, VLA probes, embodiment cards, and exports.

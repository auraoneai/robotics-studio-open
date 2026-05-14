# Failure Clustering Guide

Robotics Studio Open groups failures with three strategies:

- CLIP embeddings for visual similarity when local model weights are available.
- Custom encoder hooks for lab-specific embeddings.
- Hash-based clustering for deterministic offline fallback.

The cluster review UI supports representative thumbnails, size badges, split, merge, training-readiness score, and bulk taxonomy tagging.

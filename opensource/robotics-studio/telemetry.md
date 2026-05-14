# Telemetry and Crash Reporting

Robotics Studio Open starts with telemetry and crash reporting off. The first-run wizard offers separate opt-ins for anonymous product telemetry and crash report upload. The local event log can be viewed before any upload.

Telemetry never includes raw robot media, Hugging Face tokens, AuraOne intake tokens, local file paths outside a redacted dataset root, reviewer notes, or free-text anomaly notes. Events follow `opensource/open-studio-platform/schemas/telemetry.schema.json`.

Robotics-specific events are registered in the shared platform registry:

- `robotics_dataset_opened` sends only the dataset format and episode-count bucket.
- `robotics_feature_used` sends only a registered feature ID.
- `robotics_export_completed` sends only the export target and payload role count.

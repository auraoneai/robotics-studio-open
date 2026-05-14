# AuraOne Intake Export

AuraOne intake export creates an `.auraonepkg` file using the shared Open Studio Platform envelope at `https://schemas.auraone.ai/open-studio/intake-packet/v1.json`.

The packet contains:

```text
manifest.json
privacy/preview.json
payload/reviewed_subset_manifest.json
payload/episode_references.json
payload/failure_clusters.json
payload/intervention_notes.jsonl
payload/embodiment_card.md
payload/sensor_qa_report.json
```

Robotics payloads use the canonical `payload_manifest` roles `robotics_reviewed_subset_manifest`, `robotics_episode_reference`, `robotics_failure_cluster`, `robotics_intervention_note`, `robotics_embodiment_card`, and `robotics_sensor_qa_report`. Raw robot video, ROS bags, local file paths, hostnames, and API keys are excluded; upload requires a local privacy preview.

# Intervention Ontology

Part of AuraOne Robotics ReviewKit. Examples are mock/synthetic metadata and are not real reviewed robotics datasets or training data. This artifact supports review and QA, not data collection claims.

`schema/taxonomy/intervention_ontology.yaml` defines reusable intervention categories for humanoid and embodied-agent data review.

## Included Categories

- balance correction
- handoff correction
- grasp retry
- navigation recovery
- human proximity adjustment
- object reorientation
- tool-use reset
- failed affordance
- unsafe motion stop
- instruction ambiguity resolution
- unclassified temporary placeholder

## Review Guidance

Interventions are not the same as failures. A failure describes what went wrong or what evidence is missing. An intervention describes the human or controller action that changed the episode path. A single intervention can respond to multiple failure modes.

Use `INT_UNCLASSIFIED` only while review is incomplete. Export-ready reviewed data should use a specific ontology ID or document why no category fits.

## Example

See `examples/intervention_examples.json` and `examples/teleop_review_mock_episode.json`.

# Teleop Task Library

Part of AuraOne Robotics ReviewKit. Examples are mock/synthetic metadata and are not real reviewed robotics datasets or training data. This artifact supports review and QA, not data collection claims.

`schema/tasks/teleop_tasks.yaml` provides hardware-agnostic task specifications for robotics data collection requirements and review requirements. It is a specification library, not a dataset.

## Included Tasks

- open drawer
- fold towel
- pick from clutter
- wipe surface
- place cup
- plug cable
- sort objects
- recover dropped item
- hand object to human
- navigate obstacle

Each task includes success criteria, failure criteria, sensor notes, annotation requirements, reset instructions, and safety notes.

## Review Use

Task definitions should be attached to the teleop schema through `task.task_id`, `task.variant`, `task.environment_id`, and `task.reset_state_id`. Reviewers can then compare an episode's evidence against the intended task rather than relying on raw video alone.

## Versioning

Keep task IDs stable. Add variants for environment layouts, object sets, tolerances, and embodiment assumptions. Do not silently change success criteria for an existing variant.

## Example

See `examples/task_definition_example.yaml`.

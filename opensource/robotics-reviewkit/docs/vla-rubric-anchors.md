# VLA Rubric Anchors

Synthetic VLA anchor libraries cover dexterity, manipulation, navigation, and manipulation-with-tools. They are designed for per-step review labels and are not real robotics data or benchmarks.

The anchor modules are intentionally small Python data libraries that can be imported by validators, viewers, and export scripts:

```python
from robotics_reviewkit.rubrics import DEXTERITY_ANCHORS, MANIPULATION_ANCHORS, NAVIGATION_ANCHORS, TOOL_USE_ANCHORS
```

Every anchor uses a `criterion_id`, human label, and ordinal anchor values. The bundled synthetic v2 episode maps `grasp_alignment` to a scored review decision and keeps that score in LeRobot v2 metadata exports.

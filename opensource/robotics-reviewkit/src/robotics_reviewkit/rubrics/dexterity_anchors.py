DEXTERITY_ANCHORS = [
    {"criterion_id": "grasp_alignment", "label": "Grasp alignment", "anchors": [{"value": 0, "label": "miss"}, {"value": 1, "label": "unstable"}, {"value": 2, "label": "stable"}]},
    {"criterion_id": "fine_motor_control", "label": "Fine motor control", "anchors": [{"value": 0, "label": "unsafe"}, {"value": 1, "label": "coarse"}, {"value": 2, "label": "precise"}]},
]
NAVIGATION_ANCHORS = [{"criterion_id": "path_safety", "label": "Path safety", "anchors": [{"value": 0, "label": "collision"}, {"value": 1, "label": "near miss"}, {"value": 2, "label": "clear"}]}]
TOOL_USE_ANCHORS = [{"criterion_id": "tool_pose", "label": "Tool pose", "anchors": [{"value": 0, "label": "incorrect"}, {"value": 1, "label": "correctable"}, {"value": 2, "label": "correct"}]}]

from __future__ import annotations


def render_markdown(card: dict) -> str:
    lines = [
        f"# Embodiment Card: {card['name']}",
        "",
        "## Robot",
        "",
        f"- Type: `{card['robot'].get('type', 'unknown')}`",
        f"- Morphology: `{card['robot'].get('morphology', 'unknown')}`",
        f"- Control rate: `{card['control_rate_hz']} Hz`",
        f"- Teleoperation method: `{card['teleop_method']}`",
        "",
        "## Sensors",
        "",
    ]
    for sensor in card["sensors"]:
        lines.append(f"- `{sensor.get('name')}`: {sensor.get('type')} ({sensor.get('rate_hz', 'unknown')} Hz)")
    lines.extend(["", "## Action Space", ""])
    for key, value in card["action_space"].items():
        lines.append(f"- `{key}`: {value}")
    lines.extend(["", "## Coordinate Frames", ""])
    for frame in card["coordinate_frames"]:
        lines.append(f"- `{frame.get('name')}` relative to `{frame.get('parent', 'world')}`: {frame.get('description', '')}")
    lines.extend(["", "## Environment Assumptions", ""])
    for key, value in card["environment"].items():
        lines.append(f"- `{key}`: {value}")
    lines.extend(["", "## Safety Boundaries", ""])
    for item in card["safety_boundaries"]:
        lines.append(f"- {item}")
    lines.extend(["", "## Known Limitations", ""])
    for item in card["limitations"]:
        lines.append(f"- {item}")
    lines.append("")
    return "\n".join(lines)


from embodiment_card.schema import validate_card


def test_schema_catches_required_robotics_fields():
    errors = validate_card({"name": "bad"})
    assert "missing required field `coordinate_frames`" in errors
    assert "missing required field `action_space`" in errors
    assert "missing required field `sensors`" in errors
    assert "missing required field `control_rate_hz`" in errors


def test_valid_card_passes():
    from embodiment_card.cli import load_card

    assert validate_card(load_card("examples/mock_so101_card.json")) == []


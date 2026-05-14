import json

import pytest

from robotics_reviewkit.rubrics import DEXTERITY_ANCHORS, MANIPULATION_ANCHORS
from robotics_reviewkit.analyzers import summarize_events, intervention_density, validate_event_stream
from robotics_reviewkit.exporters.lerobot_v2 import export_episode_v2
from robotics_reviewkit.exporters.rlds_streaming import stream_episode, stream_episode_records, write_jsonl_stream

def test_v2_anchors_analyzers_exporters():
    episode={
        "episode_id":"e",
        "task":"dexterity",
        "review_version": "v2",
        "synthetic":True,
        "duration_seconds":60,
        "event_stream":[{"timestamp_s": 0, "label":"contact"}, {"timestamp_s": 30, "label":"intervention"}, {"timestamp_s": 45, "label":"success"}],
        "steps":[{"timestamp_s": 0, "observation": {"placeholder": True}, "action": {"placeholder": True}}, {"timestamp_s": 45, "observation": {"placeholder": True}, "action": {"placeholder": True}}],
    }
    assert DEXTERITY_ANCHORS and MANIPULATION_ANCHORS
    assert summarize_events(episode["event_stream"])["counts"]["intervention"] == 1
    assert intervention_density(episode["event_stream"], 60)["events_per_minute"] == 1
    export = export_episode_v2(episode)
    assert export["format"] == "lerobot-v2-metadata-bridge"
    assert export["episodes"][0]["metadata_only"] is True
    assert export["episodes"][0]["event_summary"]["event_count"] == 3
    assert list(stream_episode(episode))[0]["step_index"] == 0


def test_event_stream_validation_rejects_unsorted_or_unknown_events():
    with pytest.raises(ValueError, match="monotonically"):
        validate_event_stream([{"timestamp_s": 2, "label": "contact"}, {"timestamp_s": 1, "label": "success"}])
    with pytest.raises(ValueError, match="unsupported event label"):
        validate_event_stream([{"timestamp_s": 1, "label": "unsupported"}])


def test_streaming_rlds_accepts_iterable_steps_and_writes_jsonl(tmp_path):
    steps = ({"timestamp_s": i, "observation": {"placeholder": True}, "action": {"placeholder": True}} for i in range(3))
    records = list(
        stream_episode_records(
            "episode-stream",
            steps,
            event_stream=[{"timestamp_s": 1, "label": "intervention"}, {"timestamp_s": 4, "label": "success"}],
        )
    )
    assert [record["step_index"] for record in records] == [0, 1, 2, None]
    assert records[1]["review_events"][0]["label"] == "intervention"
    assert records[-1]["is_terminal"] is True

    episode = {
        "episode_id": "episode-stream",
        "event_stream": [{"timestamp_s": 1, "label": "success"}],
        "steps": [{"timestamp_s": 1, "observation": {}, "action": {}}],
        "synthetic": True,
    }
    out = write_jsonl_stream(episode, tmp_path / "stream.jsonl")
    rows = [json.loads(line) for line in out.read_text(encoding="utf-8").splitlines()]
    assert rows[0]["episode_id"] == "episode-stream"

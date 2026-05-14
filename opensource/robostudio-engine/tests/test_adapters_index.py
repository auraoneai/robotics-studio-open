from __future__ import annotations

import sqlite3
from pathlib import Path

from robostudio_engine import SQLiteIndexManager, build_streaming_index, detect_adapter, list_episodes


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "examples" / "mock_multi_format"


def test_lerobot_v3_adapter_and_streaming_index():
    dataset = FIXTURES / "lerobot_v3"
    adapter = detect_adapter(dataset)
    assert adapter.name == "lerobot"
    episodes = list_episodes(dataset)
    assert [episode.episode_id for episode in episodes] == ["0", "1"]
    assert episodes[0].format_version == "v3"
    stats = build_streaming_index(dataset)
    assert stats["indexed"] == 2
    manager = SQLiteIndexManager(dataset)
    try:
        rows = manager.query(filters={"success": True})
        assert len(rows) == 1
        assert rows[0]["episode_id"] == "0"
    finally:
        manager.close()


def test_lerobot_v2_rlds_openx_hdf5_and_mp4_jsonl_adapters():
    expectations = {
        "lerobot_v2": ("lerobot", "v2"),
        "rlds": ("rlds", "tfds-trajectory"),
        "openx": ("openx", "openx-rlds-v1"),
        "hdf5": ("hdf5", "aloha"),
        "mp4_jsonl": ("folder-of-mp4-jsonl", "auraone-capture-fallback"),
    }
    for fixture, (adapter_name, version) in expectations.items():
        dataset = FIXTURES / fixture
        assert detect_adapter(dataset).name == adapter_name
        episodes = list_episodes(dataset)
        assert episodes
        assert episodes[0].format_version == version


def test_folder_mp4_jsonl_prefers_prd_episode_manifest_layout(tmp_path):
    (tmp_path / "cam_front.mp4").write_bytes(b"placeholder video")
    (tmp_path / "episodes.jsonl").write_text(
        '{"episode_id":"ep-1","task":"pick","duration_seconds":1.5,"frame_count":2,"success":true,"intervention_count":1}\n',
        encoding="utf8",
    )
    (tmp_path / "state.jsonl").write_text('{"t":0,"q":[0]}\n{"t":1,"q":[1]}\n', encoding="utf8")
    (tmp_path / "actions.jsonl").write_text('{"t":0,"a":[0]}\n', encoding="utf8")

    assert detect_adapter(tmp_path).name == "folder-of-mp4-jsonl"
    episode = list_episodes(tmp_path)[0]
    assert episode.episode_id == "ep-1"
    assert episode.format_version == "auraone-capture-fallback"
    assert episode.video_paths == {"cam_front": "cam_front.mp4"}
    assert {stream.name for stream in episode.sensor_schema} == {"cam_front", "state", "actions"}
    assert episode.metadata["jsonl_records"] == {"state.jsonl": 2, "actions.jsonl": 1}


def test_rosbag2_adapter_reads_sqlite_topics(tmp_path):
    db = tmp_path / "sample.db3"
    conn = sqlite3.connect(db)
    conn.executescript(
        """
        CREATE TABLE topics(id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE messages(id INTEGER PRIMARY KEY, topic_id INTEGER, timestamp INTEGER, data BLOB);
        INSERT INTO topics(id, name) VALUES (1, '/camera/image'), (2, '/joint_states');
        INSERT INTO messages(topic_id, timestamp, data) VALUES (1, 1, X'00'), (2, 2, X'00');
        """
    )
    conn.close()
    assert detect_adapter(tmp_path).name == "rosbag"
    episode = list_episodes(tmp_path)[0]
    assert episode.format_version == "rosbag2-sqlite"
    assert episode.frame_count == 2
    assert {stream.name for stream in episode.sensor_schema} == {"/camera/image", "/joint_states"}


def test_rosbag1_legacy_adapter_uses_sidecar_topics(tmp_path):
    bag = tmp_path / "legacy.bag"
    bag.write_bytes(b"legacy rosbag placeholder")
    bag.with_suffix(".json").write_text('{"topics":["/tf","/camera"],"message_count":7}', encoding="utf8")
    assert detect_adapter(tmp_path).name == "rosbag"
    episode = list_episodes(tmp_path)[0]
    assert episode.format_version == "rosbag1-legacy"
    assert {stream.name for stream in episode.sensor_schema} == {"/tf", "/camera"}

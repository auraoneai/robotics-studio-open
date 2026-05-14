from __future__ import annotations

import sqlite3
import subprocess
from pathlib import Path

from robostudio_engine import list_episodes
from robostudio_engine.contracts import EpisodeMeta
from robostudio_engine.hardware_decode import DecodeBackend
from robostudio_engine.thumbnails import ThumbnailWorkerPool


def test_rosbag_adapter_tolerates_malformed_rosbag2_sqlite(tmp_path):
    malformed_inputs = [
        b"",
        b"not a sqlite database",
        b"SQLite format 3\x00truncated",
    ]

    for index, payload in enumerate(malformed_inputs):
        case = tmp_path / f"case_{index}"
        case.mkdir()
        (case / "malformed.db3").write_bytes(payload)

        episodes = list_episodes(case)

        assert len(episodes) == 1
        assert episodes[0].format_version == "rosbag2-sqlite"
        assert episodes[0].frame_count is None
        assert episodes[0].sensor_schema == []


def test_rosbag_adapter_tolerates_rosbag2_schema_drift(tmp_path):
    db = tmp_path / "schema_drift.db3"
    conn = sqlite3.connect(db)
    conn.executescript(
        """
        CREATE TABLE topics(id INTEGER PRIMARY KEY, unexpected TEXT);
        CREATE TABLE messages(id INTEGER PRIMARY KEY, topic_id INTEGER, timestamp INTEGER);
        INSERT INTO topics(id, unexpected) VALUES (1, '/camera/image');
        INSERT INTO messages(topic_id, timestamp) VALUES (1, 1);
        """
    )
    conn.close()

    episodes = list_episodes(tmp_path)

    assert len(episodes) == 1
    assert episodes[0].frame_count is None
    assert episodes[0].sensor_schema == []


def test_rosbag_adapter_tolerates_malformed_rosbag1_sidecars(tmp_path):
    malformed_sidecars = [
        "{",
        '{"topics":[42, null, "/valid"], "message_count":"many"}',
        '{"topics":"not-a-list", "message_count":7}',
    ]

    for index, sidecar in enumerate(malformed_sidecars):
        case = tmp_path / f"legacy_{index}"
        case.mkdir()
        bag = case / "legacy.bag"
        bag.write_bytes(b"legacy rosbag malformed corpus")
        bag.with_suffix(".json").write_text(sidecar, encoding="utf8")

        episodes = list_episodes(case)

        assert len(episodes) == 1
        assert episodes[0].format_version == "rosbag1-legacy"
        assert all(stream.name.startswith("/") for stream in episodes[0].sensor_schema)


def test_thumbnail_worker_falls_back_for_malformed_video_inputs(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "robostudio_engine.thumbnails.preferred_decode_backend",
        lambda: DecodeBackend("libav-software", True, None, "forced fuzz-smoke backend"),
    )

    def fail_decode(*_args, **_kwargs):
        raise subprocess.CalledProcessError(1, "ffmpeg")

    monkeypatch.setattr("robostudio_engine.thumbnails.subprocess.run", fail_decode)

    for suffix in ("mp4", "h264", "h265", "av1"):
        video = tmp_path / f"malformed.{suffix}"
        video.write_bytes(b"\x00\x00\x00\x18ftyp" + suffix.encode("ascii") + b"\xff" * 64)
        episode = EpisodeMeta(
            episode_id=suffix,
            dataset_format="folder-of-mp4-jsonl",
            format_version="fuzz-smoke",
            root=tmp_path,
            duration_seconds=1.0,
            video_paths={"rgb": video.name},
        )

        outputs = ThumbnailWorkerPool(tmp_path, workers=1).generate_for_episode(episode)

        assert len(outputs) == 3
        assert all(path.suffix == ".svg" for path in outputs)
        assert all(path.exists() for path in outputs)


def test_thumbnail_worker_falls_back_after_decoder_timeout(tmp_path, monkeypatch):
    video = tmp_path / "timeout.mp4"
    video.write_bytes(b"timeout corpus")
    monkeypatch.setattr(
        "robostudio_engine.thumbnails.preferred_decode_backend",
        lambda: DecodeBackend("libav-software", True, None, "forced timeout backend"),
    )

    def timeout_decode(*_args, **_kwargs):
        raise subprocess.TimeoutExpired("ffmpeg", timeout=20)

    monkeypatch.setattr("robostudio_engine.thumbnails.subprocess.run", timeout_decode)
    episode = EpisodeMeta(
        episode_id="timeout",
        dataset_format="folder-of-mp4-jsonl",
        format_version="fuzz-smoke",
        root=tmp_path,
        duration_seconds=1.0,
        video_paths={"rgb": video.name},
    )

    outputs = ThumbnailWorkerPool(tmp_path, workers=1).generate_for_episode(episode)

    assert all(path.exists() for path in outputs)
    assert all("fallback" in path.read_text(encoding="utf8") for path in outputs)

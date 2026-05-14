from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Iterator

from .adapters import load_dataset
from .contracts import Dataset, Episode


SCHEMA = """
CREATE TABLE IF NOT EXISTS episodes (
  episode_id TEXT PRIMARY KEY,
  adapter TEXT NOT NULL,
  task TEXT NOT NULL,
  embodiment TEXT NOT NULL,
  duration_s REAL NOT NULL,
  success INTEGER,
  failure_modes TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sensors (
  episode_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  sample_rate_hz REAL NOT NULL,
  dropped_frames INTEGER NOT NULL,
  calibration_error REAL NOT NULL,
  av_sync_ms REAL NOT NULL
);
"""


def open_index(path: str | Path) -> sqlite3.Connection:
    conn = sqlite3.connect(Path(path))
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def build_index(dataset_path: str | Path, index_path: str | Path, progress_every: int = 250) -> Iterator[dict[str, int | str]]:
    dataset = load_dataset(dataset_path)
    conn = open_index(index_path)
    with conn:
        conn.execute("DELETE FROM episodes")
        conn.execute("DELETE FROM sensors")
        for offset, episode in enumerate(dataset.episodes, start=1):
            _insert_episode(conn, dataset, episode)
            if offset == 1 or offset % progress_every == 0 or offset == len(dataset.episodes):
                yield {"event": "index-progress", "indexed": offset, "total": len(dataset.episodes)}
    conn.close()


def _insert_episode(conn: sqlite3.Connection, dataset: Dataset, episode: Episode) -> None:
    conn.execute(
        """
        INSERT OR REPLACE INTO episodes
        (episode_id, adapter, task, embodiment, duration_s, success, failure_modes, payload)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            episode.episode_id,
            dataset.adapter,
            episode.task,
            episode.embodiment,
            episode.duration_s,
            None if episode.success is None else int(bool(episode.success)),
            json.dumps(episode.failure_modes, sort_keys=True),
            json.dumps(episode.to_dict(), sort_keys=True),
        ),
    )
    for sensor in episode.sensors:
        conn.execute(
            """
            INSERT INTO sensors
            (episode_id, name, kind, sample_rate_hz, dropped_frames, calibration_error, av_sync_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                episode.episode_id,
                sensor.name,
                sensor.kind,
                sensor.sample_rate_hz,
                sensor.dropped_frames,
                sensor.calibration_error,
                sensor.av_sync_ms,
            ),
        )

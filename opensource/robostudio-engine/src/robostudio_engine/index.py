from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path
from typing import Any, Iterable

from .adapters import detect_adapter, get_adapter
from .contracts import EpisodeMeta, ProgressCallback


SCHEMA_VERSION = 1


class SQLiteIndexManager:
    def __init__(self, dataset_root: str | Path, index_path: str | Path | None = None) -> None:
        self.dataset_root = Path(dataset_root)
        self.index_path = Path(index_path) if index_path else self.dataset_root / ".robostudio" / "index.sqlite"
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.index_path)
        self.conn.row_factory = sqlite3.Row
        self.initialize()

    def initialize(self) -> None:
        self.conn.executescript(
            """
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS meta (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS episodes (
              episode_id TEXT PRIMARY KEY,
              dataset_format TEXT NOT NULL,
              format_version TEXT NOT NULL,
              relative_path TEXT,
              duration_seconds REAL,
              frame_count INTEGER,
              success INTEGER,
              intervention_count INTEGER NOT NULL DEFAULT 0,
              embodiment TEXT,
              task_tag TEXT,
              created_at TEXT,
              sensor_schema_json TEXT NOT NULL,
              video_paths_json TEXT NOT NULL,
              metadata_json TEXT NOT NULL,
              source_mtime REAL NOT NULL DEFAULT 0,
              indexed_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS episodes_format_idx ON episodes(dataset_format);
            CREATE INDEX IF NOT EXISTS episodes_success_idx ON episodes(success);
            CREATE INDEX IF NOT EXISTS episodes_task_idx ON episodes(task_tag);
            CREATE INDEX IF NOT EXISTS episodes_embodiment_idx ON episodes(embodiment);
            CREATE TABLE IF NOT EXISTS saved_views (
              name TEXT PRIMARY KEY,
              spec_json TEXT NOT NULL,
              updated_at REAL NOT NULL
            );
            """
        )
        self.conn.execute("INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)", ("schema_version", str(SCHEMA_VERSION)))
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    def upsert_episode(self, meta: EpisodeMeta) -> None:
        self.conn.execute(
            """
            INSERT INTO episodes (
              episode_id, dataset_format, format_version, relative_path, duration_seconds,
              frame_count, success, intervention_count, embodiment, task_tag, created_at,
              sensor_schema_json, video_paths_json, metadata_json, source_mtime, indexed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(episode_id) DO UPDATE SET
              dataset_format=excluded.dataset_format,
              format_version=excluded.format_version,
              relative_path=excluded.relative_path,
              duration_seconds=excluded.duration_seconds,
              frame_count=excluded.frame_count,
              success=excluded.success,
              intervention_count=excluded.intervention_count,
              embodiment=excluded.embodiment,
              task_tag=excluded.task_tag,
              created_at=excluded.created_at,
              sensor_schema_json=excluded.sensor_schema_json,
              video_paths_json=excluded.video_paths_json,
              metadata_json=excluded.metadata_json,
              source_mtime=excluded.source_mtime,
              indexed_at=excluded.indexed_at
            """,
            (
                meta.episode_id,
                meta.dataset_format,
                meta.format_version,
                meta.relative_path,
                meta.duration_seconds,
                meta.frame_count,
                None if meta.success is None else int(meta.success),
                meta.intervention_count,
                meta.embodiment,
                meta.task_tag,
                meta.created_at,
                json.dumps([stream.to_dict() for stream in meta.sensor_schema], sort_keys=True),
                json.dumps(meta.video_paths, sort_keys=True),
                json.dumps(meta.metadata, sort_keys=True),
                meta.source_mtime,
                time.time(),
            ),
        )

    def build(self, episodes: Iterable[EpisodeMeta], progress: ProgressCallback | None = None, batch_size: int = 250) -> int:
        count = 0
        for episode in episodes:
            self.upsert_episode(episode)
            count += 1
            if count % batch_size == 0:
                self.conn.commit()
                if progress:
                    progress({"event": "index_progress", "indexed": count})
        self.conn.commit()
        if progress:
            progress({"event": "index_complete", "indexed": count, "index_path": str(self.index_path)})
        return count

    def query(
        self,
        filters: dict[str, Any] | None = None,
        sort_by: str = "episode_id",
        descending: bool = False,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        allowed_sort = {"episode_id", "duration_seconds", "frame_count", "intervention_count", "embodiment", "task_tag", "created_at"}
        sort = sort_by if sort_by in allowed_sort else "episode_id"
        clauses: list[str] = []
        params: list[Any] = []
        for key, value in (filters or {}).items():
            if key == "success" and value in {True, False}:
                clauses.append("success = ?")
                params.append(int(value))
            elif key in {"embodiment", "task_tag", "dataset_format"} and value:
                clauses.append(f"{key} = ?")
                params.append(str(value))
            elif key == "min_interventions":
                clauses.append("intervention_count >= ?")
                params.append(int(value))
            elif key == "max_interventions":
                clauses.append("intervention_count <= ?")
                params.append(int(value))
        where = " WHERE " + " AND ".join(clauses) if clauses else ""
        order = "DESC" if descending else "ASC"
        rows = self.conn.execute(
            f"SELECT * FROM episodes{where} ORDER BY {sort} {order} LIMIT ? OFFSET ?",
            [*params, int(limit), int(offset)],
        ).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def save_view(self, name: str, spec: dict[str, Any]) -> None:
        self.conn.execute(
            "INSERT OR REPLACE INTO saved_views(name, spec_json, updated_at) VALUES (?, ?, ?)",
            (name, json.dumps(spec, sort_keys=True), time.time()),
        )
        self.conn.commit()

    def load_view(self, name: str) -> dict[str, Any] | None:
        row = self.conn.execute("SELECT spec_json FROM saved_views WHERE name = ?", (name,)).fetchone()
        return json.loads(row["spec_json"]) if row else None

    def stats(self) -> dict[str, Any]:
        count = self.conn.execute("SELECT COUNT(*) FROM episodes").fetchone()[0]
        by_format = {
            row["dataset_format"]: row["count"]
            for row in self.conn.execute("SELECT dataset_format, COUNT(*) AS count FROM episodes GROUP BY dataset_format").fetchall()
        }
        return {"episodes": int(count), "by_format": by_format, "index_path": str(self.index_path)}

    def _row_to_dict(self, row: sqlite3.Row) -> dict[str, Any]:
        payload = dict(row)
        for key in ("sensor_schema_json", "video_paths_json", "metadata_json"):
            payload[key.removesuffix("_json")] = json.loads(payload.pop(key))
        if payload["success"] is not None:
            payload["success"] = bool(payload["success"])
        return payload


def build_streaming_index(root: str | Path, adapter_name: str | None = None, progress: ProgressCallback | None = None) -> dict[str, Any]:
    dataset_root = Path(root)
    adapter = get_adapter(adapter_name) if adapter_name else detect_adapter(dataset_root)
    manager = SQLiteIndexManager(dataset_root)
    try:
        count = manager.build(adapter.list_episodes(dataset_root), progress=progress)
        stats = manager.stats()
        stats.update({"adapter": adapter.name, "indexed": count})
        return stats
    finally:
        manager.close()

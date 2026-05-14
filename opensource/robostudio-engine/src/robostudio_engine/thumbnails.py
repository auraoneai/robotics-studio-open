from __future__ import annotations

import html
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Iterable

from .contracts import EpisodeMeta
from .hardware_decode import ffmpeg_thumbnail_command, preferred_decode_backend


class ThumbnailWorkerPool:
    def __init__(self, dataset_root: str | Path, workers: int = 4) -> None:
        self.dataset_root = Path(dataset_root)
        self.thumb_root = self.dataset_root / ".robostudio" / "thumbs"
        self.thumb_root.mkdir(parents=True, exist_ok=True)
        self.workers = max(1, workers)

    def generate_for_episode(self, episode: EpisodeMeta) -> list[Path]:
        video = self._first_video(episode)
        stamps = self._timestamps(episode)
        outputs: list[Path] = []
        for pct, timestamp in stamps:
            out = self.thumb_root / _safe_name(f"{episode.episode_id}_{pct}.jpg")
            if video and self._needs_refresh(out, video):
                out = self._extract(video, timestamp, out, episode)
            elif not video and not out.exists():
                out = out.with_suffix(".svg")
                self._write_placeholder(out, episode, pct)
            outputs.append(out)
        return outputs

    def generate_many(self, episodes: Iterable[EpisodeMeta]) -> dict[str, list[str]]:
        results: dict[str, list[str]] = {}
        with ThreadPoolExecutor(max_workers=self.workers) as pool:
            futures = {pool.submit(self.generate_for_episode, episode): episode.episode_id for episode in episodes}
            for future in as_completed(futures):
                episode_id = futures[future]
                results[episode_id] = [str(path) for path in future.result()]
        return results

    def _first_video(self, episode: EpisodeMeta) -> Path | None:
        for relative in episode.video_paths.values():
            path = episode.root / relative
            if path.exists():
                return path
        return None

    def _timestamps(self, episode: EpisodeMeta) -> list[tuple[str, float]]:
        duration = episode.duration_seconds or ((episode.frame_count or 90) / 30)
        return [("10", duration * 0.10), ("50", duration * 0.50), ("90", duration * 0.90)]

    def _needs_refresh(self, out: Path, source: Path) -> bool:
        return not out.exists() or source.stat().st_mtime > out.stat().st_mtime

    def _extract(self, video: Path, timestamp: float, out: Path, episode: EpisodeMeta) -> Path:
        backend = preferred_decode_backend()
        if backend.available:
            try:
                subprocess.run(ffmpeg_thumbnail_command(video, timestamp, out, backend), check=True, capture_output=True, timeout=20)
                return out
            except (OSError, subprocess.SubprocessError):
                pass
        placeholder = out.with_suffix(".svg")
        self._write_placeholder(placeholder, episode, "fallback")
        return placeholder

    def _write_placeholder(self, out: Path, episode: EpisodeMeta, label: str) -> None:
        title = html.escape(f"{episode.episode_id} {label}")
        task = html.escape(episode.task_tag or episode.dataset_format)
        out.write_text(
            "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'>"
            "<rect width='320' height='180' fill='#111827'/>"
            "<rect x='12' y='12' width='296' height='156' rx='8' fill='#1f2937' stroke='#38bdf8'/>"
            f"<text x='24' y='82' fill='#e5e7eb' font-family='Arial' font-size='18'>{title}</text>"
            f"<text x='24' y='112' fill='#93c5fd' font-family='Arial' font-size='14'>{task}</text>"
            "</svg>",
            encoding="utf8",
        )


def _safe_name(value: str) -> str:
    return "".join(char if char.isalnum() or char in {"-", "_", "."} else "_" for char in value)

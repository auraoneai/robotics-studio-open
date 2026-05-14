from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class Episode:
    episode_id: int
    task: str | None
    frames: int | None
    start_time: float | None
    end_time: float | None
    data_path: str | None
    video_paths: dict[str, str]
    action_shape: list[int] | None
    state_shape: list[int] | None
    timestamps: list[float]
    interventions: list[dict[str, Any]]


@dataclass(frozen=True)
class DatasetInfo:
    root: Path
    info: dict[str, Any]
    episodes: list[Episode]
    readme: str
    source: str = "local"
    remote: bool = False


def load_dataset(path: str | Path) -> DatasetInfo:
    root = Path(path).resolve()
    info = _read_json(root / "meta" / "info.json")
    episodes_payload = _read_json(root / "meta" / "episodes.json")
    episodes_raw = episodes_payload.get("episodes", episodes_payload if isinstance(episodes_payload, list) else [])
    episodes = [_episode_from_dict(item) for item in episodes_raw if isinstance(item, dict)]
    readme = _read_optional_text(root / "README.md")
    return DatasetInfo(root=root, info=info if isinstance(info, dict) else {}, episodes=episodes, readme=readme)


def load_hf_dataset(repo_id: str, fetcher: Any | None = None) -> DatasetInfo:
    """Load lightweight Hugging Face dataset metadata without downloading media files."""
    fetch = fetcher or _fetch_hf_text
    info = _loads_json(fetch(repo_id, "meta/info.json"))
    episodes_payload = _loads_json(fetch(repo_id, "meta/episodes.json"))
    episodes_raw = episodes_payload.get("episodes", episodes_payload if isinstance(episodes_payload, list) else [])
    episodes = [_episode_from_dict(item) for item in episodes_raw if isinstance(item, dict)]
    readme = fetch(repo_id, "README.md")
    return DatasetInfo(
        root=Path(".").resolve(),
        info=info if isinstance(info, dict) else {},
        episodes=episodes,
        readme=readme,
        source=f"hf://{repo_id}",
        remote=True,
    )


def _episode_from_dict(item: dict[str, Any]) -> Episode:
    return Episode(
        episode_id=int(item.get("episode_id", item.get("id", -1))),
        task=item.get("task"),
        frames=_int_or_none(item.get("frames")),
        start_time=_float_or_none(item.get("start_time")),
        end_time=_float_or_none(item.get("end_time")),
        data_path=item.get("data_path"),
        video_paths=dict(item.get("video_paths", {})),
        action_shape=_shape_or_none(item.get("action_shape")),
        state_shape=_shape_or_none(item.get("state_shape")),
        timestamps=[float(value) for value in item.get("timestamps", []) if isinstance(value, int | float)],
        interventions=list(item.get("interventions", [])),
    )


def _read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _loads_json(text: str) -> Any:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}


def _read_optional_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf8")
    except OSError:
        return ""


def _fetch_hf_text(repo_id: str, filename: str) -> str:
    encoded_repo = quote(repo_id, safe="")
    encoded_file = "/".join(quote(part, safe="") for part in filename.split("/"))
    url = f"https://huggingface.co/datasets/{encoded_repo}/resolve/main/{encoded_file}"
    request = Request(url, headers={"User-Agent": "lerobot-quality-gates/0.1"})
    try:
        with urlopen(request, timeout=10) as response:
            return response.read().decode("utf8")
    except (HTTPError, URLError, TimeoutError, UnicodeDecodeError):
        return ""


def _int_or_none(value: Any) -> int | None:
    return value if isinstance(value, int) else None


def _float_or_none(value: Any) -> float | None:
    return float(value) if isinstance(value, int | float) else None


def _shape_or_none(value: Any) -> list[int] | None:
    if isinstance(value, list) and all(isinstance(item, int) for item in value):
        return value
    return None

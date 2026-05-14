from __future__ import annotations

import hashlib
import json
import subprocess
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Sequence

from .contracts import EpisodeMeta
from .adapters import list_episodes
from .adapters import load_dataset

MAX_CUSTOM_ENCODER_STDOUT_BYTES = 1_000_000


@dataclass(frozen=True)
class FailureCluster:
    cluster_id: str
    members: list[str]
    representative_episode_id: str
    dominant_failure_tag: str | None
    training_readiness_score: int
    embedding: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class FailureClusterer:
    def __init__(self, embedding: str = "hash", min_cluster_size: int = 5, custom_encoder: str | None = None) -> None:
        if embedding not in {"hash", "clip", "custom"}:
            raise ValueError("embedding must be hash, clip, or custom")
        self.embedding = embedding
        self.min_cluster_size = max(1, min_cluster_size)
        self.custom_encoder = custom_encoder

    def cluster(self, episodes: list[EpisodeMeta]) -> list[FailureCluster]:
        if self.embedding in {"clip", "custom"}:
            return self._cluster_by_vectors(episodes)
        buckets: dict[str, list[EpisodeMeta]] = defaultdict(list)
        for episode in episodes:
            buckets[self._fingerprint(episode)].append(episode)
        clusters: list[FailureCluster] = []
        singleton_bucket: list[EpisodeMeta] = []
        for fingerprint, members in sorted(buckets.items()):
            if len(members) < self.min_cluster_size:
                singleton_bucket.extend(members)
                continue
            clusters.append(self._cluster_from_members(fingerprint, members))
        if singleton_bucket:
            for index in range(0, len(singleton_bucket), self.min_cluster_size):
                members = singleton_bucket[index : index + self.min_cluster_size]
                if members:
                    clusters.append(self._cluster_from_members(f"mixed-{index // self.min_cluster_size}", members))
        return clusters

    def write_manifest(self, clusters: list[FailureCluster], out: str | Path) -> Path:
        path = Path(out)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps({"schema": "robostudio.failure_clusters.v1", "clusters": [cluster.to_dict() for cluster in clusters]}, indent=2, sort_keys=True) + "\n",
            encoding="utf8",
        )
        return path

    def _fingerprint(self, episode: EpisodeMeta) -> str:
        return self._hash_fingerprint(episode)

    def _hash_fingerprint(self, episode: EpisodeMeta) -> str:
        metadata = episode.metadata.get("episode", episode.metadata)
        tag = _dominant_tag(metadata)
        material = "|".join(
            [
                episode.dataset_format,
                episode.embodiment or "",
                episode.task_tag or "",
                tag or "",
                ",".join(sorted(stream.kind for stream in episode.sensor_schema)),
            ]
        )
        return hashlib.sha1(material.encode("utf8")).hexdigest()[:12]

    def _custom_vector(self, episode: EpisodeMeta) -> list[float]:
        if not self.custom_encoder:
            raise ValueError("custom encoder path is required when embedding='custom'")
        result = subprocess.run(
            [self.custom_encoder],
            input=json.dumps(episode.to_dict()),
            text=True,
            capture_output=True,
            check=False,
            timeout=15,
        )
        if result.returncode == 0 and result.stdout.strip():
            if len(result.stdout.encode("utf8")) > MAX_CUSTOM_ENCODER_STDOUT_BYTES:
                raise RuntimeError("custom encoder stdout exceeded 1000000 bytes")
            payload = json.loads(result.stdout)
            vector = payload.get("embedding", payload)
            if isinstance(vector, list) and all(isinstance(item, int | float) for item in vector):
                return [float(item) for item in vector]
        raise RuntimeError(f"custom encoder failed for {episode.episode_id}: {result.stderr.strip()}")

    def _clip_vectors(self, episodes: list[EpisodeMeta]) -> list[list[float]]:
        try:
            import torch  # type: ignore
            from transformers import CLIPModel, CLIPProcessor  # type: ignore
        except Exception as exc:
            raise RuntimeError("CLIP clustering requires `pip install 'robostudio-engine[ml]'`.") from exc

        cache_dir = Path.home() / ".cache" / "robostudio" / "clip-vit-base"
        model_name = "openai/clip-vit-base-patch32"
        processor = CLIPProcessor.from_pretrained(model_name, cache_dir=str(cache_dir))
        model = CLIPModel.from_pretrained(model_name, cache_dir=str(cache_dir))
        texts = [_episode_text(episode) for episode in episodes]
        with torch.no_grad():
            inputs = processor(text=texts, return_tensors="pt", padding=True, truncation=True)
            features = model.get_text_features(**inputs)
            features = features / features.norm(dim=-1, keepdim=True).clamp(min=1e-12)
        return [[float(value) for value in row] for row in features.cpu().tolist()]

    def _cluster_by_vectors(self, episodes: list[EpisodeMeta]) -> list[FailureCluster]:
        if not episodes:
            return []
        vectors = [self._custom_vector(episode) for episode in episodes] if self.embedding == "custom" else self._clip_vectors(episodes)
        labels = _hdbscan_labels(vectors, self.min_cluster_size)
        grouped: dict[int, list[EpisodeMeta]] = defaultdict(list)
        noise: list[EpisodeMeta] = []
        for label, episode in zip(labels, episodes):
            if label < 0:
                noise.append(episode)
            else:
                grouped[label].append(episode)
        clusters = [self._cluster_from_members(f"{self.embedding}-{label}", members) for label, members in sorted(grouped.items())]
        for index, episode in enumerate(noise):
            clusters.append(self._cluster_from_members(f"{self.embedding}-noise-{index}", [episode]))
        return clusters

    def _cluster_from_members(self, fingerprint: str, members: list[EpisodeMeta]) -> FailureCluster:
        tags = [_dominant_tag(member.metadata.get("episode", member.metadata)) for member in members]
        dominant = max((tag for tag in tags if tag), key=tags.count, default=None)
        score = _training_readiness_score(members)
        return FailureCluster(
            cluster_id=f"cluster-{fingerprint}",
            members=[member.episode_id for member in members],
            representative_episode_id=members[0].episode_id,
            dominant_failure_tag=dominant,
            training_readiness_score=score,
            embedding=self.embedding,
        )


def _dominant_tag(metadata: dict[str, Any]) -> str | None:
    for key in ("failure_reason", "failure_cluster", "failure_mode"):
        if isinstance(metadata.get(key), str) and metadata[key]:
            return metadata[key]
    failure_modes = metadata.get("failure_modes", metadata.get("tags", []))
    if isinstance(failure_modes, list) and failure_modes:
        first = failure_modes[0]
        if isinstance(first, str):
            return first
        if isinstance(first, dict):
            return str(first.get("id") or first.get("tag") or "") or None
    return None


def _training_readiness_score(members: list[EpisodeMeta]) -> int:
    if not members:
        return 0
    score = 0
    score += 25 * sum(1 for member in members if member.success is not False) / len(members)
    score += 25 * sum(1 for member in members if member.frame_count is None or member.frame_count > 0) / len(members)
    score += 20 * sum(1 for member in members if member.task_tag) / len(members)
    score += 15 * sum(1 for member in members if member.sensor_schema) / len(members)
    score += 15 * sum(1 for member in members if member.intervention_count == 0 or _has_intervention_labels(member)) / len(members)
    return int(round(score))


def _has_intervention_labels(member: EpisodeMeta) -> bool:
    episode = member.metadata.get("episode", member.metadata)
    interventions = episode.get("interventions", [])
    if not isinstance(interventions, list):
        return False
    return all(isinstance(item, dict) and (item.get("reason") or item.get("type")) for item in interventions)


def _episode_text(episode: EpisodeMeta) -> str:
    metadata = episode.metadata.get("episode", episode.metadata)
    return " | ".join(
        item
        for item in [
            episode.dataset_format,
            episode.embodiment or "",
            episode.task_tag or "",
            _dominant_tag(metadata) or "",
            " ".join(stream.kind for stream in episode.sensor_schema),
        ]
        if item
    )


def _hdbscan_labels(vectors: Sequence[Sequence[float]], min_cluster_size: int) -> list[int]:
    try:
        import hdbscan  # type: ignore
        import numpy as np  # type: ignore
    except Exception as exc:
        raise RuntimeError("Vector clustering requires `pip install 'robostudio-engine[ml]'` for HDBSCAN.") from exc
    if len(vectors) < min_cluster_size:
        return [-1 for _ in vectors]
    labels = hdbscan.HDBSCAN(min_cluster_size=min_cluster_size).fit_predict(np.asarray(vectors, dtype=float))
    return [int(label) for label in labels]


def cluster_failures(dataset_path: str, embedding: str = "hash", min_cluster_size: int = 1) -> dict[str, Any]:
    """Compatibility wrapper used by the desktop app and older smoke tests."""

    episodes = list_episodes(dataset_path)
    clusters = FailureClusterer(embedding=embedding, min_cluster_size=min_cluster_size).cluster(episodes)
    return {
        "schema": "robostudio.failure_clusters.v1",
        "dataset": str(dataset_path),
        "embedding": embedding,
        "clusters": [cluster.to_dict() for cluster in clusters],
    }


def cluster_failures(dataset_path: str, strategy: str = "hash") -> dict[str, Any]:
    dataset = load_dataset(dataset_path)
    clusters = FailureClusterer(
        embedding="custom" if strategy == "custom-encoder" else "clip" if strategy == "clip" else "hash",
        min_cluster_size=1,
    ).cluster(
        [
            EpisodeMeta(
                episode_id=episode.episode_id,
                dataset_format=dataset.adapter,
                format_version=dataset.format_version,
                root=dataset.path,
                duration_seconds=episode.duration_s,
                success=episode.success,
                intervention_count=len(episode.interventions),
                embodiment=episode.embodiment,
                task_tag=episode.task,
                sensor_schema=episode.sensors,
                metadata={"episode": episode.to_dict()},
            )
            for episode in dataset.episodes
        ]
    )
    return {"dataset": str(dataset.path), "clusters": [cluster.to_dict() for cluster in clusters]}

"""Robotics Studio Open engine package."""

from .adapters import (
    Hdf5Adapter,
    LeRobotAdapter,
    Mp4JsonlFolderAdapter,
    OpenXAdapter,
    RldsAdapter,
    RosbagAdapter,
    detect_adapter,
    get_adapter,
    list_episodes,
    load_dataset,
)
from .clustering import FailureCluster, FailureClusterer
from .contracts import Dataset, Episode, EpisodeAdapter, EpisodeHandle, EpisodeMeta, SensorStream, StreamHandle
from .exports import HFHubExporter, IntakePacketExporter, LocalExporter
from .hardware_decode import available_decode_backends, preferred_decode_backend
from .index import SQLiteIndexManager, build_streaming_index
from .indexer import build_index, open_index
from .plugins import PLUGIN_SCHEMA_ID, SUPPORTED_PLUGIN_API, PluginContribution, PluginManifest, load_plugin_manifest, validate_plugin_manifest
from .runners import (
    EmbodimentCardGenerator,
    FailureGalleryExporter,
    QualityGateRunner,
    RecoveryAnalyzer,
    ReviewKitValidator,
    VLAProbeRunner,
)
from .sensor_qa import SensorQARunner
from .thumbnails import ThumbnailWorkerPool

__version__ = "0.1.0"

__all__ = [
    "Dataset",
    "EmbodimentCardGenerator",
    "Episode",
    "EpisodeAdapter",
    "EpisodeHandle",
    "EpisodeMeta",
    "FailureCluster",
    "FailureClusterer",
    "FailureGalleryExporter",
    "Hdf5Adapter",
    "HFHubExporter",
    "IntakePacketExporter",
    "LeRobotAdapter",
    "LocalExporter",
    "Mp4JsonlFolderAdapter",
    "OpenXAdapter",
    "PLUGIN_SCHEMA_ID",
    "PluginContribution",
    "PluginManifest",
    "QualityGateRunner",
    "RecoveryAnalyzer",
    "ReviewKitValidator",
    "RldsAdapter",
    "RosbagAdapter",
    "SQLiteIndexManager",
    "SensorQARunner",
    "SensorStream",
    "StreamHandle",
    "SUPPORTED_PLUGIN_API",
    "ThumbnailWorkerPool",
    "VLAProbeRunner",
    "available_decode_backends",
    "build_index",
    "build_streaming_index",
    "detect_adapter",
    "get_adapter",
    "list_episodes",
    "load_plugin_manifest",
    "load_dataset",
    "open_index",
    "preferred_decode_backend",
    "validate_plugin_manifest",
]

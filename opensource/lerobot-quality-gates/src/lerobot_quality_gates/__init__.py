"""Training-readiness checks for LeRobot-style datasets."""

from .dataset_loader import DatasetInfo, Episode, load_dataset
from .findings import Finding
from .report import QualityReport, run_quality_gates

__all__ = ["DatasetInfo", "Episode", "Finding", "QualityReport", "load_dataset", "run_quality_gates"]

__version__ = "0.1.0"

from __future__ import annotations

import platform
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class DecodeBackend:
    name: str
    available: bool
    ffmpeg_hwaccel: str | None
    reason: str


def available_decode_backends() -> list[DecodeBackend]:
    system = platform.system().lower()
    hwaccels = _ffmpeg_hwaccels()
    backends = [
        DecodeBackend("videotoolbox", system == "darwin" and "videotoolbox" in hwaccels, "videotoolbox", "macOS VideoToolbox"),
        DecodeBackend("vaapi", system == "linux" and "vaapi" in hwaccels, "vaapi", "Linux VAAPI"),
        DecodeBackend("nvdec", system == "linux" and "cuda" in hwaccels, "cuda", "Linux NVDEC/CUDA"),
        DecodeBackend("dxva2", system == "windows" and "dxva2" in hwaccels, "dxva2", "Windows DirectX VA best effort"),
        DecodeBackend("libav-software", shutil.which("ffmpeg") is not None, None, "software ffmpeg/libav fallback"),
    ]
    return backends


def preferred_decode_backend() -> DecodeBackend:
    for backend in available_decode_backends():
        if backend.available:
            return backend
    return DecodeBackend("unavailable", False, None, "ffmpeg not found; install ffmpeg or ship platform video sidecar")


def ffmpeg_thumbnail_command(video: str | Path, timestamp_seconds: float, out: str | Path, backend: DecodeBackend | None = None) -> list[str]:
    selected = backend or preferred_decode_backend()
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error"]
    if selected.ffmpeg_hwaccel:
        command.extend(["-hwaccel", selected.ffmpeg_hwaccel])
    command.extend(["-ss", f"{timestamp_seconds:.3f}", "-i", str(video), "-frames:v", "1", "-y", str(out)])
    return command


def _ffmpeg_hwaccels() -> set[str]:
    if not shutil.which("ffmpeg"):
        return set()
    try:
        result = subprocess.run(["ffmpeg", "-hide_banner", "-hwaccels"], check=False, text=True, capture_output=True, timeout=5)
    except (OSError, subprocess.SubprocessError):
        return set()
    return {line.strip().lower() for line in result.stdout.splitlines() if line.strip() and not line.startswith("Hardware")}

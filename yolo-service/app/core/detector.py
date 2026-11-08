"""Antarmuka detektor olahraga. Menambah olahraga = satu kelas + register, worker tidak berubah.

Detektor menghasilkan KEJADIAN (bola masuk ring, bola mendarat di luar garis), bukan skor.
Aturan poin dihitung di backend (backend/src/modules/scoring/rules).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from uuid import UUID

from app.core.events import Camera, DetectionEvent, Sport


@dataclass
class SegmentContext:
    segment_id: UUID
    session_id: UUID
    match_id: UUID | None
    camera: Camera
    sport: Sport
    start_offset_ms: int = 0  # posisi awal segmen di dalam match
    calibration: dict = field(default_factory=dict)  # titik ring/gawang/garis dari Coach


class SportDetector(ABC):
    sport: Sport

    def __init__(self, device: str, models_dir: Path):
        self.device = device
        self.models_dir = models_dir

    @abstractmethod
    def load(self) -> None:
        """Muat bobot model ke GPU. Dipanggil sekali saat worker mulai."""

    @abstractmethod
    def process(self, video_path: Path, ctx: SegmentContext) -> list[DetectionEvent]:
        """Proses satu segmen video, kembalikan kejadian yang ditemukan."""


_REGISTRY: dict[str, type[SportDetector]] = {}


def register(cls: type[SportDetector]) -> type[SportDetector]:
    _REGISTRY[cls.sport] = cls
    return cls


def registry() -> dict[str, type[SportDetector]]:
    return dict(_REGISTRY)

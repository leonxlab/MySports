import logging
from pathlib import Path

from app.core.detector import SegmentContext, SportDetector, register
from app.core.events import DetectionEvent

log = logging.getLogger(__name__)


@register
class PadelDetector(SportDetector):
    """Bola mendarat di dalam atau di luar garis (usulan, belum diputuskan). Padel tunggal dianggap sama dengan ganda.

    Event yang dihasilkan: `ball_landed` (lihat contracts/detection-event.schema.json).
    """

    sport = "padel"

    def load(self) -> None:
        # TODO: from ultralytics import YOLO ; self.model = YOLO(self.models_dir / "padel.pt").to(self.device)
        log.info("padel: load() belum diimplementasi")

    def process(self, video_path: Path, ctx: SegmentContext) -> list[DetectionEvent]:
        # TODO: baca frame, deteksi, ubah menjadi kejadian dengan event_id uuid4 baru per kejadian
        return []

import logging
from pathlib import Path

from app.core.detector import SegmentContext, SportDetector, register
from app.core.events import DetectionEvent

log = logging.getLogger(__name__)


@register
class BasketballDetector(SportDetector):
    """Bola masuk ring. Pembeda 2 dan 3 poin belum tercakup (pertanyaan terbuka #10: usulan Coach memilih saat konfirmasi).

    Event yang dihasilkan: `basket_made` (lihat contracts/detection-event.schema.json).
    """

    sport = "basketball"

    def load(self) -> None:
        # TODO: from ultralytics import YOLO ; self.model = YOLO(self.models_dir / "basketball.pt").to(self.device)
        log.info("basketball: load() belum diimplementasi")

    def process(self, video_path: Path, ctx: SegmentContext) -> list[DetectionEvent]:
        # TODO: baca frame, deteksi, ubah menjadi kejadian dengan event_id uuid4 baru per kejadian
        return []

import logging
from pathlib import Path

from app.core.detector import SegmentContext, SportDetector, register
from app.core.events import DetectionEvent

log = logging.getLogger(__name__)


@register
class BadmintonDetector(SportDetector):
    """Kok jatuh di dalam atau di luar garis.

    Event yang dihasilkan: `ball_landed` (lihat contracts/detection-event.schema.json).
    """

    sport = "badminton"

    def load(self) -> None:
        # TODO: from ultralytics import YOLO ; self.model = YOLO(self.models_dir / "badminton.pt").to(self.device)
        log.info("badminton: load() belum diimplementasi")

    def process(self, video_path: Path, ctx: SegmentContext) -> list[DetectionEvent]:
        # TODO: baca frame, deteksi, ubah menjadi kejadian. event_id = make_event_id(...) dari app.core.events (deterministik, jangan uuid4)
        return []

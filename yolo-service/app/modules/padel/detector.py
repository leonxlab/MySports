import logging
from pathlib import Path

from app.core.detector import SegmentContext, SportDetector, register
from app.core.events import DetectionEvent
from app.modules.calibration.ball import COCO_SPORTS_BALL

log = logging.getLogger(__name__)


@register
class PadelDetector(SportDetector):
    """Bola mendarat di dalam atau di luar garis (usulan, belum diputuskan). Padel tunggal dianggap sama dengan ganda.

    Event yang dihasilkan: `ball_landed` (lihat contracts/detection-event.schema.json).
    """

    sport = "padel"

    def load(self) -> None:
        from ultralytics import YOLO

        weights = self.models_dir / "padel.pt"
        fine_tuned = weights.exists()
        self.ball_class = 0 if fine_tuned else COCO_SPORTS_BALL
        self.model = YOLO(str(weights) if fine_tuned else "yolo11n.pt")
        self.model.to(self.device)
        log.info("padel live model loaded", extra={"fine_tuned": fine_tuned})

    def process(self, video_path: Path, ctx: SegmentContext) -> list[DetectionEvent]:
        # TODO: baca frame, deteksi, ubah menjadi kejadian. event_id = make_event_id(...) dari app.core.events (deterministik, jangan uuid4)
        return []

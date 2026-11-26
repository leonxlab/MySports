import logging
from pathlib import Path

from app.core.detector import SegmentContext, SportDetector, register
from app.core.events import BasketMade, BasketMadePayload, DetectionEvent, make_event_id
from app.modules.basketball.shots import RimLine, ShotParams, detect_made_shots
from app.modules.calibration.ball import COCO_SPORTS_BALL, BallObs, iter_ball_observations
from app.modules.calibration.contract import Hoop
from app.modules.calibration.points import parse_calibration

log = logging.getLogger(__name__)

# TODO(decision): bobot fine-tune basket belum ada. Sampai ada, pakai YOLO11 nano pretrained COCO
# (kelas sports ball). Bobot tidak masuk git; catat versi di models/VERSIONS.md.
WEIGHTS = "basketball.pt"
FALLBACK_WEIGHTS = "yolo11n.pt"
SAMPLE_FPS = 15.0  # TODO(decision): pertanyaan #12, dari hasil ukur


@register
class BasketballDetector(SportDetector):
    """Bola masuk ring. AI tidak memutuskan 2 atau 3 poin (pertanyaan terbuka #10): Coach memilih saat konfirmasi.

    Event yang dihasilkan: `basket_made` (lihat contracts/detection-event.schema.json).
    Posisi ring dari kalibrasi Coach; model hanya mencari bola.
    """

    sport = "basketball"

    def load(self) -> None:
        from ultralytics import YOLO  # lazy: test ringan tanpa torch

        weights = self.models_dir / WEIGHTS
        fine_tuned = weights.exists()
        self.ball_class = 0 if fine_tuned else COCO_SPORTS_BALL
        self.model = YOLO(str(weights) if fine_tuned else FALLBACK_WEIGHTS)
        self.model.to(self.device)
        log.info("basketball model loaded", extra={"fine_tuned": fine_tuned})

    def process(self, video_path: Path, ctx: SegmentContext) -> list[DetectionEvent]:
        if not ctx.calibration:
            log.warning("basketball: segment without calibration, skipped", extra={"segment_id": str(ctx.segment_id)})
            return []
        cal = parse_calibration(ctx.calibration)
        cam = cal.for_camera(ctx.camera)
        hoops = [t for t in cam.targets if isinstance(t, Hoop)] if cam else []
        if not cam or not hoops:
            log.warning("basketball: no hoop calibrated for camera", extra={"camera": ctx.camera})
            return []

        observations = list(
            iter_ball_observations(
                self.model,
                video_path,
                sample_fps=SAMPLE_FPS,
                ref_size=(cam.frame.width, cam.frame.height),
                ball_class=self.ball_class,
            )
        )
        return events_from_observations(observations, hoops, ctx)


def events_from_observations(
    observations: list[BallObs], hoops: list[Hoop], ctx: SegmentContext
) -> list[DetectionEvent]:
    """Bagian murni setelah inferensi: tembakan per ring -> event kontrak dengan event_id deterministik."""
    shots = sorted(
        (shot for hoop in hoops for shot in detect_made_shots(observations, RimLine.from_hoop(hoop), ShotParams())),
        key=lambda s: s.t_ms,
    )
    events: list[DetectionEvent] = []
    seen: dict[int, int] = {}
    for shot in shots:
        ts = ctx.start_offset_ms + shot.t_ms
        index = seen.get(ts, 0)
        seen[ts] = index + 1
        events.append(
            BasketMade(
                event_id=make_event_id(ctx.segment_id, "basket_made", ts, index),
                session_id=ctx.session_id,
                match_id=ctx.match_id,
                segment_id=ctx.segment_id,
                camera=ctx.camera,
                sport="basketball",
                timestamp_ms=ts,
                confidence=shot.confidence,
                # TODO(decision): warna baju tim dan jarak tembakan belum dideteksi.
                payload=BasketMadePayload(),
            )
        )
    return events

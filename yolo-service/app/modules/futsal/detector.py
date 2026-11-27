import logging
from pathlib import Path

from app.core.detector import SegmentContext, SportDetector, register
from app.core.events import DetectionEvent, Goal, GoalPayload, make_event_id
from app.modules.calibration.ball import COCO_SPORTS_BALL, BallObs, iter_ball_observations
from app.modules.calibration.contract import Goal as GoalTarget
from app.modules.calibration.points import parse_calibration
from app.modules.futsal.goals import GoalParams, detect_goals

log = logging.getLogger(__name__)

# TODO(decision): bobot fine-tune futsal belum ada. Sementara YOLO11 nano pretrained COCO (sports ball).
WEIGHTS = "futsal.pt"
FALLBACK_WEIGHTS = "yolo11n.pt"
SAMPLE_FPS = 15.0  # TODO(decision): pertanyaan #12, dari hasil ukur


@register
class FutsalDetector(SportDetector):
    """Bola masuk gawang (gol).

    Event yang dihasilkan: `goal` (lihat contracts/detection-event.schema.json). Gawang dari kalibrasi Coach.
    Tim pencetak tidak diisi AI: kontrak `goal` hanya punya `team_color`, dan warna baju belum dideteksi.
    Usulan aturan tim dari sisi kamera ada di README (TODO(decision)).
    """

    sport = "futsal"

    def load(self) -> None:
        from ultralytics import YOLO  # lazy: test ringan tanpa torch

        weights = self.models_dir / WEIGHTS
        fine_tuned = weights.exists()
        self.ball_class = 0 if fine_tuned else COCO_SPORTS_BALL
        self.model = YOLO(str(weights) if fine_tuned else FALLBACK_WEIGHTS)
        self.model.to(self.device)
        log.info("futsal model loaded", extra={"fine_tuned": fine_tuned})

    def process(self, video_path: Path, ctx: SegmentContext) -> list[DetectionEvent]:
        if not ctx.calibration:
            log.warning("futsal: segment without calibration, skipped", extra={"segment_id": str(ctx.segment_id)})
            return []
        cal = parse_calibration(ctx.calibration)
        cam = cal.for_camera(ctx.camera)
        goals = [t for t in cam.targets if isinstance(t, GoalTarget)] if cam else []
        if not cam or not goals:
            log.warning("futsal: no goal calibrated for camera", extra={"camera": ctx.camera})
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
        return events_from_observations(observations, goals, ctx)


def events_from_observations(
    observations: list[BallObs], goals: list[GoalTarget], ctx: SegmentContext
) -> list[DetectionEvent]:
    """Bagian murni setelah inferensi: gol per gawang -> event kontrak dengan event_id deterministik."""
    hits = sorted((h for g in goals for h in detect_goals(observations, g, GoalParams())), key=lambda h: h.t_ms)
    events: list[DetectionEvent] = []
    seen: dict[int, int] = {}
    for hit in hits:
        ts = ctx.start_offset_ms + hit.t_ms
        index = seen.get(ts, 0)
        seen[ts] = index + 1
        events.append(
            Goal(
                event_id=make_event_id(ctx.segment_id, "goal", ts, index),
                session_id=ctx.session_id,
                match_id=ctx.match_id,
                segment_id=ctx.segment_id,
                camera=ctx.camera,
                sport="futsal",
                timestamp_ms=ts,
                confidence=hit.confidence,
                payload=GoalPayload(),
            )
        )
    return events

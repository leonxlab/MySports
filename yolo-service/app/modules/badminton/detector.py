import logging
from pathlib import Path

from app.core.config import settings
from app.core.detector import SegmentContext, SportDetector, register
from app.core.events import BallLanded, BallLandedPayload, DetectionEvent, make_event_id
from app.modules.badminton.landings import CourtObservation, detect_landings
from app.modules.calibration.points import CourtMapper, court_geometry, parse_calibration

log = logging.getLogger(__name__)

LOCAL_MODEL_DIR_NAME = "Yolo-and-TrackNet-Badminton-Analysis-main"
WEIGHTS_NAME = "best.pt"
SHUTTLE_CLASS_NAMES = {"shuttle", "shuttlecock", "ball"}
CONFIDENCE_THRESHOLD = 0.3


def _local_model_dir() -> Path:
    configured = settings.badminton_yolo_dir
    if configured is not None:
        path = configured.expanduser().resolve()
        if not path.is_dir():
            raise FileNotFoundError(f"BADMINTON_YOLO_DIR tidak ditemukan: {path}")
        return path

    for parent in Path(__file__).resolve().parents:
        vendored = parent / "vendor" / LOCAL_MODEL_DIR_NAME / "Track_Model" / "yolo11"
        if vendored.is_dir():
            return vendored
        path = parent / LOCAL_MODEL_DIR_NAME / "Track_Model" / "yolo11"
        if path.is_dir():
            return path
    raise FileNotFoundError(
        "Model YOLO badminton lokal tidak ditemukan. Set BADMINTON_YOLO_DIR ke folder Track_Model/yolo11."
    )


@register
class BadmintonDetector(SportDetector):
    """Suggest shuttle landing events using the locally supplied YOLO model."""

    sport = "badminton"

    def load(self) -> None:
        from ultralytics import YOLO

        weights_path = _local_model_dir() / WEIGHTS_NAME
        if not weights_path.is_file():
            raise FileNotFoundError(f"Bobot YOLO badminton tidak ditemukan: {weights_path}")
        self.model = YOLO(str(weights_path))
        self.model.to(self.device)
        names = self.model.names
        classes = names.items() if isinstance(names, dict) else enumerate(names)
        self.shuttle_class_ids = {
            int(class_id)
            for class_id, name in classes
            if str(name).strip().lower() in SHUTTLE_CLASS_NAMES
        }
        if not self.shuttle_class_ids:
            raise ValueError(
                f"Bobot {weights_path} tidak memiliki kelas shuttle/shuttlecock/ball; "
                f"kelas model: {list(names.values()) if isinstance(names, dict) else list(names)}"
            )
        log.info(
            "badminton YOLO model loaded",
            extra={"device": self.device, "shuttle_class_ids": sorted(self.shuttle_class_ids)},
        )

    def process(self, video_path: Path, ctx: SegmentContext) -> list[DetectionEvent]:
        if not ctx.calibration:
            log.warning(
                "badminton: segment without calibration, skipped",
                extra={"segment_id": str(ctx.segment_id)},
            )
            return []
        calibration = parse_calibration(ctx.calibration)
        if calibration.sport != "badminton":
            raise ValueError(f"Kalibrasi badminton menerima sport={calibration.sport}")
        camera_cal = calibration.for_camera(ctx.camera)
        if camera_cal is None:
            log.warning(
                "badminton: no calibration for camera, skipped",
                extra={"segment_id": str(ctx.segment_id), "camera": ctx.camera},
            )
            return []
        if not hasattr(self, "model"):
            raise RuntimeError("BadmintonDetector.load() must run before process()")

        import cv2

        mapper = CourtMapper(camera_cal, court_geometry(calibration.sport, calibration.layout))
        capture = cv2.VideoCapture(str(video_path))
        if not capture.isOpened():
            capture.release()
            raise OSError(f"Tidak bisa membuka segmen video: {video_path}")
        fps = float(capture.get(cv2.CAP_PROP_FPS))
        if fps <= 0:
            fps = 30.0
        frame_width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        if frame_width <= 0 or frame_height <= 0:
            capture.release()
            raise ValueError(f"Resolusi segmen tidak valid: {video_path}")

        observations: list[CourtObservation] = []
        frame_index = 0
        try:
            while True:
                ok, frame = capture.read()
                if not ok:
                    break
                result = self.model.predict(
                    frame,
                    conf=CONFIDENCE_THRESHOLD,
                    classes=sorted(self.shuttle_class_ids),
                    verbose=False,
                )[0]
                if result.boxes is not None and len(result.boxes) > 0:
                    best = max(result.boxes, key=lambda box: float(box.conf[0].item()))
                    x1, y1, x2, y2 = best.xyxy[0].detach().cpu().tolist()
                    x, y = (x1 + x2) / 2, (y1 + y2) / 2
                    t_ms = round(frame_index * 1000 / fps)
                    court_x, court_y = mapper.to_court(x, y, (frame_width, frame_height))
                    observations.append(
                        CourtObservation(
                            t_ms=t_ms,
                            x_m=court_x,
                            y_m=court_y,
                            x_px=x,
                            y_px=y,
                            confidence=float(best.conf[0].item()),
                        )
                    )
                frame_index += 1
        finally:
            capture.release()

        return events_from_observations(observations, calibration.layout, ctx)


def events_from_observations(
    observations: list[CourtObservation], layout: str, ctx: SegmentContext
) -> list[DetectionEvent]:
    """Convert settled shuttle tracks to deterministic, coach-confirmed ball_landed events."""
    geometry = court_geometry("badminton", layout)
    candidates = detect_landings(observations)
    events: list[DetectionEvent] = []
    seen: dict[int, int] = {}
    for landing in candidates:
        timestamp = ctx.start_offset_ms + landing.t_ms
        index = seen.get(timestamp, 0)
        seen[timestamp] = index + 1
        in_bounds = (
            -0.05 <= landing.x_m <= geometry.width_m + 0.05
            and -0.05 <= landing.y_m <= geometry.length_m + 0.05
        )
        side = ctx.camera
        if landing.y_m > geometry.length_m / 2:
            side = "away" if ctx.camera == "home" else "home"
        events.append(
            BallLanded(
                event_id=make_event_id(ctx.segment_id, "ball_landed", timestamp, index),
                session_id=ctx.session_id,
                match_id=ctx.match_id,
                segment_id=ctx.segment_id,
                camera=ctx.camera,
                sport="badminton",
                timestamp_ms=timestamp,
                confidence=landing.confidence,
                payload=BallLandedPayload(in_bounds=in_bounds, side=side),
            )
        )
    return events

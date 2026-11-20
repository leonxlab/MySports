"""Worker YOLO: python -m app.worker"""

import logging
import signal
import socket
from threading import Event
from uuid import UUID, uuid4

from app.core.backend_client import post_events
from app.core.config import settings
from app.core.detector import SegmentContext, SportDetector, registry
from app.core.device import resolve_device
from app.core.events import DetectionEvent
from app.core.supabase_client import get_supabase
from app.modules import load_all
from app.modules.jobs import queue
from app.modules.jobs.metrics import start_metrics_server
from app.modules.jobs.runner import Metrics, SegmentWorker, event_context_offset, run_worker
from app.modules.play_activity.activity import measure_activity

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("worker")


class BackendAdapter:
    def post_events(self, events: list[DetectionEvent]) -> None:
        post_events(events)


def build_context(segment: dict) -> SegmentContext:
    """Gabungkan baris video_segments dengan sesi dan perangkatnya."""
    sb = get_supabase()
    session = (
        sb.table("device_sessions")
        .select("*")
        .eq("id", segment["session_id"])
        .single()
        .execute()
        .data
    )
    device = (
        sb.table("session_devices")
        .select("role")
        .eq("id", segment["device_id"])
        .single()
        .execute()
        .data
    )
    match_sport = None
    if session.get("match_id"):
        match = (
            sb.table("matches")
            .select("sport")
            .eq("id", session["match_id"])
            .single()
            .execute()
            .data
        )
        match_sport = match["sport"]
    # TODO(integration): devices migration belum menambahkan sport sesi dan start_offset_ms.
    return SegmentContext(
        segment_id=UUID(segment["id"]),
        session_id=UUID(segment["session_id"]),
        match_id=UUID(session["match_id"]) if session.get("match_id") else None,
        camera="home" if device["role"] == "camera_home" else "away",
        sport=match_sport or session.get("sport") or "basketball",
        start_offset_ms=event_context_offset(segment),
        calibration=session.get("calibration") or {},
    )


def main() -> None:
    load_all()
    device = resolve_device()
    worker_id = f"{socket.gethostname()}-{uuid4().hex[:6]}"
    log.info("worker started", extra={"worker_id": worker_id, "device": device})
    settings.tmp_dir.mkdir(parents=True, exist_ok=True)

    detectors: dict[str, SportDetector] = {}

    def load_detector(sport: str) -> SportDetector:
        if sport not in detectors:
            detector_type = registry().get(sport)
            if detector_type is None:
                raise ValueError(f"unsupported sport: {sport}")
            detectors[sport] = detector_type(device, settings.models_dir)
            detectors[sport].load()
        return detectors[sport]

    metrics = Metrics()
    worker = SegmentWorker(
        worker_id=worker_id,
        tmp_dir=settings.tmp_dir,
        queue=queue,
        storage=queue,
        backend=BackendAdapter(),
        build_context=build_context,
        load_detector=load_detector,
        measure_activity=measure_activity,
        metrics=metrics,
    )
    stop = Event()
    signal.signal(signal.SIGTERM, lambda _signum, _frame: stop.set())
    signal.signal(signal.SIGINT, lambda _signum, _frame: stop.set())
    metrics_server, metrics_thread = start_metrics_server(metrics, queue)
    try:
        run_worker(worker, queue, stop, settings.poll_interval_seconds)
    finally:
        metrics_server.should_exit = True
        metrics_thread.join(timeout=5)


if __name__ == "__main__":
    main()

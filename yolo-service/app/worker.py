"""Worker YOLO: python -m app.worker"""

import logging
import socket
import time
from pathlib import Path
from uuid import UUID, uuid4

from app.core.backend_client import post_events
from app.core.config import settings
from app.core.detector import SegmentContext, SportDetector, registry
from app.core.device import resolve_device
from app.core.supabase_client import get_supabase
from app.modules import load_all
from app.modules.jobs import queue
from app.modules.play_activity.activity import measure_activity

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("worker")


def build_context(segment: dict) -> SegmentContext:
    """Gabungkan baris video_segments dengan sesi dan perangkatnya."""
    sb = get_supabase()
    session = (
        sb.table("device_sessions").select("*").eq("id", segment["session_id"]).single().execute().data
    )
    device = (
        sb.table("session_devices").select("role").eq("id", segment["device_id"]).single().execute().data
    )
    match_sport = None
    if session.get("match_id"):
        match = sb.table("matches").select("sport").eq("id", session["match_id"]).single().execute().data
        match_sport = match["sport"]
    return SegmentContext(
        segment_id=UUID(segment["id"]),
        session_id=UUID(segment["session_id"]),
        match_id=UUID(session["match_id"]) if session.get("match_id") else None,
        camera="home" if device["role"] == "camera_home" else "away",
        sport=match_sport or "basketball",  # TODO(decision): sesi main sendiri tanpa match, cabang dari sesi
        calibration=session.get("calibration") or {},
    )


def main() -> None:
    load_all()
    device = resolve_device()
    worker_id = f"{socket.gethostname()}-{uuid4().hex[:6]}"
    log.info("worker %s mulai, device=%s, detektor=%s", worker_id, device, sorted(registry()))

    detectors: dict[str, SportDetector] = {}
    settings.tmp_dir.mkdir(parents=True, exist_ok=True)

    while True:
        segment = queue.claim_next(worker_id)
        if not segment:
            time.sleep(settings.poll_interval_seconds)
            continue

        requeued = False
        path = Path(segment["storage_path"])
        local = settings.tmp_dir / f"{segment['id']}{path.suffix or '.mp4'}"
        try:
            local.write_bytes(queue.download(segment["storage_path"]))
            ctx = build_context(segment)

            if ctx.sport not in detectors:
                detectors[ctx.sport] = registry()[ctx.sport](device, settings.models_dir)
                detectors[ctx.sport].load()

            events = detectors[ctx.sport].process(local, ctx)
            activity = measure_activity(local, ctx)
            if activity:
                events.append(activity)

            post_events(events)
            queue.mark_done(segment["id"])
        except Exception as exc:  # noqa: BLE001
            log.exception("segmen %s gagal", segment["id"])
            requeued = queue.mark_failed(segment["id"], str(exc), segment.get("attempts", 1)) == "queued"
        finally:
            # Video tidak boleh tertinggal (rules.md bagian 7), baik sukses maupun gagal
            local.unlink(missing_ok=True)
            # Segmen yang masuk antrean lagi untuk percobaan ulang masih dibutuhkan
            if not requeued:
                try:
                    queue.delete_segment(segment["storage_path"])
                except Exception:  # noqa: BLE001
                    log.warning("gagal menghapus segmen %s dari storage", segment["id"])


if __name__ == "__main__":
    main()

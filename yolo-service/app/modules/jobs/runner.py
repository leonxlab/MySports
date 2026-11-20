"""Provider-independent processing loop for claimed video segments."""

import gc
import logging
import shutil
import tempfile
import time
from collections.abc import Callable
from pathlib import Path
from threading import Event
from typing import Any, Protocol

from app.core.detector import SegmentContext, SportDetector
from app.core.events import DetectionEvent

log = logging.getLogger(__name__)
DOWNLOAD_RETRIES = 3
BACKEND_RETRIES = 3
RETRY_BASE_SECONDS = 0.5
MIN_FREE_DISK_BYTES = 50 * 1024 * 1024
MAX_SEGMENT_BYTES = 50 * 1024 * 1024


class Queue(Protocol):
    def claim_next(self, worker_id: str) -> dict[str, Any] | None: ...

    def mark_done(self, segment_id: str) -> None: ...

    def mark_failed(self, segment_id: str, error: str, attempts: int) -> str: ...

    def requeue_stale_segments(self, stale_seconds: int) -> int: ...

    def queue_depth(self) -> int: ...


class Storage(Protocol):
    def download(self, storage_path: str) -> bytes: ...

    def delete_segment(self, storage_path: str) -> None: ...


class BackendClient(Protocol):
    def post_events(self, events: list[DetectionEvent]) -> None: ...


class Metrics:
    def __init__(self) -> None:
        self.completed = 0
        self.failed = 0
        self.processed_seconds = 0.0
        self.processed_count = 0

    def record(self, status: str, elapsed_seconds: float) -> None:
        if status == "done":
            self.completed += 1
        elif status == "failed":
            self.failed += 1
        self.processed_seconds += elapsed_seconds
        self.processed_count += 1

    def snapshot(self, queue_depth: int) -> dict[str, int | float]:
        average = self.processed_seconds / self.processed_count if self.processed_count else 0.0
        return {
            "queue_depth": queue_depth,
            "completed": self.completed,
            "failed": self.failed,
            "average_process_seconds": round(average, 3),
        }


def _retry(operation: Callable[[], Any], attempts: int) -> Any:
    for attempt in range(attempts):
        try:
            return operation()
        except Exception:
            if attempt + 1 == attempts:
                raise
            time.sleep(RETRY_BASE_SECONDS * (2**attempt))
    raise RuntimeError("retry loop exited unexpectedly")


def _release_gpu_memory() -> None:
    gc.collect()
    try:
        import torch
    except ImportError:
        return
    try:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception as exc:
        log.warning("GPU memory cleanup failed", extra={"error_type": type(exc).__name__})


class SegmentWorker:
    def __init__(
        self,
        worker_id: str,
        tmp_dir: Path,
        queue: Queue,
        storage: Storage,
        backend: BackendClient,
        build_context: Callable[[dict[str, Any]], SegmentContext],
        load_detector: Callable[[str], SportDetector],
        measure_activity: Callable[[Path, SegmentContext], DetectionEvent | None],
        metrics: Metrics,
    ) -> None:
        self.worker_id = worker_id
        self.tmp_dir = tmp_dir
        self.queue = queue
        self.storage = storage
        self.backend = backend
        self.build_context = build_context
        self.load_detector = load_detector
        self.measure_activity = measure_activity
        self.metrics = metrics

    def process_next(self) -> bool:
        segment = self.queue.claim_next(self.worker_id)
        if not segment:
            return False

        segment_id = str(segment["id"])
        storage_path = str(segment["storage_path"])
        attempts = int(segment.get("attempts", 1))
        started = time.monotonic()
        local_path: Path | None = None
        retry_queued = False

        try:
            self.tmp_dir.mkdir(parents=True, exist_ok=True)
            expected_size = int(segment.get("size_bytes") or MIN_FREE_DISK_BYTES)
            if shutil.disk_usage(self.tmp_dir).free < expected_size + MIN_FREE_DISK_BYTES:
                raise OSError("insufficient temporary disk space")

            suffix = Path(storage_path).suffix or ".mp4"
            with tempfile.NamedTemporaryFile(
                dir=self.tmp_dir, prefix=f"{segment_id}-", suffix=suffix, delete=False
            ) as output:
                local_path = Path(output.name)
                content = _retry(
                    lambda: self.storage.download(storage_path),
                    DOWNLOAD_RETRIES,
                )
                if len(content) > MAX_SEGMENT_BYTES:
                    raise ValueError("segment exceeds the configured size limit")
                output.write(content)

            context = self.build_context(segment)
            detector = self.load_detector(context.sport)
            events = detector.process(local_path, context)
            activity = self.measure_activity(local_path, context)
            if activity:
                events.append(activity)

            _retry(lambda: self.backend.post_events(events), BACKEND_RETRIES)
            _retry(lambda: self.storage.delete_segment(storage_path), DOWNLOAD_RETRIES)
            self.queue.mark_done(segment_id)
            self.metrics.record("done", time.monotonic() - started)
            log.info(
                "segment processed", extra={"segment_id": segment_id, "event_count": len(events)}
            )
        except Exception as exc:
            log.error(
                "segment processing failed",
                extra={"segment_id": segment_id, "error_type": type(exc).__name__},
            )
            retry_queued = (
                self.queue.mark_failed(segment_id, type(exc).__name__, attempts) == "queued"
            )
            if not retry_queued:
                try:
                    _retry(
                        lambda: self.storage.delete_segment(storage_path),
                        DOWNLOAD_RETRIES,
                    )
                except Exception as delete_error:
                    log.error(
                        "failed segment storage cleanup failed",
                        extra={
                            "segment_id": segment_id,
                            "error_type": type(delete_error).__name__,
                        },
                    )
            self.metrics.record(
                "queued" if retry_queued else "failed",
                time.monotonic() - started,
            )
        finally:
            if local_path:
                try:
                    local_path.unlink(missing_ok=True)
                except OSError as cleanup_error:
                    log.error(
                        "temporary segment cleanup failed",
                        extra={
                            "segment_id": segment_id,
                            "error_type": type(cleanup_error).__name__,
                        },
                    )
            _release_gpu_memory()
        return True


def run_worker(worker: SegmentWorker, queue: Queue, stop: Event, poll_seconds: float) -> None:
    """Finish in-flight work after shutdown is requested and recover abandoned claims."""
    while not stop.is_set():
        recovered = queue.requeue_stale_segments(stale_seconds=1800)
        if recovered:
            log.warning("requeued stale segments", extra={"count": recovered})
        if not worker.process_next():
            stop.wait(poll_seconds)


def event_context_offset(segment: dict[str, Any]) -> int:
    """Read an offset when devices supplies one; current schema has no offset column yet."""
    value = segment.get("start_offset_ms")
    return max(0, int(value)) if value is not None else 0

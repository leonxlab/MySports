from pathlib import Path
from threading import Event
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.detector import SegmentContext, SportDetector
from app.modules.jobs import runner
from app.modules.jobs.metrics import create_metrics_app


class FakeQueue:
    def __init__(self, status: str = "done") -> None:
        self.status = status
        self.done = False
        self.failed: list[tuple[str, str, int]] = []
        self.stale_requeue_timeouts: list[int] = []

    def claim_next(self, worker_id: str) -> dict | None:
        return {
            "id": "segment-1",
            "session_id": str(uuid4()),
            "device_id": "device-1",
            "storage_path": "session/segment.mp4",
            "size_bytes": 4,
            "attempts": 2,
        }

    def mark_done(self, segment_id: str) -> None:
        self.done = True

    def mark_failed(self, segment_id: str, error: str, attempts: int) -> str:
        self.failed.append((segment_id, error, attempts))
        return self.status

    def requeue_stale_segments(self, stale_seconds: int) -> int:
        self.stale_requeue_timeouts.append(stale_seconds)
        return 0

    def queue_depth(self) -> int:
        return 0


class FakeStorage:
    def __init__(self, content: bytes = b"data") -> None:
        self.content = content
        self.deleted: list[str] = []

    def download(self, storage_path: str) -> bytes:
        return self.content

    def delete_segment(self, storage_path: str) -> None:
        self.deleted.append(storage_path)


class FakeBackend:
    def __init__(self, failure: bool = False) -> None:
        self.failure = failure

    def post_events(self, events: list) -> None:
        if self.failure:
            raise OSError("network unavailable")


class FakeDetector(SportDetector):
    sport = "futsal"

    def load(self) -> None:
        pass

    def process(self, video_path: Path, ctx: SegmentContext) -> list:
        assert video_path.exists()
        return []


def build_worker(
    tmp_path: Path,
    queue: FakeQueue,
    storage: FakeStorage,
    backend: FakeBackend,
) -> runner.SegmentWorker:
    context = SegmentContext(
        segment_id=uuid4(),
        session_id=uuid4(),
        match_id=None,
        camera="home",
        sport="futsal",
    )
    return runner.SegmentWorker(
        worker_id="test-worker",
        tmp_dir=tmp_path,
        queue=queue,
        storage=storage,
        backend=backend,
        build_context=lambda _segment: context,
        load_detector=lambda _sport: FakeDetector("cpu", tmp_path),
        measure_activity=lambda _path, _context: None,
        metrics=runner.Metrics(),
    )


def test_success_deletes_video_marks_done_and_cleans_tmp(tmp_path: Path) -> None:
    queue = FakeQueue()
    storage = FakeStorage()
    worker = build_worker(tmp_path, queue, storage, FakeBackend())

    assert worker.process_next()
    assert queue.done
    assert storage.deleted == ["session/segment.mp4"]
    assert list(tmp_path.iterdir()) == []


def test_temporary_backend_failure_requeues_without_deleting(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(runner, "RETRY_BASE_SECONDS", 0)
    queue = FakeQueue(status="queued")
    storage = FakeStorage()
    worker = build_worker(tmp_path, queue, storage, FakeBackend(failure=True))

    assert worker.process_next()
    assert queue.failed == [("segment-1", "OSError", 2)]
    assert storage.deleted == []
    assert list(tmp_path.iterdir()) == []


def test_permanent_failure_deletes_segment(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(runner, "RETRY_BASE_SECONDS", 0)
    queue = FakeQueue(status="failed")
    storage = FakeStorage()
    worker = build_worker(tmp_path, queue, storage, FakeBackend(failure=True))

    assert worker.process_next()
    assert queue.failed == [("segment-1", "OSError", 2)]
    assert storage.deleted == ["session/segment.mp4"]
    assert list(tmp_path.iterdir()) == []


def test_event_offset_is_zero_until_devices_supplies_it() -> None:
    assert runner.event_context_offset({"seq": 5}) == 0
    assert runner.event_context_offset({"start_offset_ms": 12_500}) == 12_500


def test_shutdown_waits_for_current_segment(tmp_path: Path) -> None:
    stop = Event()
    queue = FakeQueue()
    storage = FakeStorage()

    class StopBackend:
        def post_events(self, events: list) -> None:
            stop.set()

    worker = build_worker(tmp_path, queue, storage, StopBackend())
    runner.run_worker(worker, queue, stop, poll_seconds=0)

    assert queue.done
    assert storage.deleted == ["session/segment.mp4"]
    assert queue.stale_requeue_timeouts == [1800]


def test_metrics_endpoint_reports_queue_and_processing_counts() -> None:
    queue = FakeQueue()
    metrics = runner.Metrics()
    metrics.record("done", 2.0)
    metrics.record("failed", 4.0)
    client = TestClient(create_metrics_app(metrics, queue))

    response = client.get("/metrics")

    assert response.status_code == 200
    assert response.json() == {
        "queue_depth": 0,
        "completed": 1,
        "failed": 1,
        "average_process_seconds": 3.0,
    }

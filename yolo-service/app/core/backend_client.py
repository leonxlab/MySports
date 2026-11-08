import httpx

from app.core.config import settings
from app.core.events import DetectionEvent


def post_events(events: list[DetectionEvent]) -> None:
    """Kirim batch kejadian ke backend. Aman dikirim ulang: backend memakai event_id."""
    if not events:
        return
    res = httpx.post(
        f"{settings.backend_url}/api/v1/devices/events",
        headers={"x-service-key": settings.yolo_service_key},
        json={"events": [e.model_dump(mode="json") for e in events]},
        timeout=30,
    )
    res.raise_for_status()

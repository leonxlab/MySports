"""Live camera inference over WebSocket for the local scoring demo."""

import asyncio
import logging
import threading
import time
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.detector import SportDetector, registry
from app.core.device import resolve_device

log = logging.getLogger(__name__)
router = APIRouter()
MAX_FRAME_BYTES = 2_000_000
MAX_FRAME_DIMENSION = 2560
CONFIDENCE_THRESHOLD = 0.25


@lru_cache(maxsize=5)
def _load_detector(sport: str) -> SportDetector:
    detector_type = registry().get(sport)
    if detector_type is None:
        raise ValueError(f"Olahraga tidak didukung: {sport}")
    detector = detector_type(resolve_device(), settings.models_dir)
    detector.load()
    return detector


_detector_load_lock = threading.Lock()
_detector_inference_locks: dict[str, threading.Lock] = {}


def _get_detector(sport: str) -> SportDetector:
    with _detector_load_lock:
        return _load_detector(sport)


@dataclass(eq=False)
class _Peer:
    websocket: WebSocket
    role: str
    queue: asyncio.Queue[dict[str, Any]] = field(default_factory=lambda: asyncio.Queue(maxsize=1))


_rooms: dict[str, set[_Peer]] = {}
_rooms_lock = asyncio.Lock()


def _predict(detector: SportDetector, sport: str, frame: np.ndarray) -> dict[str, Any]:
    if not hasattr(detector, "model"):
        raise RuntimeError(f"Model YOLO untuk {sport} belum dimuat")

    allowed_classes = getattr(detector, "shuttle_class_ids", None)
    if allowed_classes is None:
        allowed_classes = [getattr(detector, "ball_class", 32)]
    else:
        allowed_classes = sorted(allowed_classes)

    lock = _detector_inference_locks.setdefault(sport, threading.Lock())
    started = time.perf_counter()
    with lock:
        result = detector.model.predict(
            frame,
            conf=CONFIDENCE_THRESHOLD,
            classes=allowed_classes,
            imgsz=640,
            verbose=False,
        )[0]
    inference_ms = round((time.perf_counter() - started) * 1000, 1)
    names = result.names
    detections = []
    if result.boxes is not None:
        for box in result.boxes:
            class_id = int(box.cls[0].item())
            x1, y1, x2, y2 = box.xyxy[0].detach().cpu().tolist()
            detections.append(
                {
                    "classId": class_id,
                    "label": str(names[class_id]),
                    "confidence": round(float(box.conf[0].item()), 4),
                    "box": [round(float(value), 1) for value in (x1, y1, x2, y2)],
                }
            )
    height, width = frame.shape[:2]
    return {
        "type": "inference",
        "sport": sport,
        "inferenceMs": inference_ms,
        "frameSize": {"width": width, "height": height},
        "detections": detections,
        "scoring": "not_available",
    }


async def _join(room: str, peer: _Peer) -> bool:
    async with _rooms_lock:
        peers = _rooms.setdefault(room, set())
        if peer.role == "camera" and (
            not any(existing.role == "coach" for existing in peers)
            or any(existing.role == "camera" for existing in peers)
        ):
            if not peers:
                _rooms.pop(room, None)
            return False
        peers.add(peer)
        return True


async def _leave(room: str, peer: _Peer) -> None:
    async with _rooms_lock:
        peers = _rooms.get(room)
        if peers is None:
            return
        peers.discard(peer)
        if not peers:
            _rooms.pop(room, None)


async def _publish(room: str, payload: dict[str, Any]) -> None:
    async with _rooms_lock:
        peers = tuple(_rooms.get(room, ()))
    for peer in peers:
        if peer.queue.full():
            try:
                peer.queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
        peer.queue.put_nowait(payload)


async def _send_queue(peer: _Peer) -> None:
    while True:
        await peer.websocket.send_json(await peer.queue.get())


@router.websocket("/live/{sport}/{pin}")
async def live_inference(websocket: WebSocket, sport: str, pin: str) -> None:
    role = websocket.query_params.get("role", "")
    if (
        not settings.live_demo_enabled
        or sport not in registry()
        or role not in {"camera", "coach"}
        or len(pin) != 6
        or not pin.isdigit()
    ):
        await websocket.close(code=1008)
        return

    await websocket.accept()
    room = f"{sport}:{pin}"
    peer = _Peer(websocket=websocket, role=role)
    if not await _join(room, peer):
        await websocket.send_json(
            {
                "type": "error",
                "message": "Pastikan Coach sudah terhubung dan sesi belum memiliki kamera.",
            }
        )
        await websocket.close(code=1008)
        return

    sender = asyncio.create_task(_send_queue(peer))
    try:
        await websocket.send_json({"type": "connected", "role": role, "sport": sport})
        if role == "camera":
            try:
                detector = await run_in_threadpool(_get_detector, sport)
            except Exception as error:
                log.exception("live YOLO model could not be loaded", extra={"sport": sport})
                await websocket.send_json(
                    {"type": "error", "message": f"Model YOLO tidak siap: {error}"}
                )
                return

            await websocket.send_json({"type": "ready", "sport": sport})
            while True:
                message = await websocket.receive()
                if message["type"] == "websocket.disconnect":
                    break
                frame_bytes = message.get("bytes")
                if not frame_bytes:
                    continue
                if len(frame_bytes) > MAX_FRAME_BYTES:
                    await websocket.send_json(
                        {"type": "error", "message": "Ukuran frame terlalu besar."}
                    )
                    continue
                frame = await run_in_threadpool(
                    cv2.imdecode, np.frombuffer(frame_bytes, dtype=np.uint8), cv2.IMREAD_COLOR
                )
                if frame is None:
                    await websocket.send_json(
                        {"type": "error", "message": "Frame kamera tidak valid."}
                    )
                    continue
                height, width = frame.shape[:2]
                if max(height, width) > MAX_FRAME_DIMENSION:
                    await websocket.send_json(
                        {"type": "error", "message": "Resolusi frame terlalu tinggi."}
                    )
                    continue
                try:
                    result = await run_in_threadpool(_predict, detector, sport, frame)
                except Exception:
                    log.exception("live YOLO inference failed", extra={"sport": sport})
                    await websocket.send_json(
                        {"type": "error", "message": "Inferensi YOLO gagal memproses frame."}
                    )
                    continue
                await _publish(room, result)
        else:
            while True:
                message = await websocket.receive()
                if message["type"] == "websocket.disconnect":
                    break
    except WebSocketDisconnect:
        pass
    finally:
        sender.cancel()
        await _leave(room, peer)
        await asyncio.gather(sender, return_exceptions=True)

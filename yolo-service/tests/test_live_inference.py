from types import SimpleNamespace

import cv2
import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

import app.live as live
from app.live import _predict


class FakeBox:
    def __init__(self, class_id: int, confidence: float, coordinates: list[float]):
        self.cls = [SimpleNamespace(item=lambda: class_id)]
        self.conf = [SimpleNamespace(item=lambda: confidence)]
        self.xyxy = [
            SimpleNamespace(
                detach=lambda: SimpleNamespace(
                    cpu=lambda: SimpleNamespace(tolist=lambda: coordinates)
                )
            )
        ]


class FakeModel:
    def __init__(self):
        self.classes = None

    def predict(self, frame, **kwargs):
        self.classes = kwargs["classes"]
        return [
            SimpleNamespace(
                names={32: "sports ball"},
                boxes=[FakeBox(32, 0.91, [10, 20, 40, 60])],
            )
        ]


class FakeDetector:
    def __init__(self):
        self.model = FakeModel()
        self.ball_class = 32


def test_predict_returns_live_ball_detection_and_uses_sport_class():
    model = FakeModel()
    detector = SimpleNamespace(model=model, ball_class=32)

    result = _predict(detector, "basketball", np.zeros((80, 100, 3), dtype=np.uint8))

    assert model.classes == [32]
    assert result["type"] == "inference"
    assert result["sport"] == "basketball"
    assert result["frameSize"] == {"width": 100, "height": 80}
    assert result["detections"] == [
        {
            "classId": 32,
            "label": "sports ball",
            "confidence": 0.91,
            "box": [10.0, 20.0, 40.0, 60.0],
        }
    ]
    assert result["scoring"] == "not_available"


def test_camera_frames_are_inferred_and_forwarded_to_coach(monkeypatch):
    detector = FakeDetector()
    monkeypatch.setattr(live, "_get_detector", lambda sport: detector)
    monkeypatch.setattr(live, "registry", lambda: {"basketball": FakeDetector})
    monkeypatch.setattr(live.settings, "live_demo_enabled", True)
    app = FastAPI()
    app.include_router(live.router)
    ok, encoded = cv2.imencode(".jpg", np.zeros((80, 100, 3), dtype=np.uint8))
    assert ok

    with TestClient(app) as client:
        with client.websocket_connect("/live/basketball/123456?role=coach") as coach:
            assert coach.receive_json()["type"] == "connected"
            with client.websocket_connect("/live/basketball/123456?role=camera") as camera:
                assert camera.receive_json()["type"] == "connected"
                assert camera.receive_json()["type"] == "ready"
                camera.send_bytes(encoded.tobytes())

                camera_result = camera.receive_json()
                coach_result = coach.receive_json()

    assert camera_result["type"] == "inference"
    assert camera_result == coach_result
    assert camera_result["detections"][0]["label"] == "sports ball"


def test_live_demo_websocket_is_disabled_by_default(monkeypatch):
    monkeypatch.setattr(live.settings, "live_demo_enabled", False)
    app = FastAPI()
    app.include_router(live.router)

    with TestClient(app) as client:
        with pytest.raises(WebSocketDisconnect) as error:
            with client.websocket_connect("/live/badminton/123456?role=coach"):
                pass

    assert error.value.code == 1008

from fastapi.testclient import TestClient

from app.core.detector import registry
from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_gpu_endpoint_tidak_crash_tanpa_torch():
    assert "cuda" in client.get("/gpu").json()


def test_lima_cabang_terdaftar():
    assert sorted(registry()) == ["badminton", "basketball", "futsal", "padel", "tennis"]
    assert client.get("/detectors").json()["sports"] == sorted(registry())

"""Halaman uji coba YOLO untuk dev lokal. Terpisah dari layanan utama (app.main).

Jalankan dari folder yolo-service:
    python -m uvicorn app.demo:app --port 8002
lalu buka http://localhost:8002

Mode basket: YOLO mencari bola, ring dicari otomatis (app/demo_rims.py) atau ditandai pengguna, lalu aturan
"bola masuk" (app/demo_shots.py) menghitung tembakan. Half court = 1 ring, full court = 2 ring. Skor hanya hidup di halaman; tidak menyentuh Supabase atau backend.
Bobot bawaan: models/yolo11n.pt (kelas COCO, termasuk "person" dan "sports ball"). Ganti lewat
environment variable DEMO_MODEL. Model ring: models/basketball.pt (atau DEMO_RIM_MODEL) bila punya kelas ring.
"""

import io
import os
import threading
import time
from functools import lru_cache
from pathlib import Path
from types import SimpleNamespace

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

import numpy as np

from app.core.config import settings
from app.demo_rims import pick, rims_from_backboard, rims_from_color, rims_from_model
from app.demo_shots import RimLine, detect_made_shots

# Tanpa ini ultralytics mencoba memasang paket sendiri (misal pi-heif saat gambar tidak terbaca).
os.environ.setdefault("YOLO_AUTOINSTALL", "false")

MAX_IMAGE_BYTES = 8 * 1024 * 1024
PAGE = Path(__file__).with_name("demo.html")

app = FastAPI(title="Peluit YOLO demo")
_lock = threading.Lock()


# MODELS_DIR relatif dihitung dari folder yolo-service, bukan dari folder tempat server dijalankan.
MODELS = Path(__file__).resolve().parent.parent / settings.models_dir


def model_path() -> Path:
    return Path(os.environ.get("DEMO_MODEL") or MODELS / "yolo11n.pt")


def rim_model_path() -> Path:
    return Path(os.environ.get("DEMO_RIM_MODEL") or MODELS / "basketball.pt")


def device() -> str:
    if settings.device != "auto":
        return settings.device
    import torch

    return "cuda" if torch.cuda.is_available() else "cpu"


@lru_cache(maxsize=2)
def load_model(path: str):
    from ultralytics import YOLO

    return YOLO(path)


def open_image(data: bytes) -> Image.Image:
    try:
        return Image.open(io.BytesIO(data)).convert("RGB")
    # ImportError: setelah ultralytics dimuat, Image.open mencoba pi_heif untuk file yang tidak dikenal.
    except (UnidentifiedImageError, OSError, ImportError, Image.DecompressionBombError) as e:
        raise HTTPException(400, "File bukan gambar yang bisa dibaca") from e


def detect_image(data: bytes, conf: float, rim_count: int = 0) -> dict:
    path = model_path()
    # Cek dulu: ultralytics mengunduh otomatis bila file tidak ada, di sini sengaja tidak.
    if not path.is_file():
        raise HTTPException(503, f"Bobot model tidak ditemukan: {path.resolve()}")
    image = open_image(data)

    with _lock:
        model = load_model(str(path))
        dev = device()
        started = time.perf_counter()
        # imgsz 1280: bola jauh dari kamera hanya beberapa piksel, di 640 sering hilang
        result = model.predict(image, conf=conf, imgsz=1280, device=dev, verbose=False)[0]
        elapsed_ms = (time.perf_counter() - started) * 1000

    detections = [
        {"label": result.names[int(cls)], "confidence": round(score, 3), "box": [round(v, 1) for v in box]}
        for box, score, cls in zip(
            result.boxes.xyxy.tolist(), result.boxes.conf.tolist(), result.boxes.cls.tolist()
        )
    ]
    out = {
        "width": image.width,
        "height": image.height,
        "model": path.name,
        "device": dev,
        "ms": round(elapsed_ms, 1),
        "detections": detections,
    }
    if rim_count:
        # lacak ring di frame yang sama, untuk kamera yang bergerak (pan/zoom)
        out["rims"] = find_rims_in(image, rim_count)
    return out


@app.get("/")
def page():
    return FileResponse(PAGE, media_type="text/html")


@app.get("/status")
def status():
    path = model_path()
    return {
        "model": path.name,
        "modelReady": path.is_file(),
        "rimModel": rim_model_path().name if rim_model_path().is_file() else None,
        "device": device(),
    }


def find_rims(data: bytes, count: int) -> dict:
    return find_rims_in(open_image(data), count)


def find_rims_in(image: Image.Image, count: int) -> dict:
    path = rim_model_path()
    if path.is_file():
        with _lock:
            rims = rims_from_model(load_model(str(path)), image, device())
        if rims:
            return {"source": path.name, "rims": pick(rims, count)}
    # Heuristik warna disetel pada gambar ~960 px; gambar lebih besar diperkecil dulu, hasil diskalakan balik.
    scale = min(1.0, 960 / max(image.size))
    small = image if scale == 1 else image.resize((round(image.width * scale), round(image.height * scale)))
    rgb = np.asarray(small)

    def back(rims: list[dict]) -> list[dict]:
        return [{**r, **{k: round(r[k] / scale, 1) for k in ("x1", "y1", "x2", "y2")}} for r in rims]

    orange = pick(rims_from_color(rgb), count)
    if len(orange) >= count:
        return {"source": "warna oranye", "rims": back(orange)}
    board = pick(orange + rims_from_backboard(rgb), count)
    return {"source": "papan putih + ring", "rims": back(board)}


class Observation(BaseModel):
    t_ms: int
    x: float
    y: float
    conf: float


class ShotsRequest(BaseModel):
    """Ring = dua ujung bibir ring; semua koordinat dalam piksel frame yang sama."""

    x1: float
    y1: float
    x2: float
    y2: float
    observations: list[Observation] = Field(max_length=600)


@app.post("/shots")
def shots(body: ShotsRequest):
    rim = RimLine(min(body.x1, body.x2), max(body.x1, body.x2), (body.y1 + body.y2) / 2)
    if rim.width < 5:
        raise HTTPException(400, "Tandai ring dari ujung kiri ke ujung kanan")
    observations = [SimpleNamespace(**o.model_dump()) for o in body.observations]
    return [{"t_ms": m.t_ms, "confidence": m.confidence} for m in detect_made_shots(observations, rim)]


async def read_image_body(request: Request) -> bytes:
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "Gambar terlalu besar (maksimal 8 MB)")
    if not data:
        raise HTTPException(400, "Body kosong")
    return bytes(data)


@app.post("/detect")
async def detect(
    request: Request,
    conf: float = Query(0.25, ge=0.01, le=1.0),
    rims: int = Query(0, ge=0, le=2, description="Juga cari ring sebanyak ini (0 = tidak)"),
):
    """Body = byte gambar mentah (JPEG/PNG)."""
    return await run_in_threadpool(detect_image, await read_image_body(request), conf, rims)


@app.post("/rims")
async def rims(request: Request, count: int = Query(1, ge=1, le=2)):
    """Cari `count` ring (1 = half court, 2 = full court). Body = byte gambar mentah."""
    return await run_in_threadpool(find_rims, await read_image_body(request), count)

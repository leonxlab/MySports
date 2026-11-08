from fastapi import FastAPI

from app.core.detector import registry
from app.core.device import gpu_info
from app.modules import load_all

load_all()

app = FastAPI(title="Open Play YOLO service")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/gpu")
def gpu():
    return gpu_info()


@app.get("/detectors")
def detectors():
    return {"sports": sorted(registry().keys())}

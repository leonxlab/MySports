import logging

from app.core.config import settings

log = logging.getLogger(__name__)


def resolve_device() -> str:
    if settings.device != "auto":
        return settings.device
    try:
        import torch  # impor lazy supaya test ringan tidak butuh torch

        return "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        return "cpu"


def gpu_info() -> dict:
    try:
        import torch

        if torch.cuda.is_available():
            return {
                "cuda": True,
                "name": torch.cuda.get_device_name(0),
                "memory_gb": round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1),
            }
    except ImportError:
        pass
    return {"cuda": False}

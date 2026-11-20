"""Jalankan satu detektor pada satu klip lokal, tanpa Supabase dan tanpa backend.

Pemakaian (dari folder yolo-service):
    python -m scripts.run_detector basketball path/ke/klip.mp4

Dipakai untuk menguji detektor di laptop RTX dan mengukur kecepatan. Hasil benchmark dicatat di docs/benchmarks.md.
"""

import sys
import time
from pathlib import Path
from uuid import uuid4

from app.core.config import settings
from app.core.detector import SegmentContext, registry
from app.core.device import gpu_info, resolve_device
from app.modules import load_all


def main(sport: str, video: str) -> None:
    load_all()
    if sport not in registry():
        sys.exit(f"Cabang tidak dikenal: {sport}. Pilihan: {sorted(registry())}")

    device = resolve_device()
    print("device:", device, gpu_info())

    detector = registry()[sport](device, settings.models_dir)
    detector.load()

    ctx = SegmentContext(
        segment_id=uuid4(), session_id=uuid4(), match_id=None, camera="home", sport=sport
    )
    start = time.perf_counter()
    events = detector.process(Path(video), ctx)
    elapsed = time.perf_counter() - start

    for event in events:
        print(event.model_dump_json())
    print(f"{len(events)} kejadian, waktu proses {elapsed:.1f} detik")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Pemakaian: python -m scripts.run_detector <cabang> <klip.mp4>")
    main(sys.argv[1], sys.argv[2])

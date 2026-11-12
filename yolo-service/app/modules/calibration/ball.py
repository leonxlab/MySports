"""Posisi bola per frame dari model YOLO. Dipakai detektor basket dan futsal.

Inferensi (OpenCV + ultralytics) diimpor lazy supaya test ringan tidak butuh GPU. Frame hanya ada di
memori: tidak ada yang ditulis ke disk atau log (rules.md bagian 7).
"""

from __future__ import annotations

import logging
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

# Kelas "sports ball" di COCO, dipakai model pretrained sebelum ada bobot fine-tune per cabang.
COCO_SPORTS_BALL = 32


@dataclass(frozen=True)
class BallObs:
    """Satu pengamatan bola. Koordinat piksel di frame ACUAN kalibrasi (sudah diskalakan)."""

    frame: int
    t_ms: int  # posisi di dalam segmen
    x: float
    y: float
    conf: float


def best_ball(
    boxes: list[tuple[float, float, float, float, float, int]], ball_class: int
) -> tuple[float, float, float] | None:
    """Pilih deteksi bola paling yakin dari (x1, y1, x2, y2, conf, cls). Hasil: (cx, cy, conf)."""
    best: tuple[float, float, float] | None = None
    for x1, y1, x2, y2, conf, cls in boxes:
        if int(cls) != ball_class:
            continue
        if best is None or conf > best[2]:
            best = ((x1 + x2) / 2, (y1 + y2) / 2, float(conf))
    return best


def iter_ball_observations(
    model: Any,
    video_path: Path,
    *,
    sample_fps: float,
    ref_size: tuple[int, int] | None,
    ball_class: int = COCO_SPORTS_BALL,
    min_conf: float = 0.25,
    batch_size: int = 16,
) -> Iterator[BallObs]:
    """Baca video, ambil frame pada `sample_fps`, jalankan model per batch, keluarkan posisi bola.

    `ref_size` = (lebar, tinggi) frame acuan kalibrasi; posisi diskalakan ke sana.
    """
    import cv2  # lazy

    cap = cv2.VideoCapture(str(video_path))
    try:
        src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        step = max(1, round(src_fps / sample_fps))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        sx = ref_size[0] / width if ref_size and width else 1.0
        sy = ref_size[1] / height if ref_size and height else 1.0

        batch: list[Any] = []
        meta: list[tuple[int, int]] = []

        def flush() -> Iterator[BallObs]:
            results = model.predict(batch, conf=min_conf, verbose=False)
            for (frame_no, t_ms), result in zip(meta, results, strict=True):
                boxes = [(*b.xyxy[0].tolist(), float(b.conf[0]), int(b.cls[0])) for b in result.boxes]
                found = best_ball(boxes, ball_class)
                if found:
                    yield BallObs(frame_no, t_ms, found[0] * sx, found[1] * sy, found[2])
            batch.clear()
            meta.clear()

        index = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if index % step == 0:
                batch.append(frame)
                meta.append((index, round(index * 1000 / src_fps)))
                if len(batch) >= batch_size:
                    yield from flush()
            index += 1
        if batch:
            yield from flush()
    finally:
        cap.release()

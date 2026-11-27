"""Cari ring basket di satu frame. Dipakai halaman demo (app.demo).

Dua sumber, dicoba berurutan:
1. Model dengan kelas ring ("rim", "hoop", "basket", ...) bila bobotnya ada, misal models/basketball.pt.
   Belum ada bobot seperti itu di repo: tiga repo referensi (nvan21, isBre, Peachypie98) tidak
   menyertakan bobot dan tidak punya lisensi, jadi tidak dipakai.
2. Cadangan tanpa model: cari bentuk oranye yang pipih (ring dari depan tampak sebagai elips gepeng)
   di bagian atas frame. Heuristik ini ditulis sendiri; gagal bila ring bukan oranye, sangat kecil,
   atau ada benda oranye pipih lain (papan iklan, baju). Pengguna bisa menandai ring manual.

Koordinat hasil dalam piksel gambar yang dikirim.
"""

from __future__ import annotations

import numpy as np

RIM_LABELS = {"rim", "hoop", "basket", "basketball hoop", "ring", "net"}


def model_rim_classes(names: dict[int, str]) -> list[int]:
    return [i for i, n in names.items() if n.lower() in RIM_LABELS]


def rims_from_model(model, image, dev: str, conf: float = 0.25) -> list[dict]:
    classes = model_rim_classes(model.names)
    if not classes:
        return []
    result = model.predict(image, conf=conf, classes=classes, device=dev, verbose=False)[0]
    return [
        {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "conf": float(c)}
        for (x1, y1, x2, y2), c in zip(result.boxes.xyxy.tolist(), result.boxes.conf.tolist())
    ]


def rims_from_color(rgb: np.ndarray) -> list[dict]:
    import cv2

    h, w = rgb.shape[:2]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    # oranye-merah: hue di dua ujung lingkaran warna OpenCV (0-180)
    mask = cv2.inRange(hsv, (0, 110, 80), (22, 255, 255)) | cv2.inRange(hsv, (168, 110, 80), (180, 255, 255))
    # sambung lengkung ring yang putus karena jaring atau bola
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(3, w // 160), 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    found = []
    for contour in contours:
        x, y, bw, bh = cv2.boundingRect(contour)
        # < 2% lebar frame: terlalu kecil untuk dibedakan dari bintik oranye lain
        if x < 0.03 * w or x + bw > 0.97 * w:
            continue  # menempel tepi layar: hampir selalu spanduk/lampu, ring jarang di tepi
        if bw < 0.02 * w or bw > 0.3 * w or bh < 3:
            continue
        aspect = bw / bh
        if aspect < 1.8 or aspect > 14:
            continue  # bola (bulat) atau garis lapangan (sangat panjang)
        if y + bh / 2 > 0.6 * h:
            continue  # ring tidak berada dekat lantai (juga menyaring baju oranye pemain)
        fill = cv2.contourArea(contour) / (bw * bh)
        # elips penuh ~0,79; lengkung ring tipis lebih kecil. Kotak padat (papan, baju) dihukum.
        shape = 1.0 - max(0.0, fill - 0.8) * 3
        conf = max(0.05, min(0.95, shape * (0.5 + min(aspect, 6) / 12)))
        found.append({"x1": x, "y1": y, "x2": x + bw, "y2": y + bh, "conf": round(conf, 3)})
    return found


def rims_from_backboard(rgb: np.ndarray) -> list[dict]:
    """Cadangan bila ring tidak oranye terang: cari papan putih, lalu ring kemerahan di bawahnya.

    Bila ring tidak terlihat sama sekali, posisi ring diperkirakan dari ukuran papan (ring ~27% lebar papan,
    sedikit di atas tepi bawah papan) dengan keyakinan rendah.
    """
    import cv2

    h, w = rgb.shape[:2]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    white = cv2.inRange(hsv, (0, 0, 170), (180, 60, 255))
    contours, _ = cv2.findContours(white, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    # ring kemerahan pudar (cat merah memudar, putih-merah). Papan sendiri bisa sedikit merah muda (S ~40).
    red = cv2.inRange(hsv, (0, 48, 90), (12, 255, 255)) | cv2.inRange(hsv, (165, 48, 90), (180, 255, 255))
    red = cv2.morphologyEx(red, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (5, 3)))

    found = []
    for contour in contours:
        x, y, bw, bh = cv2.boundingRect(contour)
        if x <= 2 or y <= 2 or x + bw >= w - 2:
            continue  # langit atau dinding yang menyentuh tepi frame
        if bw < 0.04 * w or bw > 0.25 * w or not 1.0 <= bw / bh <= 2.2:
            continue
        if y + bh / 2 > 0.7 * h or cv2.contourArea(contour) / (bw * bh) < 0.6:
            continue
        # cari ring di pita bawah papan sampai sedikit di bawahnya
        sx1, sx2 = max(0, int(x - 0.1 * bw)), min(w, int(x + 1.1 * bw))
        sy1, sy2 = int(y + 0.55 * bh), min(h, int(y + bh + 0.35 * bh))
        best = None
        sub, _ = cv2.findContours(red[sy1:sy2, sx1:sx2], cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in sub:
            rx, ry, rw, rh = cv2.boundingRect(c)
            if rw >= 0.12 * bw and rw / max(rh, 1) >= 1.5 and (best is None or rw > best[2]):
                best = (rx + sx1, ry + sy1, rw, rh)
        if best:
            rx, ry, rw, rh = best
            found.append({"x1": rx, "y1": ry, "x2": rx + rw, "y2": ry + rh, "conf": 0.6})
        else:
            cx, rw = x + bw / 2, 0.27 * bw
            cy = y + bh * 0.9
            found.append({"x1": cx - rw / 2, "y1": cy - 3, "x2": cx + rw / 2, "y2": cy + 3, "conf": 0.3})
    return found


def pick(rims: list[dict], count: int) -> list[dict]:
    """Ambil `count` ring paling yakin yang tidak saling tumpang tindih, urut dari kiri ke kanan."""
    chosen: list[dict] = []
    for r in sorted(rims, key=lambda r: r["conf"], reverse=True):
        overlap = any(r["x1"] < c["x2"] and c["x1"] < r["x2"] and r["y1"] < c["y2"] and c["y1"] < r["y2"] for c in chosen)
        if not overlap:
            chosen.append(r)
        if len(chosen) == count:
            break
    return sorted(chosen, key=lambda r: r["x1"])

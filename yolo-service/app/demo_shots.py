# Disalin dari branch origin/feat/basketball-shot-detector (app/modules/basketball/shots.py).
# SATU perubahan untuk demo: `occluded_gap_ms` (bola tertutup jaring saat masuk, lihat ShotParams).
# Usulkan ke pemilik modul basketball sebelum dipakai di sana.
"""Mesin status murni: urutan posisi bola -> tembakan masuk. Dites tanpa GPU.

Aturan "bola masuk" (semua di piksel frame acuan kalibrasi):
1. Bibir depan ring dari kalibrasi: garis horizontal y = rim_y antara x_left dan x_right.
2. Bola harus terlihat DI ATAS ring (y < rim_y - margin) di dalam jendela horizontal ring yang diperlebar.
3. Lalu terlihat DI BAWAH ring (y > rim_y + margin) paling lambat `max_gap_ms` setelah pengamatan di atas.
4. Titik potong lintasan dengan garis ring (interpolasi linear antara dua pengamatan itu) harus jatuh di
   dalam bibir ring (dengan toleransi kecil). Ini menolak bola yang lewat di samping ring.
5. Gerakan dari bawah ke atas diabaikan. Setelah satu tembakan masuk, `cooldown_ms` meredam hitungan ganda.

Kasus sulit (lihat README): bola menggelinding di bibir ring lalu keluar (tidak pernah menembus ke bawah,
jadi tidak dihitung), bola tertutup pemain tepat saat masuk (celah pengamatan > max_gap_ms = terlewat),
kamera dari samping membuat bola di depan ring tampak "di bawah" (hindari dengan posisi kamera di belakang ring).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.modules.calibration.ball import BallObs
    from app.modules.calibration.contract import Hoop


@dataclass(frozen=True)
class RimLine:
    x_left: float
    x_right: float
    y: float

    @classmethod
    def from_hoop(cls, hoop: Hoop) -> RimLine:
        a, b = hoop.points
        return cls(min(a.x, b.x), max(a.x, b.x), (a.y + b.y) / 2)

    @property
    def width(self) -> float:
        return self.x_right - self.x_left


@dataclass(frozen=True)
class ShotParams:
    """TODO(decision): angka awal, disetel dari klip uji di laptop RTX."""

    margin_ratio: float = 0.15  # jarak vertikal minimum dari ring, kali lebar ring
    window_ratio: float = 1.0  # lebar jendela "di atas ring" di kiri-kanan ring, kali lebar ring
    crossing_tolerance_ratio: float = 0.15  # toleransi titik potong di luar bibir ring, kali lebar ring
    max_gap_ms: int = 600
    # Bola sering tidak terdeteksi saat lewat jaring. Bila TIDAK ada pengamatan sama sekali di antara
    # "di atas" dan "di bawah", jeda sampai sekian ms tetap diterima. Ada pengamatan di sekitar bibir ring
    # (bola bergulir) = jeda biasa (max_gap_ms), supaya bola yang memantul lalu jatuh di sisi tidak terhitung.
    occluded_gap_ms: int = 1500
    # ...tapi bola yang muncul lagi setelah tertutup harus sudah di bawah jaring (jaring ~1 lebar ring).
    # Bola yang memantul keluar lalu jatuh di samping ring terlihat lagi lebih dekat ke ring.
    occluded_min_drop_ratio: float = 1.0
    cooldown_ms: int = 1500


@dataclass(frozen=True)
class Made:
    t_ms: int  # waktu bola menembus ring (pengamatan pertama di bawah ring)
    confidence: float


def detect_made_shots(
    observations: list[BallObs], rim: RimLine, params: ShotParams | None = None
) -> list[Made]:
    p = params or ShotParams()
    margin = p.margin_ratio * rim.width
    window = p.window_ratio * rim.width
    tol = p.crossing_tolerance_ratio * rim.width

    made: list[Made] = []
    above: BallObs | None = None
    seen_since_above = 0
    last_made_ms: int | None = None

    for obs in sorted(observations, key=lambda o: o.t_ms):
        in_window = rim.x_left - window <= obs.x <= rim.x_right + window
        if obs.y < rim.y - margin and in_window:
            above = obs
            seen_since_above = 0
            continue
        if above is None:
            continue
        if obs.y <= rim.y + margin:
            seen_since_above += 1
            continue  # di sekitar bibir ring: tunggu pengamatan berikutnya
        # obs di bawah ring
        gap = obs.t_ms - above.t_ms
        hidden = gap > p.max_gap_ms and not seen_since_above
        if hidden and obs.y - rim.y < p.occluded_min_drop_ratio * rim.width:
            above = None
            continue
        if gap > (p.occluded_gap_ms if hidden else p.max_gap_ms):
            above = None
            continue
        frac = (rim.y - above.y) / (obs.y - above.y)
        cross_x = above.x + frac * (obs.x - above.x)
        through = rim.x_left - tol <= cross_x <= rim.x_right + tol
        cooled = last_made_ms is None or obs.t_ms - last_made_ms >= p.cooldown_ms
        if through and cooled:
            made.append(Made(obs.t_ms, min(above.conf, obs.conf)))
            last_made_ms = obs.t_ms
        above = None
    return made

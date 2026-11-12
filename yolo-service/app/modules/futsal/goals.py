"""Mesin status murni: urutan posisi bola -> gol. Dites tanpa GPU.

Aturan "gol" (piksel frame acuan, mulut gawang dari kalibrasi Coach):
1. Gawang "siap": bola pernah terlihat DI LUAR mulut gawang (diperlebar `outside_margin`).
2. Bola lalu terlihat DI DALAM mulut gawang (diperkecil `inside_inset`, supaya bola yang menyentuh tiang
   atau mistar dari luar tidak dihitung) sebanyak `min_inside` pengamatan berturut-turut, tiap jeda
   antar-pengamatan paling lama `max_gap_ms`.
3. Setelah gol, gawang tidak siap lagi sampai bola terlihat di luar lagi DAN `cooldown_ms` lewat. Ini meredam
   bola yang diam di jaring agar tidak dihitung berulang.

Keterbatasan 2D: kamera melihat mulut gawang sebagai poligon, bukan bidang garis gawang. Bola di belakang
jaring atau melambung di atas mistar tapi "terproyeksi" di dalam poligon bisa salah dihitung. Lihat README.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from app.modules.calibration.points import point_in_target

if TYPE_CHECKING:
    from app.modules.calibration.ball import BallObs
    from app.modules.calibration.contract import Goal


@dataclass(frozen=True)
class GoalParams:
    """TODO(decision): angka awal, disetel dari klip uji di laptop RTX."""

    inside_inset_ratio: float = 0.05  # perkecil mulut gawang, kali lebar gawang
    outside_margin_ratio: float = 0.10  # perlebar mulut gawang untuk status "di luar", kali lebar gawang
    min_inside: int = 2
    max_gap_ms: int = 400
    cooldown_ms: int = 3000


@dataclass(frozen=True)
class GoalHit:
    t_ms: int  # pengamatan pertama di dalam gawang
    confidence: float


def goal_width(goal: Goal) -> float:
    xs = [p.x for p in goal.points]
    return max(xs) - min(xs)


def detect_goals(observations: list[BallObs], goal: Goal, params: GoalParams | None = None) -> list[GoalHit]:
    p = params or GoalParams()
    width = goal_width(goal)
    inset = -p.inside_inset_ratio * width
    margin = p.outside_margin_ratio * width

    hits: list[GoalHit] = []
    armed = False
    run: list[BallObs] = []
    last_hit_ms: int | None = None

    for obs in sorted(observations, key=lambda o: o.t_ms):
        inside = point_in_target(obs.x, obs.y, goal, margin_px=inset)
        if not inside:
            run = []
            if not point_in_target(obs.x, obs.y, goal, margin_px=margin):
                cooled = last_hit_ms is None or obs.t_ms - last_hit_ms >= p.cooldown_ms
                armed = armed or cooled
            continue
        if not armed:
            continue
        if run and obs.t_ms - run[-1].t_ms > p.max_gap_ms:
            run = []
        run.append(obs)
        if len(run) >= p.min_inside:
            hits.append(GoalHit(run[0].t_ms, min(o.conf for o in run)))
            last_hit_ms = run[0].t_ms
            armed = False
            run = []
    return hits

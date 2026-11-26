"""Mesin status gol futsal dengan lintasan sintetis (tanpa GPU, tanpa video)."""

from collections.abc import Sequence
from uuid import uuid4

from app.core.detector import SegmentContext
from app.modules.calibration.ball import BallObs
from app.modules.calibration.contract import Goal, Point
from app.modules.futsal.detector import events_from_observations
from app.modules.futsal.goals import GoalParams, detect_goals

# Mulut gawang: x 800..1100, y 400 (mistar) .. 600 (garis). Lebar 300 px.
GOAL = Goal(points=[Point(x=800, y=600), Point(x=1100, y=600), Point(x=1100, y=400), Point(x=800, y=400)])


def path(points: Sequence[tuple[float, float]], start_ms: int = 0, step_ms: int = 66) -> list[BallObs]:
    return [BallObs(i, start_ms + i * step_ms, x, y, 0.8) for i, (x, y) in enumerate(points)]


# Bola dari lapangan masuk ke tengah gawang dan diam di jaring.
SHOT_IN = [(500, 700), (700, 600), (900, 520), (950, 500), (960, 505), (960, 510), (962, 510)]
# Bola melebar di samping tiang kanan.
WIDE = [(500, 700), (900, 650), (1150, 520), (1250, 480)]
# Bola membentur tiang kiri (tepat di tepi) lalu memantul keluar.
POST = [(500, 700), (790, 520), (805, 520), (700, 600)]


def test_gol_terdeteksi_sekali_walau_bola_diam_di_jaring():
    hits = detect_goals(path(SHOT_IN), GOAL)
    assert len(hits) == 1
    assert hits[0].t_ms == 2 * 66


def test_melebar_dan_membentur_tiang_tidak_dihitung():
    assert detect_goals(path(WIDE), GOAL) == []
    assert detect_goals(path(POST), GOAL) == []


def test_satu_pengamatan_di_dalam_tidak_cukup():
    assert detect_goals(path([(500, 700), (950, 500), (500, 700)]), GOAL) == []


def test_bola_sudah_di_dalam_sejak_awal_segmen_tidak_dihitung():
    # Gawang belum "siap" karena bola tidak pernah terlihat di luar dulu.
    assert detect_goals(path([(950, 500), (955, 500), (960, 500)]), GOAL) == []


def test_dua_gol_terpisah_dan_peredaman():
    first = path(SHOT_IN)
    second = path(SHOT_IN, start_ms=10_000)
    assert [h.t_ms for h in detect_goals(first + second, GOAL)] == [132, 10_132]
    # Bola keluar sebentar lalu masuk lagi dalam cooldown: tetap satu gol.
    bounce = path([(500, 700), (950, 500)], start_ms=1000)
    assert len(detect_goals(first + bounce, GOAL, GoalParams(cooldown_ms=3000, min_inside=1))) == 1


def test_event_id_deterministik_dan_offset_segmen():
    ctx = SegmentContext(
        segment_id=uuid4(), session_id=uuid4(), match_id=None, camera="away", sport="futsal", start_offset_ms=30_000
    )
    a = events_from_observations(path(SHOT_IN), [GOAL], ctx)
    b = events_from_observations(path(SHOT_IN), [GOAL], ctx)
    assert len(a) == 1
    assert a[0].event_id == b[0].event_id
    assert a[0].timestamp_ms == 30_132
    assert a[0].type == "goal"

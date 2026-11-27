"""Mesin status tembakan basket dengan lintasan sintetis (tanpa GPU, tanpa video)."""

from collections.abc import Sequence
from uuid import uuid4

from app.core.detector import SegmentContext
from app.modules.basketball.detector import events_from_observations
from app.modules.basketball.shots import RimLine, ShotParams, detect_made_shots
from app.modules.calibration.ball import BallObs, best_ball
from app.modules.calibration.contract import Hoop, Point
from scripts.evaluate_events import match_events

# Ring: bibir depan dari x=900 sampai x=1000 pada y=300 (lebar 100 px).
HOOP = Hoop(points=[Point(x=900, y=300), Point(x=1000, y=300)])
RIM = RimLine.from_hoop(HOOP)


def path(points: Sequence[tuple[float, float]], start_ms: int = 0, step_ms: int = 66) -> list[BallObs]:
    return [BallObs(i, start_ms + i * step_ms, x, y, 0.8) for i, (x, y) in enumerate(points)]


# Bola datang dari kiri atas, turun menembus ring di tengah.
MAKE = [(700, 100), (800, 150), (900, 220), (950, 250), (950, 340), (950, 400)]
# Bola lewat di samping kanan ring.
MISS_SIDE = [(900, 100), (1000, 180), (1100, 250), (1150, 340), (1180, 420)]
# Bola memantul di bibir ring lalu keluar ke atas dan menjauh (tidak pernah di bawah ring).
RIM_OUT = [(800, 150), (920, 260), (960, 295), (1000, 290), (1050, 230), (1150, 180)]


def test_bola_masuk_terdeteksi_sekali():
    shots = detect_made_shots(path(MAKE), RIM)
    assert len(shots) == 1
    assert shots[0].t_ms == 4 * 66


def test_bola_meleset_di_samping_tidak_dihitung():
    assert detect_made_shots(path(MISS_SIDE), RIM) == []


def test_memantul_di_ring_lalu_keluar_tidak_dihitung():
    assert detect_made_shots(path(RIM_OUT), RIM) == []


def test_gerak_dari_bawah_ke_atas_diabaikan():
    assert detect_made_shots(path(list(reversed(MAKE))), RIM) == []


def test_celah_pengamatan_terlalu_lama_tidak_dihitung():
    obs = path(MAKE[:4]) + [BallObs(9, 3000, 950, 340, 0.8)]
    assert detect_made_shots(obs, RIM) == []


def test_dua_tembakan_berdekatan_dan_peredaman():
    first = path(MAKE)
    second = path(MAKE, start_ms=3000)
    assert [s.t_ms for s in detect_made_shots(first + second, RIM)] == [264, 3264]
    # Tembakan kedua di dalam cooldown dianggap hitungan ganda.
    close = path(MAKE, start_ms=600)
    assert len(detect_made_shots(first + close, RIM, ShotParams(cooldown_ms=1500))) == 1


def test_event_id_deterministik_dan_offset_segmen():
    ctx = SegmentContext(
        segment_id=uuid4(),
        session_id=uuid4(),
        match_id=None,
        camera="home",
        sport="basketball",
        start_offset_ms=60_000,
    )
    a = events_from_observations(path(MAKE), [HOOP], ctx)
    b = events_from_observations(path(MAKE), [HOOP], ctx)
    assert len(a) == 1
    assert a[0].event_id == b[0].event_id
    assert a[0].timestamp_ms == 60_000 + 264
    assert a[0].type == "basket_made"


def test_best_ball_memilih_kelas_dan_keyakinan_tertinggi():
    boxes = [(0, 0, 10, 10, 0.9, 0), (100, 100, 110, 110, 0.5, 32), (200, 200, 220, 220, 0.7, 32)]
    assert best_ball(boxes, 32) == (210, 210, 0.7)
    assert best_ball(boxes, 5) is None


def test_evaluasi_presisi_recall_duplikat():
    r = match_events([1000, 1100, 5000, 9000], [1000, 5200, 7000], tolerance_ms=300)
    assert (r.true_positive, r.false_positive, r.false_negative, r.duplicates) == (2, 1, 1, 1)
    assert round(r.recall, 2) == 0.67

"""Test geometri kalibrasi dengan titik sintetis (tanpa GPU, tanpa opencv)."""

import numpy as np
import pytest

from app.modules.calibration.contract import Calibration, Goal, Hoop, Point
from app.modules.calibration.points import (
    CourtMapper,
    apply_homography,
    compute_homography,
    court_geometry,
    parse_calibration,
    point_in_polygon,
)

# Perspektif sintetis lapangan -> piksel (kamera di belakang garis dekat, sedikit miring).
H_TRUE = np.array([[60.0, 8.0, 400.0], [2.0, -20.0, 1000.0], [0.0, 0.012, 1.0]])


def to_pixel(x: float, y: float) -> tuple[float, float]:
    return apply_homography(H_TRUE, x, y)


def make_calibration(sport: str = "basketball", layout: str = "full_court", targets=None) -> Calibration:
    geo = court_geometry(sport, layout)
    corners = [dict(zip(("x", "y"), to_pixel(x, y), strict=True)) for x, y in geo.corners_m]
    return parse_calibration(
        {
            "version": 1,
            "sport": sport,
            "layout": layout,
            "cameras": {
                "home": {
                    "frame": {"width": 1920, "height": 1080},
                    "court_corners": corners,
                    "targets": targets or [],
                    "marked_at": "2026-11-12T08:00:00Z",
                }
            },
        }
    )


def test_sudut_sintetis_berada_di_dalam_frame():
    for x, y in court_geometry("basketball", "full_court").corners_m:
        px, py = to_pixel(x, y)
        assert 0 <= px <= 1920 and 0 <= py <= 1080


def test_homografi_memetakan_balik_titik_sintetis():
    mapper = CourtMapper.from_calibration(make_calibration(), "home")
    for court_pt in [(0.0, 0.0), (7.5, 14.0), (3.2, 25.1), (15.0, 28.0), (11.0, 2.5)]:
        px, py = to_pixel(*court_pt)
        cx, cy = mapper.to_court(px, py)
        assert cx == pytest.approx(court_pt[0], abs=1e-6)
        assert cy == pytest.approx(court_pt[1], abs=1e-6)


def test_skala_resolusi_segmen_berbeda():
    mapper = CourtMapper.from_calibration(make_calibration(), "home")
    px, py = to_pixel(7.5, 14.0)
    # segmen 1280x720 = frame acuan 1920x1080 dikali 2/3
    cx, cy = mapper.to_court(px * 2 / 3, py * 2 / 3, frame_size=(1280, 720))
    assert (cx, cy) == pytest.approx((7.5, 14.0), abs=1e-6)


def test_di_dalam_luar_dan_di_atas_garis():
    mapper = CourtMapper.from_calibration(make_calibration(), "home")
    assert mapper.is_inside(*to_pixel(7.5, 14.0))
    assert not mapper.is_inside(*to_pixel(-1.0, 14.0))
    assert not mapper.is_inside(*to_pixel(7.5, 29.0))
    # tepat di garis samping dihitung masuk; 3 cm di luar masih dalam toleransi 5 cm
    assert mapper.is_inside(*to_pixel(15.0, 10.0))
    assert mapper.is_inside(*to_pixel(15.03, 10.0))
    assert not mapper.is_inside(*to_pixel(15.03, 10.0), tolerance_m=0.0)


def test_jarak_ke_garis_bernama():
    mapper = CourtMapper.from_calibration(make_calibration(), "home")
    assert mapper.distance_to_line(*to_pixel(7.5, 13.0), "center") == pytest.approx(1.0, abs=1e-6)
    assert mapper.distance_to_line(*to_pixel(14.0, 5.0), "right_sideline") == pytest.approx(1.0, abs=1e-6)
    with pytest.raises(ValueError):
        mapper.distance_to_line(0, 0, "three_point")


def test_area_ring_dan_gawang():
    hoop = Hoop(points=[Point(x=940, y=200), Point(x=980, y=200)])
    goal = Goal(points=[Point(x=800, y=500), Point(x=1100, y=500), Point(x=1100, y=400), Point(x=800, y=400)])
    mapper = CourtMapper.from_calibration(make_calibration(targets=[hoop.model_dump()]), "home")
    assert mapper.in_target_area(960, 200, hoop)
    assert mapper.in_target_area(960, 215, hoop)  # setengah lebar ring (20 px) di bawah bibir
    assert not mapper.in_target_area(960, 260, hoop)
    assert mapper.in_target_area(960, 260, hoop, margin_px=50)
    assert mapper.in_target_area(950, 450, goal)
    assert not mapper.in_target_area(1200, 450, goal)


def test_layout_menentukan_dimensi():
    assert court_geometry("badminton", "singles").width_m < court_geometry("badminton", "doubles").width_m
    assert court_geometry("basketball", "half_court").length_m == court_geometry("basketball", "full_court").length_m / 2
    with pytest.raises(ValueError):
        court_geometry("futsal", "doubles")


def test_titik_segaris_ditolak():
    with pytest.raises(ValueError):
        compute_homography([(0, 0), (1, 1), (2, 2), (3, 3)], [(0, 0), (1, 0), (1, 1), (0, 1)])


def test_kamera_tanpa_kalibrasi_ditolak():
    with pytest.raises(ValueError):
        CourtMapper.from_calibration(make_calibration(), "away")


def test_point_in_polygon_dasar():
    square = [(0, 0), (10, 0), (10, 10), (0, 10)]
    assert point_in_polygon(5, 5, square)
    assert not point_in_polygon(15, 5, square)

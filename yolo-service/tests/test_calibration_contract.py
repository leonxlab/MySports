import json
from pathlib import Path
from typing import get_args

import pytest
from pydantic import ValidationError

from app.modules.calibration.contract import LAYOUTS_BY_SPORT, Calibration, Layout, Sport

CONTRACT = json.loads(
    (Path(__file__).parents[2] / "contracts" / "calibration.schema.json").read_text(encoding="utf-8")
)

CAMERA = {
    "frame": {"width": 1920, "height": 1080},
    "court_corners": [
        {"x": 100, "y": 1000},
        {"x": 1800, "y": 1000},
        {"x": 1500, "y": 300},
        {"x": 400, "y": 300},
    ],
    "targets": [{"kind": "hoop", "points": [{"x": 940, "y": 200}, {"x": 980, "y": 200}]}],
    "marked_at": "2026-11-12T08:00:00+07:00",
}
VALID = {"version": 1, "sport": "basketball", "layout": "full_court", "cameras": {"home": CAMERA}}


def test_kalibrasi_lengkap_diterima():
    cal = Calibration.model_validate(VALID)
    assert cal.for_camera("home") is not None
    assert cal.for_camera("away") is None


def test_sudut_kurang_ditolak():
    bad = {**VALID, "cameras": {"home": {**CAMERA, "court_corners": CAMERA["court_corners"][:3]}}}
    with pytest.raises(ValidationError):
        Calibration.model_validate(bad)


def test_titik_gawang_kurang_ditolak():
    goal = {"kind": "goal", "points": CAMERA["court_corners"][:3]}
    bad = {**VALID, "sport": "futsal", "layout": "standard", "cameras": {"home": {**CAMERA, "targets": [goal]}}}
    with pytest.raises(ValidationError):
        Calibration.model_validate(bad)


def test_titik_di_luar_frame_ditolak():
    bad = {**VALID, "cameras": {"home": {**CAMERA, "frame": {"width": 1280, "height": 720}}}}
    with pytest.raises(ValidationError):
        Calibration.model_validate(bad)


def test_tanpa_kamera_dan_layout_salah_ditolak():
    with pytest.raises(ValidationError):
        Calibration.model_validate({**VALID, "cameras": {}})
    with pytest.raises(ValidationError):
        Calibration.model_validate({**VALID, "layout": "doubles"})


def test_enum_cocok_dengan_kontrak_json():
    assert set(get_args(Sport)) == set(CONTRACT["properties"]["sport"]["enum"])
    assert set(get_args(Layout)) == set(CONTRACT["properties"]["layout"]["enum"])


def test_layout_per_cabang_cocok_dengan_kontrak_json():
    for rule in CONTRACT["allOf"]:
        cond = rule["if"]["properties"]["sport"]
        sports = [cond["const"]] if "const" in cond else cond["enum"]
        then = rule["then"]["properties"]["layout"]
        layouts = [then["const"]] if "const" in then else then["enum"]
        for sport in sports:
            assert set(LAYOUTS_BY_SPORT[sport]) == set(layouts)


def test_target_cocok_dengan_kontrak_json():
    branches = CONTRACT["$defs"]["target"]["oneOf"]
    assert {b["properties"]["kind"]["const"]: b["properties"]["points"]["minItems"] for b in branches} == {
        "hoop": 2,
        "goal": 4,
    }

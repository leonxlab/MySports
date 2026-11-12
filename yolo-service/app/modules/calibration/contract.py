"""Kontrak kalibrasi lapangan.

Sumber kebenaran: contracts/calibration.schema.json.
Cermin zod: backend/src/modules/devices/schema.ts (calibrationSchema).
Ubah file contracts dulu (PR terpisah), lalu file ini dan cermin zod.

TODO(decision): titik wajib per cabang masih usulan (4 sudut + ring/gawang).
"""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Sport = Literal["basketball", "badminton", "tennis", "padel", "futsal"]
Layout = Literal["full_court", "half_court", "singles", "doubles", "standard"]

LAYOUTS_BY_SPORT: dict[str, tuple[str, ...]] = {
    "basketball": ("full_court", "half_court"),
    "badminton": ("singles", "doubles"),
    "tennis": ("singles", "doubles"),
    "padel": ("standard",),
    "futsal": ("standard",),
}

_strict = ConfigDict(extra="forbid")


class Point(BaseModel):
    model_config = _strict
    x: Annotated[float, Field(ge=0)]
    y: Annotated[float, Field(ge=0)]


class Frame(BaseModel):
    model_config = _strict
    width: Annotated[int, Field(ge=1)]
    height: Annotated[int, Field(ge=1)]


class Hoop(BaseModel):
    """Ujung kiri dan kanan bibir depan ring."""

    model_config = _strict
    kind: Literal["hoop"] = "hoop"
    points: Annotated[list[Point], Field(min_length=2, max_length=2)]


class Goal(BaseModel):
    """Mulut gawang: tiang kiri bawah, tiang kanan bawah, mistar kanan atas, mistar kiri atas."""

    model_config = _strict
    kind: Literal["goal"] = "goal"
    points: Annotated[list[Point], Field(min_length=4, max_length=4)]


Target = Annotated[Hoop | Goal, Field(discriminator="kind")]


class CameraCalibration(BaseModel):
    model_config = _strict
    frame: Frame
    # dekat kiri, dekat kanan, jauh kanan, jauh kiri (dilihat dari kamera)
    court_corners: Annotated[list[Point], Field(min_length=4, max_length=4)]
    targets: Annotated[list[Target], Field(max_length=2)]
    marked_at: datetime

    @model_validator(mode="after")
    def _points_inside_frame(self) -> "CameraCalibration":
        # Tidak bisa ditulis di JSON Schema: titik harus di dalam frame acuan.
        points = [*self.court_corners, *(p for t in self.targets for p in t.points)]
        if any(p.x > self.frame.width or p.y > self.frame.height for p in points):
            raise ValueError("Titik kalibrasi di luar frame")
        return self


class Cameras(BaseModel):
    model_config = _strict
    home: CameraCalibration | None = None
    away: CameraCalibration | None = None

    @model_validator(mode="after")
    def _at_least_one(self) -> "Cameras":
        if self.home is None and self.away is None:
            raise ValueError("Minimal satu kamera")
        return self


class Calibration(BaseModel):
    model_config = _strict
    version: Literal[1]
    sport: Sport
    layout: Layout
    cameras: Cameras

    @model_validator(mode="after")
    def _layout_matches_sport(self) -> "Calibration":
        if self.layout not in LAYOUTS_BY_SPORT[self.sport]:
            raise ValueError(f"Layout {self.layout} tidak sah untuk {self.sport}")
        return self

    def for_camera(self, camera: Literal["home", "away"]) -> CameraCalibration | None:
        return getattr(self.cameras, camera)

"""Kontrak event YOLO -> backend.

Sumber kebenaran: contracts/detection-event.schema.json.
Ubah file contracts dulu (PR terpisah), lalu file ini dan backend/src/modules/devices/schema.ts.
"""

from typing import Annotated, Literal
from uuid import NAMESPACE_URL, UUID, uuid5

from pydantic import BaseModel, Field

Sport = Literal["basketball", "badminton", "tennis", "padel", "futsal"]
Camera = Literal["home", "away"]


class _Base(BaseModel):
    event_id: UUID  # kunci idempotensi, dibuat di sini
    session_id: UUID
    match_id: UUID | None
    segment_id: UUID
    camera: Camera
    sport: Sport
    timestamp_ms: Annotated[int, Field(ge=0)]
    confidence: Annotated[float, Field(ge=0, le=1)]


class BasketMadePayload(BaseModel):
    team_color: str | None = None
    shot_distance_m: Annotated[float, Field(ge=0)] | None = None


class GoalPayload(BaseModel):
    team_color: str | None = None


class BallLandedPayload(BaseModel):
    in_bounds: bool
    side: Literal["home", "away"] | None = None


class PlayActivityPayload(BaseModel):
    active_seconds: Annotated[float, Field(ge=0)]
    players_detected: Annotated[int, Field(ge=0)]


class BasketMade(_Base):
    type: Literal["basket_made"] = "basket_made"
    payload: BasketMadePayload


class Goal(_Base):
    type: Literal["goal"] = "goal"
    payload: GoalPayload


class BallLanded(_Base):
    type: Literal["ball_landed"] = "ball_landed"
    payload: BallLandedPayload


class PlayActivity(_Base):
    type: Literal["play_activity"] = "play_activity"
    payload: PlayActivityPayload


DetectionEvent = BasketMade | Goal | BallLanded | PlayActivity


def make_event_id(segment_id: UUID, event_type: str, timestamp_ms: int, index: int = 0) -> UUID:
    """ID kejadian yang deterministik.

    Segmen yang diproses ulang (percobaan ulang, worker mati di tengah) menghasilkan ID yang sama,
    jadi backend yang menyimpan dengan kunci event_id tidak menggandakan skor.
    `index` membedakan dua kejadian bertipe sama pada milidetik yang sama.
    """
    return uuid5(NAMESPACE_URL, f"openplay:{segment_id}:{event_type}:{timestamp_ms}:{index}")

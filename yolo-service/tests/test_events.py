import json
from pathlib import Path
from uuid import uuid4

import pytest
from pydantic import TypeAdapter, ValidationError

from app.core.events import DetectionEvent, make_event_id

BASE = {
    "event_id": str(uuid4()),
    "session_id": str(uuid4()),
    "match_id": None,
    "segment_id": str(uuid4()),
    "camera": "home",
    "sport": "futsal",
    "timestamp_ms": 1000,
    "confidence": 0.8,
}
adapter = TypeAdapter(DetectionEvent)


def test_goal_valid():
    ev = adapter.validate_python({**BASE, "type": "goal", "payload": {"team_color": "blue"}})
    assert ev.type == "goal"


def test_ball_landed_butuh_in_bounds():
    with pytest.raises(ValidationError):
        adapter.validate_python({**BASE, "type": "ball_landed", "payload": {}})


def test_tipe_semua_ada_di_kontrak_json():
    schema = json.loads(
        (Path(__file__).parents[2] / "contracts" / "detection-event.schema.json").read_text()
    )
    in_contract = {
        branch["properties"]["type"]["const"] for branch in schema["$defs"]["event"]["oneOf"]
    }
    assert in_contract == {"basket_made", "goal", "ball_landed", "play_activity"}


def test_event_id_deterministik():
    seg = uuid4()
    assert make_event_id(seg, "goal", 1000) == make_event_id(seg, "goal", 1000)
    assert make_event_id(seg, "goal", 1000) != make_event_id(seg, "goal", 1000, index=1)
    assert make_event_id(seg, "goal", 1000) != make_event_id(uuid4(), "goal", 1000)

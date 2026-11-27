from uuid import UUID

from pydantic import TypeAdapter

from app.core.detector import SegmentContext
from app.core.events import DetectionEvent
from app.modules.badminton.detector import events_from_observations
from app.modules.badminton.landings import CourtObservation, detect_landings

SEGMENT = UUID("11111111-1111-4111-8111-111111111111")
SESSION = UUID("22222222-2222-4222-8222-222222222222")


def observation(t_ms: int, x_m: float, y_m: float) -> CourtObservation:
    return CourtObservation(t_ms, x_m, y_m, x_m * 100, y_m * 100, 0.9)


def context() -> SegmentContext:
    return SegmentContext(
        segment_id=SEGMENT,
        session_id=SESSION,
        match_id=None,
        camera="home",
        sport="badminton",
        start_offset_ms=1000,
    )


def test_suggests_landing_after_shuttle_stops_on_court():
    points = [
        observation(100, 2.0, 4.0),
        observation(200, 2.5, 5.0),
        observation(300, 3.0, 6.0),
        observation(400, 3.2, 6.5),
        observation(500, 3.50, 7.00),
        observation(560, 3.52, 7.01),
        observation(620, 3.49, 6.99),
        observation(680, 3.51, 7.00),
        observation(740, 3.50, 7.01),
    ]

    landings = detect_landings(points)

    assert len(landings) == 1
    assert landings[0].t_ms == 500
    assert 3.4 < landings[0].x_m < 3.6


def test_does_not_suggest_stationary_ball_without_flight():
    points = [observation(t, 3.0, 7.0) for t in (0, 60, 120, 180, 240, 300)]

    assert detect_landings(points) == []


def test_rest_window_uses_elapsed_time_at_30_fps():
    points = [
        observation(0, 1.0, 3.0),
        observation(33, 1.5, 4.0),
        observation(66, 2.0, 5.0),
        observation(99, 2.5, 6.0),
        *[observation(t, 3.0, 7.0) for t in (132, 165, 198, 231, 264, 297, 330)],
    ]

    landings = detect_landings(points)

    assert len(landings) == 1
    assert landings[0].t_ms == 132


def test_event_is_deterministic_and_contains_in_bounds_result():
    points = [
        observation(100, 2.0, 4.0),
        observation(200, 2.5, 5.0),
        observation(300, 3.0, 6.0),
        observation(400, 3.2, 6.5),
        observation(500, 3.50, 7.00),
        observation(560, 3.52, 7.01),
        observation(620, 3.49, 6.99),
        observation(680, 3.51, 7.00),
    ]

    first = events_from_observations(points, "doubles", context())
    second = events_from_observations(points, "doubles", context())

    assert len(first) == 1
    assert first[0].event_id == second[0].event_id
    assert first[0].timestamp_ms == 1500
    assert first[0].payload.in_bounds is True
    assert first[0].payload.side == "away"
    TypeAdapter(DetectionEvent).validate_python(first[0].model_dump(mode="json"))


def test_marks_landing_outside_singles_court_as_out():
    points = [
        observation(100, 3.0, 4.0),
        observation(200, 3.7, 5.0),
        observation(300, 4.2, 6.0),
        observation(400, 4.8, 7.0),
        observation(500, 5.29, 8.00),
        observation(560, 5.31, 8.01),
        observation(620, 5.29, 7.99),
        observation(680, 5.30, 8.00),
    ]

    events = events_from_observations(points, "singles", context())

    assert len(events) == 1
    assert events[0].payload.in_bounds is False

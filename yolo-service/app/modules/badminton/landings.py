"""Pure shuttle-rest detector, independent of torch and video decoding."""

from __future__ import annotations

from dataclasses import dataclass
from math import hypot


@dataclass(frozen=True)
class CourtObservation:
    t_ms: int
    x_m: float
    y_m: float
    x_px: float
    y_px: float
    confidence: float


@dataclass(frozen=True)
class LandingCandidate:
    t_ms: int
    x_m: float
    y_m: float
    x_px: float
    y_px: float
    confidence: float


@dataclass(frozen=True)
class LandingParams:
    rest_samples: int = 4
    min_rest_ms: int = 180
    max_sample_gap_ms: int = 150
    rest_radius_m: float = 0.18
    flight_distance_m: float = 0.75
    flight_window_ms: int = 1000
    rearm_distance_m: float = 0.6


def detect_landings(
    observations: list[CourtObservation], params: LandingParams | None = None
) -> list[LandingCandidate]:
    """Suggest a landing when a fast shuttle trajectory settles at one court location."""
    p = params or LandingParams()
    ordered = sorted(observations, key=lambda obs: obs.t_ms)
    if len(ordered) < p.rest_samples:
        return []

    landings: list[LandingCandidate] = []
    last_landing: LandingCandidate | None = None
    for end in range(p.rest_samples - 1, len(ordered)):
        start = end
        while start > 0 and ordered[end].t_ms - ordered[start].t_ms < p.min_rest_ms:
            start -= 1
        window = ordered[start : end + 1]
        if len(window) < p.rest_samples or window[-1].t_ms - window[0].t_ms < p.min_rest_ms:
            continue
        if any(b.t_ms - a.t_ms > p.max_sample_gap_ms for a, b in zip(window, window[1:], strict=False)):
            continue

        x_m = sum(obs.x_m for obs in window) / len(window)
        y_m = sum(obs.y_m for obs in window) / len(window)
        if any(hypot(obs.x_m - x_m, obs.y_m - y_m) > p.rest_radius_m for obs in window):
            continue
        if last_landing and hypot(x_m - last_landing.x_m, y_m - last_landing.y_m) < p.rearm_distance_m:
            continue

        flight = [
            obs
            for obs in ordered[:start]
            if window[0].t_ms - p.flight_window_ms <= obs.t_ms < window[0].t_ms
        ]
        if not flight or max(hypot(obs.x_m - x_m, obs.y_m - y_m) for obs in flight) < p.flight_distance_m:
            continue

        x_px = sum(obs.x_px for obs in window) / len(window)
        y_px = sum(obs.y_px for obs in window) / len(window)
        landing = LandingCandidate(
            t_ms=window[0].t_ms,
            x_m=x_m,
            y_m=y_m,
            x_px=x_px,
            y_px=y_px,
            confidence=min(obs.confidence for obs in window),
        )
        landings.append(landing)
        last_landing = landing

    return landings

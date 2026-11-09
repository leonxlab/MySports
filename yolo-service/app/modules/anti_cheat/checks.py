"""Privacy-preserving replay checks; no frames or clips are persisted."""

from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import numpy as np

DEFAULT_FLAG_THRESHOLD = 0.8
FRAME_SAMPLE_SECONDS = 0.5
MAX_FRAME_SAMPLES = 600
MOTION_WINDOW_SIZE = 6


@dataclass(frozen=True)
class Signal:
    score: float
    reason: str | None


@dataclass(frozen=True)
class SuspicionResult:
    score: float
    flagged: bool
    reasons: tuple[str, ...]
    signals: dict[str, float]


def repeated_frame_signal(frame_hashes: Sequence[bytes]) -> Signal:
    """Score non-adjacent exact frame repeats, excluding a wholly static feed."""
    if len(frame_hashes) < 3 or len(set(frame_hashes)) < 2:
        return Signal(0.0, None)

    last_seen: dict[bytes, int] = {}
    repeats = 0
    for index, frame_hash in enumerate(frame_hashes):
        previous = last_seen.get(frame_hash)
        if previous is not None and index - previous > 1:
            repeats += 1
        last_seen[frame_hash] = index

    score = min(1.0, repeats / max(1, len(frame_hashes) * 0.25))
    reason = "Non-adjacent identical frames repeat within this segment." if score else None
    return Signal(score, reason)


def repeated_motion_signal(
    frame_hashes: Sequence[bytes], window_size: int = MOTION_WINDOW_SIZE
) -> Signal:
    """Compare quantized frame-difference windows to catch repeated motion cycles."""
    if len(frame_hashes) < window_size + 2:
        return Signal(0.0, None)

    frames = [np.frombuffer(frame, dtype=np.uint8) for frame in frame_hashes]
    if any(frame.size != frames[0].size for frame in frames):
        raise ValueError("all sampled frames must have the same dimensions")

    signatures: list[bytes] = []
    for previous, current in zip(frames, frames[1:], strict=False):
        delta = current.astype(np.int16) - previous.astype(np.int16)
        quantized = np.clip(delta // 16, -8, 7).astype(np.int8).view(np.uint8) + 8
        signatures.append(quantized.tobytes())

    windows = [
        tuple(signatures[start : start + window_size])
        for start in range(len(signatures) - window_size + 1)
    ]
    counts = Counter(windows)
    repeated = sum(count - 1 for count in counts.values() if count > 1)
    score = min(1.0, repeated / max(1, len(windows) * 0.2))
    reason = "A quantized motion window repeats within this segment." if score else None
    return Signal(score, reason)


def combine_signals(
    signals: dict[str, Signal],
    flag_threshold: float = DEFAULT_FLAG_THRESHOLD,
) -> SuspicionResult:
    if not 0 <= flag_threshold <= 1:
        raise ValueError("flag_threshold must be between 0 and 1")
    score = max((signal.score for signal in signals.values()), default=0.0)
    reasons = tuple(
        signal.reason
        for signal in signals.values()
        if signal.reason is not None and signal.score >= flag_threshold
    )
    return SuspicionResult(
        score=score,
        flagged=score >= flag_threshold,
        reasons=reasons,
        signals={name: signal.score for name, signal in signals.items()},
    )


def _sample_frame_hashes(video_path: Path) -> list[bytes]:
    try:
        import cv2
    except ImportError as exc:
        raise RuntimeError("OpenCV is required to inspect a video file") from exc

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        capture.release()
        raise ValueError("video could not be opened")

    try:
        fps = capture.get(cv2.CAP_PROP_FPS)
        frame_step = max(1, round(fps * FRAME_SAMPLE_SECONDS)) if fps > 0 else 1
        frame_hashes: list[bytes] = []
        frame_index = 0
        sampled = 0
        while sampled < MAX_FRAME_SAMPLES:
            ok, frame = capture.read()
            if not ok:
                break
            if frame_index % frame_step == 0:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                small = cv2.resize(gray, (32, 18), interpolation=cv2.INTER_AREA)
                frame_hashes.append(small.tobytes())
                sampled += 1
            frame_index += 1
        return frame_hashes
    finally:
        capture.release()


def suspicion_score(
    video_path: Path,
    flag_threshold: float = DEFAULT_FLAG_THRESHOLD,
) -> SuspicionResult:
    """Return a review signal only; this function never blocks or penalizes a player."""
    frame_hashes = _sample_frame_hashes(video_path)
    return combine_signals(
        {
            "repeated_frames": repeated_frame_signal(frame_hashes),
            "repeated_motion": repeated_motion_signal(frame_hashes),
        },
        flag_threshold=flag_threshold,
    )

from pathlib import Path

import numpy as np

from app.modules.anti_cheat import checks


def frame_values(values: list[int]) -> list[bytes]:
    return [np.full(32, value, dtype=np.uint8).tobytes() for value in values]


def test_repeated_frame_signal_flags_a_replayed_frame_sequence() -> None:
    sequence = frame_values([0, 20, 40, 60, 80, 100, 120, 140])
    signal = checks.repeated_frame_signal(sequence + sequence)

    assert signal.score == 1.0
    assert signal.reason is not None


def test_repeated_motion_signal_flags_repeated_motion_windows() -> None:
    sequence = frame_values([0, 20, 40, 60, 80, 100, 120, 140])
    signal = checks.repeated_motion_signal(sequence * 3)

    assert signal.score >= 0.8
    assert signal.reason is not None


def test_noise_without_repeated_frames_has_a_low_score() -> None:
    random = np.random.default_rng(42)
    frames = [frame.tobytes() for frame in random.integers(0, 256, (40, 32), dtype=np.uint8)]

    assert checks.repeated_frame_signal(frames).score == 0
    assert checks.repeated_motion_signal(frames).score == 0


def test_threshold_changes_flagging_without_changing_signal() -> None:
    signal = {"repeat": checks.Signal(0.6, "Repeated sample.")}

    low = checks.combine_signals(signal, flag_threshold=0.5)
    high = checks.combine_signals(signal, flag_threshold=0.7)

    assert low.flagged
    assert low.reasons == ("Repeated sample.",)
    assert not high.flagged
    assert high.reasons == ()
    assert low.score == high.score == 0.6


def test_suspicion_scoring_leaves_no_temporary_artifacts(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(checks, "_sample_frame_hashes", lambda _path: frame_values([1, 2, 3]))

    result = checks.suspicion_score(tmp_path / "synthetic.mp4")

    assert result.score == 0
    assert list(tmp_path.iterdir()) == []

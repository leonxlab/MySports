from pathlib import Path


def suspicion_score(video_path: Path) -> float:
    """0.0 (wajar) sampai 1.0 (sangat mencurigakan)."""
    # TODO: hash frame untuk deteksi putar ulang, korelasi pola gerak antar segmen
    return 0.0

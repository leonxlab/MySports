from pathlib import Path

from app.core.detector import SegmentContext
from app.core.events import PlayActivity


def measure_activity(video_path: Path, ctx: SegmentContext) -> PlayActivity | None:
    """Kembalikan event play_activity untuk satu segmen, atau None bila tidak ada aktivitas."""
    # TODO: deteksi orang + bola per frame, hitung detik aktif dan jumlah pemain
    return None

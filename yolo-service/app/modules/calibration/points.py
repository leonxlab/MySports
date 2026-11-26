"""Geometri lapangan dari kalibrasi Coach. Murni numpy, tanpa GPU dan tanpa OpenCV.

Koordinat lapangan dalam meter: sumbu x melintang dari kiri ke kanan (dilihat dari kamera),
sumbu y memanjang dari garis dekat kamera (y=0) ke garis jauh (y=length).
Sudut kalibrasi (urutan kontrak): dekat kiri (0,0), dekat kanan (W,0), jauh kanan (W,L), jauh kiri (0,L).

Homografi dihitung dari 4 pasang titik dengan DLT (sama hasilnya dengan cv2.getPerspectiveTransform),
supaya test ringan tetap jalan tanpa opencv.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

import numpy as np

from app.modules.calibration.contract import Calibration, CameraCalibration, Goal, Hoop, Point

# Toleransi garis bawaan (meter). Bola yang menyentuh garis dihitung MASUK (aturan badminton,
# tennis, padel). Toleransi menyerap galat penandaan dan galat deteksi.
# TODO(decision): angka diambil dari uji di lapangan, bukan ditetapkan di sini.
DEFAULT_LINE_TOLERANCE_M = 0.05


@dataclass(frozen=True)
class CourtLine:
    name: str
    start: tuple[float, float]
    end: tuple[float, float]


@dataclass(frozen=True)
class CourtGeometry:
    """Dimensi standar per cabang dan layout. Konstanta, bukan hasil ukur lapangan nyata."""

    sport: str
    layout: str
    width_m: float
    length_m: float
    lines: tuple[CourtLine, ...] = field(default_factory=tuple)

    @property
    def corners_m(self) -> np.ndarray:
        w, length = self.width_m, self.length_m
        return np.array([[0.0, 0.0], [w, 0.0], [w, length], [0.0, length]])


def _boundary(w: float, length: float) -> tuple[CourtLine, ...]:
    return (
        CourtLine("near_baseline", (0.0, 0.0), (w, 0.0)),
        CourtLine("right_sideline", (w, 0.0), (w, length)),
        CourtLine("far_baseline", (w, length), (0.0, length)),
        CourtLine("left_sideline", (0.0, length), (0.0, 0.0)),
    )


def _with_center(w: float, length: float) -> tuple[CourtLine, ...]:
    return (*_boundary(w, length), CourtLine("center", (0.0, length / 2), (w, length / 2)))


# Sumber dimensi: FIBA (basket 28x15), BWF (badminton 13.40 x 6.10 / 5.18),
# ITF (tennis 23.77 x 10.97 / 8.23), FIP (padel 20x10), FIFA futsal (40x20, ukuran internasional).
# TODO(decision): lapangan sewaan sering tidak standar (terutama futsal). Bila perlu, dimensi
# diambil dari data lapangan di modul venues lewat kontrak baru, bukan dari konstanta ini.
_GEOMETRY: dict[tuple[str, str], CourtGeometry] = {
    ("basketball", "full_court"): CourtGeometry("basketball", "full_court", 15.0, 28.0, _with_center(15.0, 28.0)),
    ("basketball", "half_court"): CourtGeometry("basketball", "half_court", 15.0, 14.0, _boundary(15.0, 14.0)),
    ("badminton", "doubles"): CourtGeometry("badminton", "doubles", 6.10, 13.40, _with_center(6.10, 13.40)),
    ("badminton", "singles"): CourtGeometry("badminton", "singles", 5.18, 13.40, _with_center(5.18, 13.40)),
    ("tennis", "doubles"): CourtGeometry("tennis", "doubles", 10.97, 23.77, _with_center(10.97, 23.77)),
    ("tennis", "singles"): CourtGeometry("tennis", "singles", 8.23, 23.77, _with_center(8.23, 23.77)),
    ("padel", "standard"): CourtGeometry("padel", "standard", 10.0, 20.0, _with_center(10.0, 20.0)),
    ("futsal", "standard"): CourtGeometry("futsal", "standard", 20.0, 40.0, _with_center(20.0, 40.0)),
}


def court_geometry(sport: str, layout: str) -> CourtGeometry:
    try:
        return _GEOMETRY[(sport, layout)]
    except KeyError as exc:
        raise ValueError(f"Tidak ada geometri untuk {sport}/{layout}") from exc


def parse_calibration(raw: dict) -> Calibration:
    """Validasi data dari device_sessions.calibration sesuai contracts/calibration.schema.json."""
    return Calibration.model_validate(raw)


def compute_homography(src: Sequence[Sequence[float]], dst: Sequence[Sequence[float]]) -> np.ndarray:
    """Matriks 3x3 H dengan dst ~ H @ src dari tepat 4 pasang titik (DLT, h33 = 1)."""
    s = np.asarray(src, dtype=float)
    d = np.asarray(dst, dtype=float)
    if s.shape != (4, 2) or d.shape != (4, 2):
        raise ValueError("Homografi butuh tepat 4 pasang titik")
    a = np.zeros((8, 8))
    b = np.zeros(8)
    for i, ((x, y), (u, v)) in enumerate(zip(s, d, strict=True)):
        a[2 * i] = [x, y, 1, 0, 0, 0, -u * x, -u * y]
        a[2 * i + 1] = [0, 0, 0, x, y, 1, -v * x, -v * y]
        b[2 * i], b[2 * i + 1] = u, v
    try:
        h = np.linalg.solve(a, b)
    except np.linalg.LinAlgError as exc:
        raise ValueError("Titik kalibrasi segaris atau bertumpuk, homografi tidak bisa dihitung") from exc
    return np.append(h, 1.0).reshape(3, 3)


def apply_homography(h: np.ndarray, x: float, y: float) -> tuple[float, float]:
    u, v, w = h @ np.array([x, y, 1.0])
    if abs(w) < 1e-12:
        raise ValueError("Titik berada di garis tak hingga homografi")
    return float(u / w), float(v / w)


def point_in_polygon(x: float, y: float, polygon: Sequence[Sequence[float]]) -> bool:
    """Ray casting. Titik tepat di tepi tidak pasti, jadi pemanggil memakai margin."""
    inside = False
    n = len(polygon)
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            x_cross = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < x_cross:
                inside = not inside
    return inside


def distance_to_segment(x: float, y: float, line: CourtLine) -> float:
    p = np.array([x, y])
    a = np.array(line.start)
    b = np.array(line.end)
    ab = b - a
    t = 0.0 if not ab.any() else float(np.clip(np.dot(p - a, ab) / np.dot(ab, ab), 0.0, 1.0))
    return float(np.linalg.norm(p - (a + t * ab)))


@dataclass
class CourtMapper:
    """Menghubungkan piksel satu kamera dengan koordinat lapangan."""

    camera: CameraCalibration
    geometry: CourtGeometry
    _h: np.ndarray = field(init=False, repr=False)

    def __post_init__(self) -> None:
        src = [(p.x, p.y) for p in self.camera.court_corners]
        self._h = compute_homography(src, self.geometry.corners_m)

    @classmethod
    def from_calibration(cls, cal: Calibration, camera: str) -> CourtMapper:
        cam = cal.for_camera(camera)  # type: ignore[arg-type]
        if cam is None:
            raise ValueError(f"Tidak ada kalibrasi untuk kamera {camera}")
        return cls(cam, court_geometry(cal.sport, cal.layout))

    def to_reference(self, x: float, y: float, frame_size: tuple[int, int] | None) -> tuple[float, float]:
        """Skalakan titik dari resolusi segmen (lebar, tinggi) ke resolusi frame acuan kalibrasi."""
        if frame_size is None:
            return x, y
        fw, fh = frame_size
        return x * self.camera.frame.width / fw, y * self.camera.frame.height / fh

    def to_court(self, x: float, y: float, frame_size: tuple[int, int] | None = None) -> tuple[float, float]:
        rx, ry = self.to_reference(x, y, frame_size)
        return apply_homography(self._h, rx, ry)

    def is_inside(
        self,
        x: float,
        y: float,
        frame_size: tuple[int, int] | None = None,
        tolerance_m: float = DEFAULT_LINE_TOLERANCE_M,
    ) -> bool:
        """Titik (piksel) di dalam lapangan. Menyentuh garis dalam toleransi = masuk."""
        cx, cy = self.to_court(x, y, frame_size)
        g = self.geometry
        return -tolerance_m <= cx <= g.width_m + tolerance_m and -tolerance_m <= cy <= g.length_m + tolerance_m

    def distance_to_line(
        self, x: float, y: float, line_name: str, frame_size: tuple[int, int] | None = None
    ) -> float:
        """Jarak (meter) titik piksel ke garis bernama di koordinat lapangan."""
        line = next((ln for ln in self.geometry.lines if ln.name == line_name), None)
        if line is None:
            raise ValueError(f"Garis {line_name} tidak ada di {self.geometry.sport}/{self.geometry.layout}")
        cx, cy = self.to_court(x, y, frame_size)
        return distance_to_segment(cx, cy, line)

    def in_target_area(
        self,
        x: float,
        y: float,
        target: Hoop | Goal,
        frame_size: tuple[int, int] | None = None,
        margin_px: float = 0.0,
    ) -> bool:
        """Titik (piksel) di area ring atau mulut gawang, dalam ruang piksel frame acuan.

        Ring: kotak selebar bibir depan ring, setinggi setengah lebar ring di atas dan di bawahnya.
        Gawang: poligon mulut gawang. margin_px memperlebar area ke segala arah.
        """
        rx, ry = self.to_reference(x, y, frame_size)
        return point_in_target(rx, ry, target, margin_px)


def point_in_target(x: float, y: float, target: Hoop | Goal, margin_px: float = 0.0) -> bool:
    """Uji titik di area target, semua dalam piksel frame acuan."""
    if isinstance(target, Hoop):
        a, b = target.points
        half_h = abs(b.x - a.x) / 2
        return (
            min(a.x, b.x) - margin_px <= x <= max(a.x, b.x) + margin_px
            and min(a.y, b.y) - half_h - margin_px <= y <= max(a.y, b.y) + half_h + margin_px
        )
    return point_in_polygon(x, y, _expand_polygon(target.points, margin_px))


def _expand_polygon(points: Sequence[Point], margin_px: float) -> list[tuple[float, float]]:
    cx = sum(p.x for p in points) / len(points)
    cy = sum(p.y for p in points) / len(points)
    out = []
    for p in points:
        dx, dy = p.x - cx, p.y - cy
        norm = (dx * dx + dy * dy) ** 0.5 or 1.0
        out.append((p.x + dx / norm * margin_px, p.y + dy / norm * margin_px))
    return out

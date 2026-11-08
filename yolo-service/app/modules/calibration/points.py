from dataclasses import dataclass


@dataclass
class CourtCalibration:
    # Titik dalam piksel frame kamera
    corners: list[tuple[float, float]]  # 4 sudut lapangan
    targets: list[tuple[float, float]]  # ring atau gawang


def parse_calibration(raw: dict) -> CourtCalibration:
    # TODO: validasi bentuk data dari backend
    return CourtCalibration(corners=[], targets=[])

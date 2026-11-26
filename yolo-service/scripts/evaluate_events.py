"""Evaluasi detektor terhadap label waktu kejadian pada klip uji.

Pemakaian (dari folder yolo-service):
    python -m scripts.run_detector basketball klip.mp4 > pred.jsonl
    python -m scripts.evaluate_events pred.jsonl label.json --tolerance-ms 500

label.json: {"events": [1200, 5400, ...]}  waktu kejadian sebenarnya (ms), ditandai manual.
Hasil: presisi, recall, dan jumlah kejadian ganda (dua prediksi untuk satu kejadian nyata).
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class EvalResult:
    true_positive: int
    false_positive: int
    false_negative: int
    duplicates: int

    @property
    def precision(self) -> float:
        total = self.true_positive + self.false_positive + self.duplicates
        return self.true_positive / total if total else 0.0

    @property
    def recall(self) -> float:
        total = self.true_positive + self.false_negative
        return self.true_positive / total if total else 0.0


def match_events(predicted_ms: list[int], truth_ms: list[int], tolerance_ms: int) -> EvalResult:
    """Cocokkan prediksi ke label terdekat dalam toleransi. Prediksi kedua untuk label yang sama = duplikat."""
    matched: set[int] = set()
    tp = fp = dup = 0
    for p in sorted(predicted_ms):
        near = [i for i, t in enumerate(truth_ms) if abs(p - t) <= tolerance_ms]
        if not near:
            fp += 1
            continue
        best = min(near, key=lambda i: abs(p - truth_ms[i]))
        if best in matched:
            dup += 1
        else:
            matched.add(best)
            tp += 1
    return EvalResult(tp, fp, len(truth_ms) - len(matched), dup)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("predictions", type=Path, help="keluaran run_detector (satu event JSON per baris)")
    parser.add_argument("labels", type=Path)
    parser.add_argument("--tolerance-ms", type=int, default=500)
    args = parser.parse_args()

    predicted = []
    for line in args.predictions.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("{"):
            predicted.append(int(json.loads(line)["timestamp_ms"]))
    truth = [int(t) for t in json.loads(args.labels.read_text(encoding="utf-8"))["events"]]
    r = match_events(predicted, truth, args.tolerance_ms)
    print(
        f"TP={r.true_positive} FP={r.false_positive} FN={r.false_negative} duplikat={r.duplicates} "
        f"presisi={r.precision:.2f} recall={r.recall:.2f}"
    )


if __name__ == "__main__":
    main()

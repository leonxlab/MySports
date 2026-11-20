# Detektor badminton

Kok jatuh di dalam atau di luar garis.

Event: `ball_landed`. AI hanya mengusulkan kejadian, Coach mengonfirmasi lewat controller, aturan poin ada di backend.

## Titik awal (belum diuji, cek lisensi sebelum dipakai)

- jiazimo0308/Yolo-and-TrackNet-Badminton-Analysis (pemain, kok dengan TrackNet+YOLO, kalibrasi 4 sudut; lisensi tidak terlihat)
- TrackNet arXiv 1907.03698 (pelacak bola kecil dan cepat)

## Checklist

- [ ] Cek lisensi repo dan dataset, catat di sini
- [ ] Bobot di bucket `models`, versi dicatat di `models/VERSIONS.md`
- [ ] `process()` menghasilkan event sesuai kontrak
- [ ] Test dengan klip di `tests/fixtures/`
- [ ] Benchmark FPS dan memori GPU di `docs/benchmarks.md`

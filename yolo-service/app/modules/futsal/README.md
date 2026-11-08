# Detektor futsal

Bola masuk gawang (gol).

Event: `goal`. AI hanya mengusulkan kejadian, Coach mengonfirmasi lewat controller, aturan poin ada di backend.

## Titik awal (belum diuji, cek lisensi sebelum dipakai)

- andreus94/AI-tracker (YOLO11 pemain dan bola; gol baru rencana)
- Roboflow Universe futsal-analysis (kelas ball, goal, goalkeeper, player; cek lisensi dataset)

## Checklist

- [ ] Cek lisensi repo dan dataset, catat di sini
- [ ] Bobot di bucket `models`, versi dicatat di `models/VERSIONS.md`
- [ ] `process()` menghasilkan event sesuai kontrak
- [ ] Test dengan klip di `tests/fixtures/`
- [ ] Benchmark FPS dan memori GPU di `docs/benchmarks.md`

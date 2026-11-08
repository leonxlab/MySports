# Detektor padel

Bola mendarat di dalam atau di luar garis (usulan, belum diputuskan). Padel tunggal dianggap sama dengan ganda.

Event: `ball_landed`. AI hanya mengusulkan kejadian, Coach mengonfirmasi lewat controller, aturan poin ada di backend.

## Titik awal (belum diuji, cek lisensi sebelum dipakai)

- andresgilvicente/padel-ai-system (pelacak bola non-YOLO, YOLOv8-Pose, deteksi pantulan; proyek kuliah, lisensi tidak terlihat)

## Checklist

- [ ] Cek lisensi repo dan dataset, catat di sini
- [ ] Bobot di bucket `models`, versi dicatat di `models/VERSIONS.md`
- [ ] `process()` menghasilkan event sesuai kontrak
- [ ] Test dengan klip di `tests/fixtures/`
- [ ] Benchmark FPS dan memori GPU di `docs/benchmarks.md`

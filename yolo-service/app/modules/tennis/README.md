# Detektor tennis

Bola mendarat di dalam atau di luar garis (usulan, belum diputuskan).

Event: `ball_landed`. AI hanya mengusulkan kejadian, Coach mengonfirmasi lewat controller, aturan poin ada di backend.

## Titik awal (belum diuji, cek lisensi sebelum dipakai)

- rishn/adobe-gensolve-finale (YOLO dan keypoint lapangan, kualitas skor belum teruji)
- Oushesh/tennis-count (catatan langkah, bukan kode jadi)

## Checklist

- [ ] Cek lisensi repo dan dataset, catat di sini
- [ ] Bobot di bucket `models`, versi dicatat di `models/VERSIONS.md`
- [ ] `process()` menghasilkan event sesuai kontrak
- [ ] Test dengan klip di `tests/fixtures/`
- [ ] Benchmark FPS dan memori GPU di `docs/benchmarks.md`

# Detektor basketball

Bola masuk ring. Pembeda 2 dan 3 poin belum tercakup (pertanyaan terbuka #10: usulan Coach memilih saat konfirmasi).

Event: `basket_made`. AI hanya mengusulkan kejadian, Coach mengonfirmasi lewat controller, aturan poin ada di backend.

## Titik awal (belum diuji, cek lisensi sebelum dipakai)

- petermartens98/Finetuned-YOLO-and-Supervision-Basketball-Video-Tracker (pemain, bola, warna tim; tidak menghitung tembakan)
- nvan21/Basketball-Shot-Detection (bola dan ring, lintasan; README mengakui belum bisa memastikan bola masuk)

## Checklist

- [ ] Cek lisensi repo dan dataset, catat di sini
- [ ] Bobot di bucket `models`, versi dicatat di `models/VERSIONS.md`
- [ ] `process()` menghasilkan event sesuai kontrak
- [ ] Test dengan klip di `tests/fixtures/`
- [ ] Benchmark FPS dan memori GPU di `docs/benchmarks.md`

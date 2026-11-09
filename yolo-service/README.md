# yolo-service

Layanan deteksi. Python + FastAPI + Ultralytics YOLO. Dikembangkan dan diuji di laptop RTX, di-deploy ke GPU hosting sewa dengan Docker image yang sama.

Layanan ini hanya mengambil segmen video dari antrean, mendeteksi **kejadian** (bola masuk ring, bola mendarat di luar garis, menit main), mengirimnya ke backend, lalu menghapus segmen. Skor dihitung backend.

```
app/
  main.py              FastAPI: /health, /gpu, /detectors
  worker.py            python -m app.worker  (loop antrean)
  core/                milik bersama: config, kontrak event, antarmuka detektor, client
  modules/
    basketball/ futsal/ badminton/ tennis/ padel/     satu detektor per cabang
    play_activity/     menit main untuk Level
    anti_cheat/        skor kecurigaan rekaman
    calibration/       titik ring, gawang, garis dari Coach
    jobs/              operasi antrean (claim, download, hapus, tandai)
scripts/
  run_detector.py      uji satu detektor pada satu klip lokal
  download_models.py   unduh bobot dari bucket Supabase `models`
models/                bobot (tidak masuk git) + VERSIONS.md
tests/
```

## Menambah detektor

1. Isi `modules/<cabang>/detector.py`: `load()` memuat bobot, `process()` mengembalikan daftar event sesuai `app/core/events.py`.
2. Daftarkan lewat `@register` (sudah ada di kerangka). Worker tidak perlu diubah.
3. Uji: `python -m scripts.run_detector <cabang> klip.mp4`.
4. Catat bobot di `models/VERSIONS.md`, lisensi repo asal di README modul, dan hasil ukur di `docs/benchmarks.md`.

Titik awal tiap cabang (repo referensi dari proposal, belum diuji) ada di README masing-masing modul. Tidak satu pun repo itu menghasilkan skor siap pakai. Semuanya komponen deteksi.

## Test

```bash
pip install -r requirements-dev.txt
ruff check .
pytest -q
```

Test ringan tidak butuh torch atau GPU, karena `ultralytics` baru diimpor di dalam detektor.

## Kontrak

Event dikirim ke `POST {BACKEND_URL}/api/v1/devices/events` dengan header `x-service-key`. Bentuknya di `../contracts/detection-event.schema.json`. Ubah kontrak lewat PR terpisah (rules.md bagian 5).

Setup lokal: `../docs/setup-local.md`. Deploy ke GPU sewa: `../docs/deploy.md`.

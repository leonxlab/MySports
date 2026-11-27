# yolo-service

Layanan deteksi. Python + FastAPI + Ultralytics YOLO. Dikembangkan dan diuji di laptop RTX, di-deploy ke GPU hosting sewa dengan Docker image yang sama.

Layanan ini hanya mengambil segmen video dari antrean, mendeteksi **kejadian** (bola masuk ring, bola mendarat di luar garis, menit main), mengirimnya ke backend, lalu menghapus segmen. Skor dihitung backend.

```
app/
  main.py              FastAPI: /health, /gpu, /detectors, WebSocket /live/{sport}/{pin}
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
vendor/                source proyek badminton lokal; output uji tetap lokal dan di-ignore
tests/
```

Checkpoint YOLO badminton disimpan di `vendor/Yolo-and-TrackNet-Badminton-Analysis-main/Track_Model/yolo11/best.pt`
secara lokal (file `.pt` di-ignore Git). Docker Compose mount folder model itu read-only ke worker dan API.
Hak pakai salinan lokal dikonfirmasi pemilik workspace; lisensi upstream perlu didokumentasikan sebelum distribusi.

Worker menyediakan `GET /metrics` di port 8001 dalam proses worker. Di Docker Compose,
`/health` dan `/gpu` dilayani API di port 8000, sementara `/metrics` dilayani worker.

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

## Demo kamera YOLO langsung

Mode demo di homepage development mengirim frame JPEG kamera melalui WebSocket ke
`/live/{sport}/{pin}?role=camera`; Coach bergabung dengan PIN yang sama memakai `role=coach`.
Di development, Controller juga dapat memilih video lokal. Browser memutar video pada kecepatan
normal lalu mengirim frame JPEG satu per satu ke service—bukan mengunggah file utuh. Produksi tidak
menampilkan pemilih video dan memakai kamera langsung. Aliran ini hanya mendeteksi objek—belum
menghasilkan keputusan poin atau menyimpan event pertandingan.

Jalankan service API pada mesin yang dapat dijangkau browser, lalu atur
`NEXT_PUBLIC_YOLO_SERVICE_URL` di frontend ke alamat API tersebut. Untuk membuka demo dari HP,
gunakan alamat LAN server yang dapat dijangkau HP dan HTTPS; browser umumnya memblokir kamera pada
origin HTTP non-localhost. Endpoint demo ini ditujukan untuk jaringan development tepercaya, bukan
diekspos publik tanpa autentikasi dan pembatasan koneksi.
Aktifkan endpoint secara eksplisit dengan `LIVE_DEMO_ENABLED=true`; default layanan adalah nonaktif.

Badminton memakai bobot lokal khusus bila tersedia. Basket, futsal, padel, dan tenis memakai bobot
per cabang di `models/` bila tersedia; selain itu menggunakan model YOLO COCO umum untuk kelas bola.
Model umum bukan model terlatih khusus cabang dan tidak menjamin deteksi bola kecil atau akurasi skor.
Upload video hanya alat uji di development. Homepage production tidak memuat demo atau pemilih video;
endpoint WebSocket demo YOLO juga default nonaktif.

## Kontrak

Event dikirim ke `POST {BACKEND_URL}/api/v1/devices/events` dengan header `x-service-key`. Bentuknya di `../contracts/detection-event.schema.json`. Ubah kontrak lewat PR terpisah (rules.md bagian 5).

Setup lokal: `../docs/setup-local.md`. Deploy ke GPU sewa: `../docs/deploy.md`.

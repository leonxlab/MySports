# Prompt: calibration

| | |
| --- | --- |
| Modul | `calibration`: Titik ring, gawang, dan garis dari Coach |
| Pemilik | dev-c (Skor, device, dan AI olahraga tim) |
| Layer | yolo-service |
| Fase | 3 |
| Bobot | 1 |
| Bergantung pada | - |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **Medium** |
| Branch disarankan | `feat/calibration-contract-and-geometry` |

Alasan effort: Geometri dan kontrak yang akan dipakai semua orang. Salah di sini menyebar ke semua detektor. Perlu penalaran yang cermat. Effort medium cukup karena lingkupnya kecil.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play, di bagian `yolo-service/` (Python 3.11, FastAPI, Ultralytics YOLO). Layanan ini dikembangkan dan diuji di laptop RTX, lalu dipasang di GPU sewa dengan Docker image yang sama. Tugasmu: mengerjakan modul `calibration` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-c, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3, 5, 7 (YOLO service), 9 (privasi), 10.
2. `MODULES.md` dan `prompts/INTEGRATION.md`.
3. `docs/proposal.md`, bagian: Scoring dan Statistik (Usulan kalibrasi); AI Detection dan Device Pairing; Referensi Repo dan Model YOLO (kalibrasi 4 sudut di repo badminton).
4. `yolo-service/README.md`, `app/core/detector.py`, `app/core/events.py`, `app/worker.py`.
5. `contracts/detection-event.schema.json` dan `backend/src/modules/devices/schema.ts` (kontrak event).
6. `yolo-service/app/modules/calibration/` (kerangka dan README).
7. `docs/setup-local.md` bagian YOLO di laptop RTX, dan `docs/benchmarks.md`.
8. `yolo-service/app/modules/calibration/points.py` (kerangka)
9. `backend/src/modules/devices/README.md` (kolom `device_sessions.calibration`)

## Yang sudah ada di repo

- Antarmuka `SportDetector` (`load`, `process`) dan registry `@register`. Worker memanggil detektor lewat registry, jadi menambah atau mengubah detektor tidak mengubah worker.
- Kontrak event (pydantic di `app/core/events.py`, JSON schema di `contracts/`) dan `make_event_id`.
- `scripts/run_detector.py` untuk menjalankan satu detektor pada satu klip lokal tanpa Supabase dan backend.
- `scripts/download_models.py`, folder `models/` (bobot tidak masuk git) dan `models/VERSIONS.md`.
- Test ringan berjalan tanpa GPU (`pytest`), lint dengan `ruff`.

## Aturan yang tidak boleh dilanggar

- Detektor menghasilkan KEJADIAN, bukan skor. Aturan poin ada di backend.
- `event_id` wajib deterministik: `make_event_id(segment_id, type, timestamp_ms, index)` dari `app/core/events.py`. Dilarang `uuid4`, karena segmen yang diproses ulang akan menggandakan skor.
- Segmen video dan frame tidak boleh tertinggal di disk setelah selesai, tidak boleh masuk log, dan nama atau wajah pemain tidak boleh ditulis ke log.
- Bobot model tidak masuk git. Simpan di bucket `models`, catat versinya di `yolo-service/models/VERSIONS.md`.
- Lisensi repo dan dataset referensi harus dicek dan dicatat di README modul sebelum kode atau bobotnya dipakai. Jangan menyalin kode dari repo tanpa lisensi yang jelas.
- Impor `ultralytics`/`torch` di dalam fungsi (lazy) supaya test ringan di CI tidak butuh GPU.

## Tujuan

Format dan utilitas kalibrasi lapangan: titik sudut lapangan, posisi ring atau gawang, dan garis yang ditandai Coach sekali saat setup. Dipakai semua detektor, jadi kerjakan paling awal dan kontrakkan bentuk datanya.

## Spesifikasi dari proposal

- Posisi ring, gawang, dan garis ditandai sekali oleh Coach saat setup (klik titik, seperti klik 4 sudut pada repo badminton), karena targetnya tidak bergerak. Dengan begitu model cukup fokus pada bola.
- Data kalibrasi disimpan backend di `device_sessions.calibration` (jsonb) dan dibawa ke detektor lewat `SegmentContext.calibration`. Bentuknya adalah kontrak lintas layanan.
- Utilitas yang dibutuhkan detektor: homografi piksel ke koordinat lapangan (`cv2.findHomography`), uji titik di dalam atau di luar poligon lapangan, uji garis (jarak titik ke garis dalam koordinat lapangan), uji bola berada di area ring atau gawang.
- Beda ukuran lapangan per cabang dan mode (tunggal/ganda badminton, tennis, padel; full/half court basket; futsal) harus diwakili dalam spesifikasi lapangan (daftar garis dan dimensi standar sebagai konstanta).

## Yang harus dikerjakan

- **PR pertama hanya kontrak**: `contracts/calibration.schema.json` (titik dalam piksel, jenis target, cabang, mode, resolusi frame acuan) plus tipe zod di `backend/src/modules/devices/schema.ts` dan pydantic di yolo-service. Minta review dev-d (pemakai badminton, tennis, padel) dan dev-b (match settings) sebelum merge.
- `points.py`: parse dan validasi kalibrasi, `CourtGeometry` per cabang, homografi, fungsi uji di atas. Semua murni (numpy/cv2) dan dites dengan titik sintetis.
- Dokumentasikan alur penandaan untuk UI di devices (dev-c, modul sendiri): titik apa saja yang diminta per cabang dan urutannya.

## Antarmuka dengan modul lain

Yang kamu sediakan:
- Kontrak kalibrasi, `CourtGeometry`, fungsi homografi dan uji titik (dipakai semua detektor)

Yang kamu pakai:
- `devices` untuk menyimpan dan membaca kalibrasi (dev-c, modul sendiri)

Kalau yang kamu butuhkan dari modul lain belum ada, buat tiruan atau tipe sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>`, dan sebutkan di laporan. Perubahan kontrak selalu lewat PR terpisah yang disetujui pemilik tiap sisi.

## Keputusan yang belum final

Jangan memutuskan sendiri. Pakai asumsi sementara yang jelas dan tandai `TODO(decision): ...`:

- Titik apa saja yang wajib ditandai per cabang (usul: 4 sudut lapangan ditambah ring atau gawang).
- Apa yang terjadi bila kamera bergeser di tengah sesi (kalibrasi ulang manual, belum ada deteksi otomatis).

## Di luar tugas ini

- UI penandaan (modul devices frontend).
- Logika deteksi bola.
- Menambah event atau perilaku yang tidak ada di proposal atau kontrak.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Homografi: titik sintetis dipetakan ke koordinat lapangan yang benar (toleransi kecil).
- Titik di dalam dan di luar lapangan, di atas garis (aturan toleransi tertulis).
- Skema menolak kalibrasi yang kurang titik.
- Kontrak JSON dan zod/pydantic cocok (test kesamaan jenis).

Perintah pemeriksaan:
```
cd yolo-service && ruff check . && pytest -q
```
Untuk hasil di GPU laptop RTX: `python -m scripts.run_detector <cabang> <klip.mp4>` dan lampirkan keluarannya di PR. Bila kamu tidak punya akses GPU atau data uji di sesi ini, katakan terus terang di laporan dan jangan mengarang angka akurasi.

## Cara kerja

1. Tulis rencana singkat (5 sampai 10 baris): urutan kerja, bagian paling berisiko, dan asumsi yang akan kamu pakai. Kalau ada hal yang benar-benar menghalangi dan jawabannya tidak ada di repo maupun proposal, tanyakan sebelum menulis kode. Selain itu lanjut dengan asumsi yang ditandai `TODO(decision)`.
2. Kerjakan dari bagian paling berisiko: fungsi murni dan test lebih dulu, baru service, route, lalu frontend (atau pipeline lalu detektor untuk modul YOLO).
3. Commit kecil dengan format `tipe(scope): ringkasan` (hook `.githooks/commit-msg` menolak format salah). Pecah pekerjaan menjadi PR yang bisa direview, kira-kira di bawah 400 baris diff di luar lockfile dan migrasi.
4. Jangan menyentuh file di luar modulmu kecuali tertulis di tugas ini. Perubahan di `core`, `contracts`, atau migrasi modul lain dibuat sebagai PR terpisah dengan scope yang sesuai.
5. Jalankan pemeriksaan sebelum menyatakan selesai (perintah di bagian Pengujian).
6. Perbarui README modul (tabel endpoint, checklist) dan baris modul di `MODULES.md`.

## Definisi selesai

- `process()` (atau fungsi modul) menghasilkan keluaran sesuai kontrak, dengan `event_id` deterministik.
- Logika murni dipisah dari inferensi dan dites tanpa GPU. `ruff` dan `pytest` lolos.
- Hasil evaluasi pada klip uji (atau penjelasan jujur mengapa belum ada) tercantum di PR dan README modul. Benchmark di `docs/benchmarks.md`, bobot di `models/VERSIONS.md` (tanpa file bobot di git).
- Lisensi repo dan dataset referensi tercatat di README modul.
- README modul diperbarui dan `MODULES.md` diubah statusnya.
- Tidak ada video, frame, bobot, atau data pribadi di commit.

## Laporan akhir

Tutup dengan laporan singkat:
- Apa yang sudah jadi dan apa yang belum (jujur, termasuk yang hanya stub).
- Perintah yang dijalankan dan hasilnya.
- Asumsi dan `TODO(decision)` yang harus diputuskan tim, masing-masing satu kalimat.
- Perubahan di luar modulmu (kalau ada) dan siapa yang perlu me-review.
- Risiko atau hal yang kamu ragukan.

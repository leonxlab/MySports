# Prompt: padel

| | |
| --- | --- |
| Modul | `padel`: Bola mendarat di dalam atau di luar garis (usulan, belum diputuskan) |
| Pemilik | dev-d (AI olahraga raket, Level, dan fondasi UI) |
| Layer | yolo-service |
| Fase | 3 |
| Bobot | 3 |
| Bergantung pada | - |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **High** |
| Branch disarankan | `feat/padel-landing-detection` |

Alasan effort: Ketidakpastian domain lebih besar dari badminton dan tennis (dinding, kamera tunggal), dan referensinya paling lemah. Effort high.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play, di bagian `yolo-service/` (Python 3.11, FastAPI, Ultralytics YOLO). Layanan ini dikembangkan dan diuji di laptop RTX, lalu dipasang di GPU sewa dengan Docker image yang sama. Tugasmu: mengerjakan modul `padel` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-d, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3, 5, 7 (YOLO service), 9 (privasi), 10.
2. `MODULES.md` dan `prompts/INTEGRATION.md`.
3. `docs/proposal.md`, bagian: Olahraga yang Didukung (Padel); Scoring dan Statistik (Cakupan deteksi AI, tennis dan padel); Referensi Repo dan Model YOLO (Padel); Pertanyaan Terbuka (nomor 2, 11, 12).
4. `yolo-service/README.md`, `app/core/detector.py`, `app/core/events.py`, `app/worker.py`.
5. `contracts/detection-event.schema.json` dan `backend/src/modules/devices/schema.ts` (kontrak event).
6. `yolo-service/app/modules/padel/` (kerangka dan README).
7. `docs/setup-local.md` bagian YOLO di laptop RTX, dan `docs/benchmarks.md`.
8. README modul `badminton` dan `app/modules/_racket/`
9. README modul `calibration` dan `scoring` (rules/padel.ts)

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

Detektor pendaratan bola untuk padel. Padel punya dinding kaca, jadi 'in/out' tidak sesederhana badminton dan tennis.

## Spesifikasi dari proposal

- Kejadian AI untuk padel belum ditentukan. Usulan: bola mendarat di dalam atau di luar garis (`ball_landed`). Implementasikan pendaratan di lantai dan tandai asumsi.
- Padel tunggal memakai lapangan dan aturan skor yang sama dengan ganda (asumsi sementara, nomor 2).
- Dinding: bola memantul di kaca dan pagar dan permainan terus. Aturan yang relevan (bola harus memantul di lantai dulu sebelum dinding) memengaruhi keputusan poin. Kontrak event saat ini tidak punya konsep pantulan dinding. Jangan menambah event diam-diam. Bila perlu, ajukan PR kontrak terpisah dengan usulan (mis. `ball_bounce` dengan permukaan lantai/dinding) dan minta persetujuan dev-a dan dev-c.
- Referensi (belum diuji): `andresgilvicente/padel-ai-system` (pelacak bola berbasis warna, gerak, dan filter Kalman, bukan YOLO; YOLOv8-Pose untuk pemain; validasi servis valid atau fault; deteksi pantulan; satu kamera ponsel; proyek kuliah; lisensi tidak terlihat; tidak menghitung poin). Tidak ada repo yang menghitung poin padel.
- Kamera tunggal dari satu sisi membuat kedalaman ambigu. Dokumentasikan keterbatasan sudut pandang.

## Yang harus dikerjakan

- Pakai ulang `_racket` untuk lintasan dan pendaratan di lantai. Tambahkan deteksi pantulan (lantai vs dinding) di paket bersama bila memang diperlukan, lewat PR kecil.
- `detector.py`: geometri lapangan padel, `BallLanded`, `make_event_id`.
- Klip uji berlabel, evaluasi, benchmark, versi bobot. Cek lisensi repo referensi dan jangan menyalin kode tanpa lisensi.

## Antarmuka dengan modul lain

Yang kamu sediakan:
- Event `ball_landed` untuk padel (dan usulan kontrak pantulan dinding bila disetujui)

Yang kamu pakai:
- `_racket` (modul badminton, milikmu)
- Kalibrasi (dev-c)
- Worker `jobs` (dev-a)

Kalau yang kamu butuhkan dari modul lain belum ada, buat tiruan atau tipe sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>`, dan sebutkan di laporan. Perubahan kontrak selalu lewat PR terpisah yang disetujui pemilik tiap sisi.

## Keputusan yang belum final

Jangan memutuskan sendiri. Pakai asumsi sementara yang jelas dan tandai `TODO(decision): ...`:

- Kejadian AI untuk padel (nomor 11).
- Apakah pantulan dinding masuk cakupan awal (usul: tidak).
- FPS minimal (nomor 12).

## Di luar tugas ini

- Menghitung poin dan aturan servis.
- Menambah event ke kontrak tanpa PR kontrak.
- Menambah event atau perilaku yang tidak ada di proposal atau kontrak.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Pendaratan sintetis di lantai pada geometri padel.
- Pantulan dinding tidak dihitung sebagai pendaratan lantai.
- Tes badminton dan tennis tetap lolos.
- `event_id` deterministik.

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

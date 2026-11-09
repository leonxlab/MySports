# Prompt: tennis

| | |
| --- | --- |
| Modul | `tennis`: Bola mendarat di dalam atau di luar garis (usulan, belum diputuskan) |
| Pemilik | dev-d (AI olahraga raket, Level, dan fondasi UI) |
| Layer | yolo-service |
| Fase | 3 |
| Bobot | 3 |
| Bergantung pada | - |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **High** |
| Branch disarankan | `feat/tennis-landing-detection` |

Alasan effort: Banyak yang bisa dipakai ulang dari badminton, tetapi geometri dan kecepatan berbeda dan datanya perlu diukur. Effort high.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play, di bagian `yolo-service/` (Python 3.11, FastAPI, Ultralytics YOLO). Layanan ini dikembangkan dan diuji di laptop RTX, lalu dipasang di GPU sewa dengan Docker image yang sama. Tugasmu: mengerjakan modul `tennis` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-d, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3, 5, 7 (YOLO service), 9 (privasi), 10.
2. `MODULES.md` dan `prompts/INTEGRATION.md`.
3. `docs/proposal.md`, bagian: Olahraga yang Didukung (Tennis); Scoring dan Statistik (Cakupan deteksi AI, tennis dan padel); Referensi Repo dan Model YOLO (Tennis); Pertanyaan Terbuka (nomor 11, 12).
4. `yolo-service/README.md`, `app/core/detector.py`, `app/core/events.py`, `app/worker.py`.
5. `contracts/detection-event.schema.json` dan `backend/src/modules/devices/schema.ts` (kontrak event).
6. `yolo-service/app/modules/tennis/` (kerangka dan README).
7. `docs/setup-local.md` bagian YOLO di laptop RTX, dan `docs/benchmarks.md`.
8. README modul `badminton` dan `app/modules/_racket/` (dikerjakan sendiri lebih dulu)
9. README modul `calibration` dan `scoring` (rules/tennis.ts)

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
- Impor `ultralytics`/`torch` di dalam fungsi (lazy) supaya test ringan tetap bisa dijalankan lokal tanpa GPU.

## Tujuan

Detektor pendaratan bola in/out untuk tennis memakai paket bersama `_racket` dari badminton.

## Spesifikasi dari proposal

- Kejadian AI untuk tennis belum ditentukan di proposal. Usulan: bola mendarat di dalam atau di luar garis, seperti badminton (`ball_landed`). Implementasikan itu dan tandai sebagai asumsi.
- Tunggal dan ganda memakai garis berbeda (lorong ganda). Mode datang dari setting match.
- Bola lebih besar tetapi lebih cepat dan lapangan lebih luas dari badminton. Resolusi dan sudut kamera menentukan akurasi, ukur.
- Referensi (belum diuji): `rishn/adobe-gensolve-finale` (YOLO dan keypoint lapangan untuk analisis pemain dan bola, bertopik score-tracking, proyek kecil tanpa bintang, kualitas skor belum teruji), makalah TrackNet (arXiv 1907.03698, komponen lacak bola), `Oushesh/tennis-count` (catatan langkah dan referensi: lacak bola, deteksi pantulan, deteksi lapangan; bukan kode jadi).
- Aturan skor tennis (game, set) ada di backend, bukan di sini. Garis servis (kotak servis) di luar cakupan awal, fokus pada garis lapangan.

## Yang harus dikerjakan

- Pakai ulang `_racket`. Bila perlu penyesuaian, ubah lewat PR kecil di paket itu dan pastikan badminton tetap lolos tes.
- `detector.py`: konfigurasi geometri lapangan tennis, `BallLanded`, `make_event_id`.
- Klip uji berlabel, skrip evaluasi, benchmark, versi bobot. Cek lisensi tiap repo referensi.

## Antarmuka dengan modul lain

Yang kamu sediakan:
- Event `ball_landed` untuk tennis

Yang kamu pakai:
- `_racket` (modul badminton, milikmu)
- Kalibrasi (dev-c)
- Worker `jobs` (dev-a)

Kalau yang kamu butuhkan dari modul lain belum ada, buat tiruan atau tipe sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>`, dan sebutkan di laporan. Perubahan kontrak selalu lewat PR terpisah yang disetujui pemilik tiap sisi.

## Keputusan yang belum final

Jangan memutuskan sendiri. Pakai asumsi sementara yang jelas dan tandai `TODO(decision): ...`:

- Kejadian AI untuk tennis (nomor 11): asumsi `ball_landed`.
- FPS minimal (nomor 12).

## Di luar tugas ini

- Menghitung poin 15/30/40, game, set.
- Deteksi kotak servis di tahap awal.
- Menambah event atau perilaku yang tidak ada di proposal atau kontrak.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Pendaratan sintetis pada geometri tennis (tunggal vs ganda).
- Tes badminton tetap lolos setelah perubahan `_racket`.
- `event_id` deterministik.
- Evaluasi klip uji dilaporkan.

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

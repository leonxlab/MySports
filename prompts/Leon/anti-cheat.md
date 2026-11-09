# Prompt: anti_cheat

| | |
| --- | --- |
| Modul | `anti_cheat`: Deteksi rekaman diputar ulang dan pola gerak identik |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Layer | yolo-service |
| Fase | 3 |
| Bobot | 2 |
| Bergantung pada | - |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **High** |
| Branch disarankan | `feat/anti-cheat-suspicion-score` |

Alasan effort: Desain sinyal yang tidak pasti dengan risiko salah tuduh dan batasan privasi. Perlu penalaran dan eksperimen. Effort high.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play, di bagian `yolo-service/` (Python 3.11, FastAPI, Ultralytics YOLO). Layanan ini dikembangkan dan diuji di laptop RTX, lalu dipasang di GPU sewa dengan Docker image yang sama. Tugasmu: mengerjakan modul `anti_cheat` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-a, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3, 5, 7 (YOLO service), 9 (privasi), 10.
2. `MODULES.md` dan `prompts/INTEGRATION.md`.
3. `docs/proposal.md`, bagian: Profil dan Level (Anti-cheat); Risiko dan Mitigasi (Kecurangan Level, deteksi di device); Pertanyaan Terbuka (nomor 5).
4. `yolo-service/README.md`, `app/core/detector.py`, `app/core/events.py`, `app/worker.py`.
5. `contracts/detection-event.schema.json` dan `backend/src/modules/devices/schema.ts` (kontrak event).
6. `yolo-service/app/modules/anti_cheat/` (kerangka dan README).
7. `docs/setup-local.md` bagian YOLO di laptop RTX, dan `docs/benchmarks.md`.
8. `yolo-service/app/modules/anti_cheat/checks.py` dan README modulnya
9. README modul `level` (dev-d, tempat tanda diterima dan ditinjau Admin)

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

Menandai rekaman yang dicurigai (diputar ulang atau pola gerak identik berulang) untuk review manual. Menghasilkan skor kecurigaan, bukan keputusan.

## Spesifikasi dari proposal

- Rekaman yang diputar ulang atau pola gerakan identik berulang ditandai untuk review manual. Tidak ada hukuman otomatis.
- Batas 180 menit per hari sudah ditangani modul `level`, bukan di sini.
- Yang boleh disimpan hanya skor, statistik, dan menit main. Menyimpan klip untuk review anti-cheat belum diputuskan (nomor 5). Default: tidak disimpan, jadi analisis dikerjakan pada segmen yang sedang diproses lalu dibuang. Menyimpan hash frame antar-segmen adalah soal kebijakan, tulis sebagai pertanyaan dan jangan diaktifkan tanpa persetujuan.
- Sinyal yang masuk akal dibangun: (1) tanda 'video dari layar' (tepi layar/bingkai persegi, pola moire atau kedip), (2) frame atau jendela frame yang berulang persis dalam satu sesi, (3) tanda tangan gerak (misalnya pose atau optical flow yang diringkas) yang berkorelasi tinggi antar segmen padahal seharusnya berbeda.
- Biaya salah tuduh nyata (pemain jujur ditandai). Ambang harus bisa disetel dan skor harus datang dengan alasan yang bisa dibaca Admin.

## Yang harus dikerjakan

- `checks.py`: fungsi murni per sinyal yang mengembalikan skor 0 sampai 1 dan alasan, serta `suspicion_score(video_path)` yang menggabungkannya. Ambang di konfigurasi.
- Data uji sintetis (tanpa wajah): video yang dibuat dengan numpy, video yang diulang, video dengan derau, untuk memvalidasi tiap sinyal.
- **PR kontrak terpisah**: bagaimana tanda sampai ke backend. Contoh: jenis event baru `suspicion` di `contracts/detection-event.schema.json` (atau endpoint baru). Libatkan dev-c (devices menerima) dan dev-d (level meninjau) sebelum merge. Setelah itu panggil dari worker (koordinasi dengan modul `jobs`, milikmu juga).
- Catat biaya komputasi per menit video di `docs/benchmarks.md`.

## Antarmuka dengan modul lain

Yang kamu sediakan:
- `suspicion_score(video_path)` dan event/endpoint tanda kecurigaan sesuai kontrak baru

Yang kamu pakai:
- Worker `jobs` (modul sendiri)
- Modul `level` menerima tanda dan Admin meninjau (dev-d)
- Modul `devices` menerima event (dev-c)

Kalau yang kamu butuhkan dari modul lain belum ada, buat tiruan atau tipe sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>`, dan sebutkan di laporan. Perubahan kontrak selalu lewat PR terpisah yang disetujui pemilik tiap sisi.

## Keputusan yang belum final

Jangan memutuskan sendiri. Pakai asumsi sementara yang jelas dan tandai `TODO(decision): ...`:

- Klip atau hash disimpan atau tidak, dan berapa lama (nomor 5).
- Ambang kecurigaan awal (asumsi, ukur dari data uji).
- Bentuk kontrak tanda kecurigaan.

## Di luar tugas ini

- Memblokir pemain atau menghapus XP otomatis.
- Batas harian 180 menit (modul level).
- Menambah event atau perilaku yang tidak ada di proposal atau kontrak.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Video sintetis berulang menghasilkan skor tinggi, video acak rendah.
- Tiap sinyal diuji terpisah.
- Ambang yang berubah menggeser keputusan 'ditandai'.
- Tidak ada frame atau klip yang tersisa di disk setelah analisis.

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

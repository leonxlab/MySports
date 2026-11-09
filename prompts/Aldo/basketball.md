# Prompt: basketball

| | |
| --- | --- |
| Modul | `basketball`: Bola masuk ring. Pembeda 2/3 poin belum tercakup (pertanyaan terbuka #10) |
| Pemilik | dev-c (Skor, device, dan AI olahraga tim) |
| Layer | yolo-service |
| Fase | 3 |
| Bobot | 3 |
| Bergantung pada | - |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **High** |
| Branch disarankan | `feat/basketball-shot-detection` |

Alasan effort: Penglihatan komputer pada bola kecil dan cepat dengan data terbatas, dan tidak ada repo yang siap pakai. Butuh eksperimen dan penalaran yang teliti. Effort high.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play, di bagian `yolo-service/` (Python 3.11, FastAPI, Ultralytics YOLO). Layanan ini dikembangkan dan diuji di laptop RTX, lalu dipasang di GPU sewa dengan Docker image yang sama. Tugasmu: mengerjakan modul `basketball` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-c, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3, 5, 7 (YOLO service), 9 (privasi), 10.
2. `MODULES.md` dan `prompts/INTEGRATION.md`.
3. `docs/proposal.md`, bagian: Olahraga yang Didukung (Basket); Scoring dan Statistik (Cakupan deteksi AI tahap awal, Basket); Referensi Repo dan Model YOLO (Basket); Pertanyaan Terbuka (nomor 7, 10, 12).
4. `yolo-service/README.md`, `app/core/detector.py`, `app/core/events.py`, `app/worker.py`.
5. `contracts/detection-event.schema.json` dan `backend/src/modules/devices/schema.ts` (kontrak event).
6. `yolo-service/app/modules/basketball/` (kerangka dan README).
7. `docs/setup-local.md` bagian YOLO di laptop RTX, dan `docs/benchmarks.md`.
8. `yolo-service/app/modules/basketball/detector.py` dan README modulnya
9. `yolo-service/app/core/detector.py`, `events.py`
10. README modul `calibration` (dev-c) dan `scoring` (rules/basketball.ts)

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

Detektor kejadian bola masuk ring untuk basket (full court dan half court), lengkap dengan tim pencetak dari warna baju dan, bila memungkinkan, perkiraan jarak tembakan.

## Spesifikasi dari proposal

- Kejadian yang dideteksi AI: `basket_made` (bola masuk ring). AI difokuskan melacak bola dan mengenali kejadian bola terhadap target yang diam.
- Tim pencetak dikenali dari warna baju tim (`payload.team_color`). Jarak tembakan (`payload.shot_distance_m`) boleh diisi bila bisa diperkirakan dari homografi, tetapi AI **tidak** memutuskan 2 atau 3 poin. Usulan di proposal: Coach memilih 2 atau 3 saat konfirmasi (nomor 10).
- Format full court dan half court. Jumlah pemain per sisi fleksibel.
- Posisi ring dari kalibrasi Coach, bukan dideteksi tiap frame. Model fokus ke bola.
- Titik awal dari proposal: `nvan21/Basketball-Shot-Detection` (YOLOv8 bola dan ring, lintasan; README mengakui belum bisa memastikan bola benar-benar masuk dan video 2D bisa menyesatkan) dan `petermartens98/Finetuned-YOLO-and-Supervision-Basketball-Video-Tracker` (YOLOv5 pemain dan bola, ByteTrack, tim dari warna baju, dilatih untuk siaran NBA, tidak menghitung tembakan). Belum ada yang menghasilkan skor. Keduanya belum diuji.
- Aturan keputusan 'bola masuk': bola melewati area ring dari atas ke bawah dalam urutan frame yang masuk akal, dengan peredaman agar satu tembakan tidak dihitung dua kali. Dokumentasikan aturannya dan kasus yang sulit (bola menggelinding di pinggir ring, bola tertutup pemain).

## Yang harus dikerjakan

- Evaluasi dulu dua repo referensi: lisensi, apakah bobot tersedia, hasil pada klip uji milikmu. Tulis hasilnya di README modul. Putuskan: fine-tune model sendiri (laptop RTX atau Colab) atau pakai ulang.
- Siapkan klip uji kecil berlabel (kapan bola masuk) di `yolo-service/tests/fixtures/`. Pakai klip yang diizinkan dan tanpa wajah yang dapat dikenali. Buat skrip evaluasi (presisi, recall, tembakan terhitung ganda) di `yolo-service/scripts/`.
- `detector.py`: `load()` memuat bobot ke GPU, `process()` membaca video dengan OpenCV pada fps sampel yang bisa diatur, inferensi per batch, pelacak bola, mesin status area ring, lalu mengubahnya menjadi `BasketMade` dengan `make_event_id` dan `timestamp_ms = ctx.start_offset_ms + posisi di segmen`.
- Pisahkan logika murni (mesin status dari urutan posisi bola ke daftar kejadian) dari inferensi supaya bisa dites tanpa GPU.
- Catat hasil ukur di `docs/benchmarks.md` (fps, VRAM, detik proses per menit video) dan bobot di `models/VERSIONS.md`.

## Antarmuka dengan modul lain

Yang kamu sediakan:
- Event `basket_made` sesuai kontrak

Yang kamu pakai:
- Kalibrasi ring (modul calibration)
- Worker `jobs` (dev-a) yang memanggil `process()`

Kalau yang kamu butuhkan dari modul lain belum ada, buat tiruan atau tipe sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>`, dan sebutkan di laporan. Perubahan kontrak selalu lewat PR terpisah yang disetujui pemilik tiap sisi.

## Keputusan yang belum final

Jangan memutuskan sendiri. Pakai asumsi sementara yang jelas dan tandai `TODO(decision): ...`:

- Pembeda 2 dan 3 poin (nomor 10). Jangan memutuskan di sisi AI.
- FPS minimal agar deteksi cukup akurat dan HP apa yang memenuhi (nomor 12): laporkan dari hasil ukurmu, jangan mengarang.
- Tembakan yang melintasi batas segmen (dua segmen berurutan): catat sebagai keterbatasan dan usulkan penanganan, jangan diam-diam diabaikan.

## Di luar tugas ini

- Menghitung skor atau menentukan 2/3 poin.
- Deteksi jenis pelanggaran.
- Mengubah kontrak event (PR kontrak terpisah).
- Menambah event atau perilaku yang tidak ada di proposal atau kontrak.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Mesin status dengan urutan sintetis: masuk, meleset, memantul di ring lalu keluar, dua tembakan berdekatan.
- `event_id` deterministik untuk segmen yang sama.
- Evaluasi pada klip uji dilaporkan di PR (presisi dan recall).

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

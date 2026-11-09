# Prompt: futsal

| | |
| --- | --- |
| Modul | `futsal`: Bola masuk gawang (gol) |
| Pemilik | dev-c (Skor, device, dan AI olahraga tim) |
| Layer | yolo-service |
| Fase | 3 |
| Bobot | 3 |
| Bergantung pada | - |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **High** |
| Branch disarankan | `feat/futsal-goal-detection` |

Alasan effort: Sulit seperti basket (bola cepat dan sering tertutup) dan tanpa repo yang sudah menghitung gol. Effort high.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play, di bagian `yolo-service/` (Python 3.11, FastAPI, Ultralytics YOLO). Layanan ini dikembangkan dan diuji di laptop RTX, lalu dipasang di GPU sewa dengan Docker image yang sama. Tugasmu: mengerjakan modul `futsal` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-c, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3, 5, 7 (YOLO service), 9 (privasi), 10.
2. `MODULES.md` dan `prompts/INTEGRATION.md`.
3. `docs/proposal.md`, bagian: Olahraga yang Didukung (Futsal); Scoring dan Statistik (Cakupan deteksi AI tahap awal, Futsal); Referensi Repo dan Model YOLO (Futsal).
4. `yolo-service/README.md`, `app/core/detector.py`, `app/core/events.py`, `app/worker.py`.
5. `contracts/detection-event.schema.json` dan `backend/src/modules/devices/schema.ts` (kontrak event).
6. `yolo-service/app/modules/futsal/` (kerangka dan README).
7. `docs/setup-local.md` bagian YOLO di laptop RTX, dan `docs/benchmarks.md`.
8. `yolo-service/app/modules/futsal/detector.py` dan README modulnya
9. README modul `calibration` (dev-c) dan `scoring` (rules/futsal.ts)

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

Detektor kejadian bola masuk gawang (gol) untuk futsal.

## Spesifikasi dari proposal

- Kejadian: `goal` (bola masuk gawang). Gol dihitung dari kejadian ini, aturan poinnya (1 gol = 1 poin) ada di backend.
- Posisi gawang dari kalibrasi Coach. Model fokus pada bola.
- Dua kamera: Home merekam sisi home, Away merekam sisi away. Tentukan gawang mana yang terlihat dari tiap kamera dan pastikan tim pencetak ditentukan dengan benar (gol ke gawang sisi mana). Tulis aturannya.
- Titik awal dari proposal: `andreus94/AI-tracker` (YOLO11 pemain dan bola, penguasaan bola per tim, FastAPI dan MinIO, Dockerfile GPU; gol, assist, pelanggaran baru berupa rencana pengembangan) dan model Roboflow Universe `futsal-analysis` (YOLOv11 dengan kelas ball, referee, goal, goalkeeper, player; lisensi dataset perlu dicek). Logika gol dibuat sendiri. Belum diuji.
- Kasus sulit: bola tertutup kiper, membentur tiang, melewati garis gawang di luar mistar, bola di belakang jaring.
- Jenis tendangan dan pencetak gol diinput Coach lewat controller (bukan tugas AI).

## Yang harus dikerjakan

- Evaluasi dua referensi (lisensi, bobot, hasil pada klip uji) dan catat di README modul. Putuskan fine-tune atau pakai ulang.
- Klip uji berlabel kecil di `tests/fixtures/` dan skrip evaluasi di `scripts/` (presisi, recall, gol ganda).
- `detector.py`: pelacak bola, mesin status area gawang (bola melewati garis gawang di dalam bingkai gawang dengan peredaman), `Goal` dengan `make_event_id`.
- Logika murni dipisah dari inferensi agar dites tanpa GPU. Catat benchmark dan versi bobot.

## Antarmuka dengan modul lain

Yang kamu sediakan:
- Event `goal` sesuai kontrak

Yang kamu pakai:
- Kalibrasi gawang (modul calibration)
- Worker `jobs` (dev-a)

Kalau yang kamu butuhkan dari modul lain belum ada, buat tiruan atau tipe sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>`, dan sebutkan di laporan. Perubahan kontrak selalu lewat PR terpisah yang disetujui pemilik tiap sisi.

## Keputusan yang belum final

Jangan memutuskan sendiri. Pakai asumsi sementara yang jelas dan tandai `TODO(decision): ...`:

- FPS minimal dan perangkat (nomor 12).
- Penentuan tim pencetak dari sisi kamera (tulis asumsi, tandai TODO(decision)).

## Di luar tugas ini

- Menghitung skor.
- Deteksi pelanggaran, assist, jenis tendangan.
- Mengubah kontrak event.
- Menambah event atau perilaku yang tidak ada di proposal atau kontrak.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Mesin status: gol, bola melebar, membentur tiang lalu keluar, bola di belakang jaring.
- `event_id` deterministik.
- Evaluasi pada klip uji dilaporkan di PR.

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

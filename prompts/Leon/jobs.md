# Prompt: jobs

| | |
| --- | --- |
| Modul | `jobs`: Worker: ambil segmen dari antrean, proses, kirim event, hapus segmen |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Layer | yolo-service |
| Fase | 3 |
| Bobot | 2 |
| Bergantung pada | - |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **Medium** |
| Branch disarankan | `feat/jobs-worker-hardening` |

Alasan effort: Kerangka sudah ada, tetapi ketahanan dan kebersihan data (video harus terhapus) menuntut ketelitian. Effort medium.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play, di bagian `yolo-service/` (Python 3.11, FastAPI, Ultralytics YOLO). Layanan ini dikembangkan dan diuji di laptop RTX, lalu dipasang di GPU sewa dengan Docker image yang sama. Tugasmu: mengerjakan modul `jobs` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-a, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3, 5, 7 (YOLO service), 9 (privasi), 10.
2. `MODULES.md` dan `prompts/INTEGRATION.md`.
3. `docs/proposal.md`, bagian: AI Detection dan Device Pairing (Penyimpanan video di server, Antrean saat koneksi terputus); Arsitektur (Alur video dan deteksi); Risiko dan Mitigasi (YOLO memproses video dengan sumber daya terbatas); Pertanyaan Terbuka (nomor 3).
4. `yolo-service/README.md`, `app/core/detector.py`, `app/core/events.py`, `app/worker.py`.
5. `contracts/detection-event.schema.json` dan `backend/src/modules/devices/schema.ts` (kontrak event).
6. `yolo-service/app/modules/jobs/` (kerangka dan README).
7. `docs/setup-local.md` bagian YOLO di laptop RTX, dan `docs/benchmarks.md`.
8. `yolo-service/app/worker.py` dan `app/modules/jobs/queue.py`
9. `supabase/migrations/20261108001000_devices.sql` (`claim_next_segment`)
10. `docs/deploy.md` (GPU hosting)

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

Worker yang mengambil segmen dari antrean Supabase, memprosesnya dengan detektor, mengirim event ke backend, dan selalu menghapus segmen. Kerangka sudah ada, tugasmu membuatnya tahan banting dan teruji.

## Spesifikasi dari proposal

- Alur: ambil segmen dari antrean (`claim_next_segment`, atomik dengan `for update skip locked`) → unduh → deteksi → kirim event ke backend → hapus segmen dari Storage → tandai `done`. Video hanya dipakai selama deteksi lalu dihapus. Yang disimpan hanya skor, statistik, dan menit main.
- Gagal setelah `MAX_ATTEMPTS` menjadi `failed` dan segmen tetap dihapus. Percobaan ulang tidak boleh menghapus segmen yang masih dibutuhkan.
- Segmen tidak boleh tertinggal di disk atau di bucket. Tidak ada URL video, wajah, atau nama pemain di log.
- Pengiriman event ke backend idempoten (event_id deterministik dari detektor) sehingga aman diulang saat jaringan bermasalah.
- Server GPU sewa dinyalakan hanya saat ada match. Worker harus aman dimatikan kapan saja (sinyal SIGTERM) tanpa kehilangan pekerjaan.
- Cakupan lima cabang. Sesi tanpa match (main sendiri) butuh cabang dari sesi (kolom `sport` yang ditambahkan dev-c lewat migrasi devices). Saat ini worker memakai fallback sementara, ganti.

## Yang harus dikerjakan

- Refaktor `worker.py` agar bergantung pada antarmuka (`Queue`, `Storage`, `BackendClient`) yang bisa ditukar dengan tiruan di test, tanpa jaringan.
- Pemulihan pekerjaan macet: segmen `processing` yang `locked_at`-nya terlalu lama dikembalikan ke `queued` (pakai fungsi `requeue_stale_segments` dari migrasi dev-c, atau tulis bersama).
- Shutdown halus (SIGTERM), pembersihan tmp, batas ruang disk, pembersihan memori GPU antar segmen, urutan per device berdasarkan `seq`, perhitungan `start_offset_ms` dari kolom durasi segmen.
- Retry dengan backoff untuk pengiriman event dan unduhan.
- Endpoint FastAPI `/metrics` sederhana (kedalaman antrean, jumlah selesai/gagal, rata-rata detik proses) untuk memantau GPU sewa. Logging terstruktur tanpa data sensitif.
- Rapikan `Dockerfile` dan `docker-compose.yml` (healthcheck, restart, rotasi log), perbarui `docs/deploy.md` dan `docs/setup-local.md` bila langkahnya berubah.

## Antarmuka dengan modul lain

Yang kamu sediakan:
- Worker yang memanggil `SportDetector.process()` dan fungsi aktivitas (semua detektor memakainya)

Yang kamu pakai:
- Tabel antrean dan migrasi dari modul devices (dev-c)
- Detektor semua cabang

Kalau yang kamu butuhkan dari modul lain belum ada, buat tiruan atau tipe sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>`, dan sebutkan di laporan. Perubahan kontrak selalu lewat PR terpisah yang disetujui pemilik tiap sisi.

## Keputusan yang belum final

Jangan memutuskan sendiri. Pakai asumsi sementara yang jelas dan tandai `TODO(decision): ...`:

- Penyedia GPU dan jadwal nyala-mati (nomor 3). Rancang worker agar tidak bergantung pada penyedia.
- Batas retensi untuk segmen gagal (usul: tetap dihapus).

## Di luar tugas ini

- Logika deteksi per cabang.
- Endpoint backend.
- Menambah event atau perilaku yang tidak ada di proposal atau kontrak.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Dengan antrean tiruan: sukses menghapus segmen, gagal permanen menghapus segmen, gagal sementara tidak menghapus.
- Segmen macet dikembalikan ke antrean.
- SIGTERM saat memproses: selesai atau dikembalikan ke antrean, tidak hilang.
- Dua worker tidak mendapat segmen yang sama (sertakan skenario dalam dokumentasi uji dengan Supabase lokal).

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

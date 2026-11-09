# Prompt: play_activity

| | |
| --- | --- |
| Modul | `play_activity`: Menit main nyata (orang + bola) untuk Level |
| Pemilik | dev-d (AI olahraga raket, Level, dan fondasi UI) |
| Layer | yolo-service |
| Fase | 3 |
| Bobot | 2 |
| Bergantung pada | - |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **High** |
| Branch disarankan | `feat/play-activity-measure` |

Alasan effort: Definisi 'main nyata' longgar dan harus dibatasi dengan hati-hati, ditambah aturan per cabang. Effort high.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play, di bagian `yolo-service/` (Python 3.11, FastAPI, Ultralytics YOLO). Layanan ini dikembangkan dan diuji di laptop RTX, lalu dipasang di GPU sewa dengan Docker image yang sama. Tugasmu: mengerjakan modul `play_activity` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-d, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3, 5, 7 (YOLO service), 9 (privasi), 10.
2. `MODULES.md` dan `prompts/INTEGRATION.md`.
3. `docs/proposal.md`, bagian: Profil dan Level (Aturan perhitungan Level); Scoring dan Statistik (Level dan jam main, deteksi aktivitas); Risiko dan Mitigasi (kecurangan Level).
4. `yolo-service/README.md`, `app/core/detector.py`, `app/core/events.py`, `app/worker.py`.
5. `contracts/detection-event.schema.json` dan `backend/src/modules/devices/schema.ts` (kontrak event).
6. `yolo-service/app/modules/play_activity/` (kerangka dan README).
7. `docs/setup-local.md` bagian YOLO di laptop RTX, dan `docs/benchmarks.md`.
8. `yolo-service/app/modules/play_activity/activity.py` dan README modulnya
9. README modul `level` (milikmu) dan `anti_cheat` (dev-a)

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

Mengukur menit main nyata dari video untuk perhitungan Level. Kamera menyala tanpa gerakan main tidak boleh dihitung.

## Spesifikasi dari proposal

- Yang dihitung hanya menit saat YOLO mendeteksi aktivitas main nyata, seperti dribble, lari, tembakan, atau interaksi dengan bola. Kamera menyala tanpa gerakan main tidak dihitung.
- Deteksi aktivitas tidak terbatas pada ring, gawang, atau garis. Model YOLO standar (COCO) sudah mengenal kelas orang dan bola, mulai dari sana (mis. `yolo11n`).
- Keluaran per segmen: event `play_activity` dengan `active_seconds` dan `players_detected`. Modul level memakai `players_detected` untuk membedakan Open Play (ada bracket dan pemain lain, 2 XP per menit) dari main sendiri (satu pemain terdeteksi, 1 XP per menit). Definisikan 'pemain terdeteksi' dengan jelas (jumlah maksimum bersamaan, atau jumlah track unik) dan tulis alasannya.
- Harus berjalan untuk lima cabang. Bola raket (kok badminton sulit dikenali kelas 'sports ball') membuat aturannya berbeda per cabang. Tulis aturan per cabang (misalnya untuk raket andalkan gerak orang dan pose, bola sebagai tambahan) dan tandai sebagai asumsi.
- Murah secara komputasi. Aktivitas tidak perlu fps tinggi. Sampel rendah (mis. 5 fps) dan ukur biayanya.

## Yang harus dikerjakan

- Rancang definisi 'aktif' sebagai fungsi murni dari urutan deteksi (orang bergerak, jarak orang ke bola, bola bergerak) dengan jendela dan ambang yang bisa disetel. Dites dengan urutan sintetis.
- `activity.py`: `measure_activity(video_path, ctx)` mengembalikan `PlayActivity` (atau None) dengan `make_event_id` deterministik.
- Klip uji: ada permainan, kamera menyala tanpa permainan, orang berjalan saja, bola diam. Evaluasi apakah menit terukur wajar. Laporkan pada PR.
- Koordinasikan dengan dev-a (anti_cheat) bila ada fitur gerak yang bisa dipakai bersama, tanpa menggabungkan modul.

## Antarmuka dengan modul lain

Yang kamu sediakan:
- Event `play_activity` (diterima devices lalu diteruskan ke level, modul sendiri)

Yang kamu pakai:
- Worker `jobs` (dev-a)
- Kalibrasi opsional (area lapangan untuk mengabaikan orang di luar lapangan)

Kalau yang kamu butuhkan dari modul lain belum ada, buat tiruan atau tipe sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>`, dan sebutkan di laporan. Perubahan kontrak selalu lewat PR terpisah yang disetujui pemilik tiap sisi.

## Keputusan yang belum final

Jangan memutuskan sendiri. Pakai asumsi sementara yang jelas dan tandai `TODO(decision): ...`:

- Atribusi menit ke pemain tertentu (di modul level, bukan di sini).
- Definisi 'pemain terdeteksi' dan aturan per cabang (tulis asumsi).
- FPS sampel (nomor 12).

## Di luar tugas ini

- Mengidentifikasi siapa pemainnya.
- Menghitung XP (modul level).
- Menambah event atau perilaku yang tidak ada di proposal atau kontrak.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Urutan sintetis: aktif, diam, berjalan saja, bola diam.
- Jendela dan ambang mengubah hasil sesuai harapan.
- `active_seconds` tidak pernah melebihi durasi segmen.
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

# Rencana issue jalur Aldo

Hasil prompt pembuka `prompts/Aldo/00-kickoff.md`. Belum ada kode yang dibuat. Modul dikerjakan satu per satu lewat prompt modul masing-masing.

## Ringkasan jalur

1. Jalur Aldo (dev-c) mencakup `scoring` dan `devices` di aplikasi, serta `calibration`, `basketball`, dan `futsal` di yolo-service.
2. Alurnya: kamera dipasangkan ke sesi, mengunggah segmen video ke Storage, yolo-service mendeteksi kejadian bola, lalu backend menerapkan aturan skor cabang.
3. AI hanya mengusulkan kejadian (`basket_made`, `goal`) berstatus `suggested`; Coach mengonfirmasi lewat controller dan input manual selalu tersedia.
4. Fase 0 lebih dulu: autentikasi WebSocket di `core/realtime.ts`, kontrak `contracts/calibration.schema.json`, dan memo format segmen video.
5. Urutan modul: `calibration` (kontrak dipakai semua detektor), lalu `scoring`, `devices`, `basketball`, dan `futsal`.
6. `scoring` dimulai dari aturan murni di `scoring/rules/` (kerangkanya sudah ada beserta `rules.test.ts`), lalu service dan endpoint.
7. `scoring` menyediakan `ingestSuggestedEvents` dan `getScoreSnapshot`, serta komponen control menu untuk halaman match milik Jonathan.
8. `devices` menyediakan pairing maksimal 3 device, signed URL segmen maksimal 50 MB, ingest event `POST /events`, dan layar kamera dengan antrean offline.
9. `basketball` dan `futsal` memisahkan mesin status murni dari inferensi GPU supaya bisa dites tanpa GPU, dan memakai geometri dari `calibration`.
10. Bergantung pada Jonathan: `match` (`getMatchSettings` sudah ada, data match dibaca lewat `get(id)`) dan `bracket.getBracketMatch` (sudah ada).
11. Bergantung pada Eugene: `level.ingestPlayActivity`, yang belum ada di `main`; sementara memakai tiruan bertanda `TODO(integration)`.
12. Bergantung pada Leon: worker `jobs` yang mengonsumsi antrean `video_segments`; kolom segmen baru harus disepakati dengannya.
13. Memberi: kontrak kalibrasi untuk Eugene dan Jonathan, metadata antrean segmen untuk Leon, dan komponen skor untuk Jonathan.

## Hal yang belum jelas atau bertentangan

### Memblokir (perlu dijawab atau disepakati sebelum bagian terkait dikerjakan)

- **Nama fungsi `match` tidak sama dengan `prompts/INTEGRATION.md`.** Tabel integrasi menjanjikan `getMatch(id)`, tetapi `createMatchApi` di `main` mengekspor `get(id)` dan `getMatchSettings(id)`. Perlu konfirmasi Jonathan: tambah alias `getMatch` atau ubah baris integrasi. Memblokir integrasi `scoring` dan `devices` dengan `match`, bukan aturan skor murni.
- **`requeue_stale_segments` sudah dibuat di luar jalur ini.** Migrasi `20261109160000_devices_worker_recovery_and_order.sql` (commit `feat(jobs)`, Leon) sudah mendefinisikan `requeue_stale_segments(p_stale_seconds integer)` di tabel milik `devices`, padahal prompt `devices` meminta Aldo membuatnya. Perlu disepakati dengan Leon: fungsi itu dipakai apa adanya, dan migrasi baru `devices` hanya menambah kolom (`consent_at`, `sport`, `duration_ms`, `started_at_ms`). Memblokir migrasi `devices`.
- **WebSocket sesi ditandai "publik".** README `devices` mencantumkan `WS /sessions/:id/live` dengan akses `publik`, padahal tugas Fase 0 mewajibkan autentikasi `?token=` di `liveRoute`. Perlu diputuskan apakah device kamera (yang mungkin belum login penuh) memakai token sesi khusus atau token login biasa. Memblokir PR `core/realtime.ts`.
- **`ingestPlayActivity` belum ada.** Ingest event `play_activity` di `devices` tidak bisa tersambung sampai Eugene merge kerangka tipenya. Bagian lain `devices` tidak terblokir.

### Cukup ditandai `TODO(decision)`

- Format segmen video: keputusan #6 proposal menyebut HLS (m3u8), tetapi pertanyaan terbuka #13 dan `docs/architecture.md` mengusulkan MediaRecorder dulu. Ditulis di memo `docs/decisions/video-segment-format.md`; asumsi sementara MediaRecorder.
- Pembeda basket 2 dan 3 poin (#10): bagian "Aturan per cabang" menyebut berdasarkan jarak tembakan, sedangkan pertanyaan #10 masih terbuka. Asumsi sementara: Coach memilih 2 atau 3 saat konfirmasi. AI tidak memutuskannya.
- Memadukan skor manual Coach dengan hasil AI yang menyusul setelah koneksi pulih, dan batas antrean offline di device (#4).
- Struktur game dan set badminton, tennis, padel, serta kejadian AI tennis dan padel (#11). Tidak memblokir basket dan futsal.
- FPS minimal per cabang dan HP yang memenuhi (#12): angka diambil dari hasil ukur, bukan ditebak.
- Titik kalibrasi wajib per cabang (usul: 4 sudut lapangan ditambah ring atau gawang) dan penanganan kamera bergeser di tengah sesi.
- Penentuan tim pencetak gol futsal dari sisi kamera, dan tembakan atau gol yang melintasi batas dua segmen.
- Siapa yang boleh membuat sesi main tanpa Coach (untuk XP 1/menit).
- Strategi komputasi: bagian "Strategi komputasi tanpa budget" membahas deteksi di device, sedangkan keputusan #16 dan #20 menetapkan YOLO di server. Jalur ini mengikuti keputusan server.
- Label `fase:0` dipakai untuk tugas Fase 0 (mengikuti `dev-a-issues.md`), padahal `rules.md` bagian 11 hanya menyebut `fase:1` sampai `fase:4`.

## Daftar issue

### 1. Autentikasi WebSocket realtime

- **Judul:** Authenticate realtime WebSocket subscriptions via token
- **Label:** `mod:devices`, `fase:0`, `backend`
- **Selesai kalau:**
  - `liveRoute` memverifikasi `?token=` sebelum subscribe dan menutup koneksi tanpa token atau dengan token tidak valid; `TODO(auth)` dihapus.
  - Test mencakup token valid, token hilang, dan token kedaluwarsa atau palsu.
  - PR berscope `backend-core` dan direview Leon atau Jonathan.

### 2. Kontrak kalibrasi

- **Judul:** Add calibration contract schema
- **Label:** `mod:calibration`, `fase:0`, `yolo`, `backend`
- **Selesai kalau:**
  - `contracts/calibration.schema.json` memuat titik piksel, jenis target, cabang, mode, dan resolusi frame acuan.
  - Tipe zod di `devices/schema.ts` dan model pydantic di yolo-service cocok dengan kontrak.
  - PR terpisah dari fitur dan disetujui Eugene serta Jonathan sebelum merge.

### 3. Memo format segmen video

- **Judul:** Write decision memo for video segment format
- **Label:** `mod:devices`, `fase:0`, `docs`
- **Selesai kalau:**
  - `docs/decisions/video-segment-format.md` membandingkan HLS (m3u8) dan potongan MediaRecorder, termasuk pertentangan keputusan #6 dan pertanyaan #13.
  - Memo memuat rencana uji di ponsel target (Android dan iOS) tanpa mengarang hasil.
  - Keputusan akhir tetap ditandai `TODO(decision)` sampai tim setuju.

### 4. Geometri lapangan dan homografi

- **Judul:** Implement calibration parsing, court geometry, and homography
- **Label:** `mod:calibration`, `fase:3`, `yolo`
- **Selesai kalau:**
  - `points.py` mem-parse dan memvalidasi kalibrasi sesuai kontrak, menyediakan `CourtGeometry` per cabang dan fungsi homografi serta uji titik.
  - Semua fungsi murni dan dites dengan titik sintetis; `ruff` dan `pytest` lolos.
  - Urutan titik yang ditandai per cabang didokumentasikan untuk UI `devices`.

### 5. Aturan skor per cabang

- **Judul:** Implement pure scoring rules for all sports
- **Label:** `mod:scoring`, `fase:2`, `backend`
- **Selesai kalau:**
  - `apply`, `isFinished`, dan `defaults` di `scoring/rules/` untuk lima cabang bersifat murni dan nilai bawaannya bisa diganti dari setting match.
  - Test memakai contoh dari proposal; asumsi game/set badminton, tennis, padel tertulis di README dan ditandai `TODO(decision)`.
  - `vitest` dan typecheck backend lolos.

### 6. Service dan endpoint scoring

- **Judul:** Implement scoring service, endpoints, and cross-module API
- **Label:** `mod:scoring`, `fase:2`, `backend`
- **Selesai kalau:**
  - Endpoint di README `scoring` tidak lagi 501, termasuk konfirmasi usulan AI dengan pilihan 2/3 poin, koreksi poin, dan pelanggaran.
  - `ingestSuggestedEvents` idempoten lewat `event_key` dan menyiarkan ke `match:{id}`; `getScoreSnapshot` tersedia.
  - Integrasi `match` yang belum cocok namanya ditandai `TODO(integration)`; test mencakup dedup dan alur konfirmasi.

### 7. Antarmuka scoring

- **Judul:** Build scoring result pages and control-menu components
- **Label:** `mod:scoring`, `fase:2`, `frontend`
- **Selesai kalau:**
  - `/match/[id]/result` dan `/stats` memakai `api.ts` modul dengan state loading dan error.
  - `ScorerPicker`, `ManualActionPanel`, `FoulPanel`, dan `SuggestionQueue` siap dipasang di control menu milik Jonathan.
  - Tidak ada aturan skor yang dihitung di klien.

### 8. Pairing sesi dan antrean segmen

- **Judul:** Implement device session pairing and segment queue backend
- **Label:** `mod:devices`, `fase:3`, `backend`, `db`
- **Selesai kalau:**
  - Generator kode sesi murni dan dites (tanpa karakter membingungkan, kedaluwarsa, batas percobaan); satu peran hanya untuk satu device.
  - Signed upload menolak segmen di atas 50 MB; `.../uploaded` memeriksa file ada sebelum status `queued`.
  - Migrasi baru menambah kolom yang disepakati dengan Leon dan memakai ulang `requeue_stale_segments` yang sudah ada; RLS aktif.
  - `POST /events` memvalidasi `x-service-key`, idempoten, dan mengembalikan hasil per event.

### 9. Layar kamera dan antrean offline

- **Judul:** Build camera, pairing, and coach session screens
- **Label:** `mod:devices`, `fase:3`, `frontend`
- **Selesai kalau:**
  - `/coach/session/new`, `/device/pair`, dan `/device/camera/[sessionId]` memakai `api.ts` modul.
  - Sesi tidak bisa mulai tanpa persetujuan pemain; waktu persetujuan dikirim ke backend.
  - Segmen tertahan di IndexedDB saat offline dengan label status yang diminta proposal, dikirim berurutan saat tersambung, lalu dihapus dari device.

### 10. Detektor basket

- **Judul:** Implement basketball made-shot detector
- **Label:** `mod:basketball`, `fase:3`, `yolo`
- **Selesai kalau:**
  - Lisensi, ketersediaan bobot, dan hasil dua repo referensi pada klip uji tercatat di README modul.
  - Mesin status murni (urutan posisi bola ke `basket_made`) dites tanpa GPU; skrip evaluasi menghitung presisi, recall, dan tembakan ganda.
  - Benchmark dan versi bobot dicatat hanya dari hasil ukur nyata; keterbatasan batas segmen dilaporkan.

### 11. Detektor futsal

- **Judul:** Implement futsal goal detector
- **Label:** `mod:futsal`, `fase:3`, `yolo`
- **Selesai kalau:**
  - Evaluasi dua referensi tercatat di README modul.
  - Mesin status area gawang dengan peredaman dites tanpa GPU; skrip evaluasi menghitung presisi, recall, dan gol ganda.
  - Asumsi tim pencetak dari sisi kamera ditandai `TODO(decision)`; benchmark dan versi bobot dicatat dari hasil ukur nyata.

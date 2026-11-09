# Prompt: devices

| | |
| --- | --- |
| Modul | `devices`: Device dan deteksi AI |
| Pemilik | dev-c (Skor, device, dan AI olahraga tim) |
| Layer | backend + frontend |
| Fase | 3 |
| Bobot | 3 |
| Bergantung pada | match, scoring |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **High** |
| Branch disarankan | `feat/devices-pairing-and-ingest` |

Alasan effort: Banyak bagian bergerak lintas frontend, backend, storage, dan worker, ditambah isu privasi dan koneksi. Effort high.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `devices` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-c, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: AI Detection dan Device Pairing (seluruhnya, termasuk Antrean saat koneksi terputus); Arsitektur (Alur video dan deteksi); Risiko dan Mitigasi (koneksi, privasi); Pertanyaan Terbuka (nomor 4, 12, 13).
4. `backend/src/modules/devices/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`device_sessions`, `session_devices`, `video_segments`).
6. `frontend/src/modules/devices/README.md` dan halaman placeholder di `frontend/src/app/`.
7. `docs/architecture.md` (alur video)
8. `supabase/migrations/20261108001000_devices.sql` (sesi, device, antrean, `claim_next_segment`)
9. `contracts/detection-event.schema.json` dan `backend/src/modules/devices/schema.ts`
10. `yolo-service/app/worker.py` (konsumen antrean)

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Pairing sampai 3 device per sesi, upload segmen video langsung ke Supabase Storage, pintu masuk event dari yolo-service, dan layar kamera. Ini jembatan antara frontend, backend, dan YOLO.

## Spesifikasi dari proposal

- Satu sesi pertandingan memakai maksimal 3 device: kamera Home, kamera Away, dan controller (dipegang Coach). Pairing lewat QR atau kode sesi.
- Kode sesi: pendek, alfabet tanpa karakter membingungkan, kedaluwarsa, dan dibatasi percobaannya supaya tidak bisa ditebak. Satu peran hanya boleh dipegang satu device per sesi.
- Video dipecah menjadi segmen maksimal 50 MB dan diunggah **langsung ke Supabase Storage** lewat signed URL. Jangan lewat backend (router Heroku memutus request di 30 detik). Setelah unggah selesai, kamera memanggil `.../uploaded`, backend memeriksa file benar-benar ada, lalu status segmen menjadi `queued`.
- Video tidak disimpan permanen di device. Bagian yang belum terkirim ditahan sementara dengan label status: "Jaringan device terputus. Analisa akan dilanjutkan otomatis saat terhubung ke internet." Saat tersambung, dikirim berurutan lalu dihapus dari device. Selama putus, Coach tetap bisa input skor manual.
- Pemain harus menyetujui sebelum direkam. Layar kamera menampilkan persetujuan dan sesi tidak bisa mulai tanpanya. Simpan waktu persetujuan di sesi.
- Endpoint `POST /events` dipanggil yolo-service dengan header `x-service-key`. Validasi dengan `ingestEventsBody` (sudah ada). Kejadian bola (`basket_made`, `goal`, `ball_landed`) diteruskan ke `scoring.ingestSuggestedEvents`, `play_activity` diteruskan ke `level.ingestPlayActivity`. Idempoten dan mengembalikan hasil per event.
- Kalibrasi: Coach menandai titik lapangan, ring, atau gawang sekali saat setup, disimpan di `device_sessions.calibration`. Bentuk datanya dikontrakkan (lihat bagian keputusan).
- Laporan kemampuan device (resolusi, fps, koneksi) disimpan dan menghasilkan peringatan bila di bawah syarat awal (kamera minimal 1080p 30 fps di tripod, tersambung daya). Angka akhir ditentukan dari uji, jangan dikunci.
- WebSocket `session:{id}`: status tiap device (online, offline, terakhir terlihat) dan relai skor langsung.

## Yang harus dikerjakan

### Database
Tabel `device_sessions`, `session_devices`, `video_segments` dan fungsi `claim_next_segment` sudah ada. Migrasi BARU: kolom `consent_at`, `sport` (untuk sesi tanpa match), `duration_ms` dan `started_at_ms` pada `video_segments` (agar yolo-service bisa menghitung offset waktu), fungsi `requeue_stale_segments(older_than)`. Koordinasikan nama kolom dengan dev-a yang memegang worker `jobs`.

### Backend
- `schema.ts` (lengkapi untuk sesi, join, sign, kalibrasi), `service.ts`, `routes.ts` sesuai README.
- `code.ts`: generator kode sesi (murni, dites).
- `liveRoute` untuk `/sessions/:id/live` dan heartbeat yang mengisi `last_seen_at`.
- Signed URL: gunakan Supabase Storage `createSignedUploadUrl`, path `{sessionId}/{deviceId}/{seq}`, tolak ukuran di atas 50 MB.

### Frontend
- `/coach/session/new` (tampilkan QR dan kode, status device masuk), `/device/pair` (pindai QR atau ketik kode, pilih peran), `/device/camera/[sessionId]`.
- Layar kamera: izin kamera, persetujuan pemain, rekam dengan `MediaRecorder` (potongan berurutan), unggah dengan signed URL, antrean offline di IndexedDB, label status jaringan, hapus lokal setelah terkirim, indikator suhu/baterai bila API tersedia. QR dengan library kecil (catat di PR).
- Controller memakai halaman control menu milik modul match.

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- `createDevicesApi(ctx)`: `getSession`
- Endpoint ingest event untuk yolo-service

Yang kamu pakai dari modul lain:
- `createScoringApi(ctx).ingestSuggestedEvents` (dev-c, modul sendiri)
- `createLevelApi(ctx).ingestPlayActivity` (dev-d)
- `createMatchApi(ctx).getMatch` (dev-b)

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Format segmen: HLS (m3u8) atau potongan MediaRecorder (nomor 13). Usul proposal: MediaRecorder dulu. Tulis memo `docs/decisions/video-segment-format.md` dan bangun dengan MediaRecorder.
- Batas antrean offline di device: menit atau MB (nomor 4).
- Sesi main sendiri tanpa Coach (untuk XP 1/menit): siapa yang boleh membuat sesi (TODO(decision)).
- Penyedia GPU dan penjadwalan nyala-mati (nomor 3, di luar modul ini).

## Di luar tugas ini

- Aturan skor (scoring).
- Pemrosesan video (yolo-service).
- Penentuan XP (level).
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Generator kode: karakter valid, panjang, tidak bentrok pada ribuan sampel.
- Maksimal 3 device dan satu peran per sesi, kode kedaluwarsa ditolak.
- Sign upload menolak ukuran > 50 MB.
- Ingest: x-service-key salah 401, event tidak valid 400, event_id ganda tidak diproses dua kali, hasil per event.
- Sesi tidak bisa aktif tanpa persetujuan.

Perintah pemeriksaan:
```
cd backend && npm run typecheck && npm test
cd frontend && npm run typecheck && npm run build
```
Test baru ditulis dengan `vitest` (backend). Service diuji dengan klien Supabase tiruan, tanpa jaringan.

## Cara kerja

1. Tulis rencana singkat (5 sampai 10 baris): urutan kerja, bagian paling berisiko, dan asumsi yang akan kamu pakai. Kalau ada hal yang benar-benar menghalangi dan jawabannya tidak ada di repo maupun proposal, tanyakan sebelum menulis kode. Selain itu lanjut dengan asumsi yang ditandai `TODO(decision)`.
2. Kerjakan dari bagian paling berisiko: fungsi murni dan test lebih dulu, baru service, route, lalu frontend (atau pipeline lalu detektor untuk modul YOLO).
3. Commit kecil dengan format `tipe(scope): ringkasan` (hook `.githooks/commit-msg` menolak format salah). Pecah pekerjaan menjadi PR yang bisa direview, kira-kira di bawah 400 baris diff di luar lockfile dan migrasi.
4. Jangan menyentuh file di luar modulmu kecuali tertulis di tugas ini. Perubahan di `core`, `contracts`, atau migrasi modul lain dibuat sebagai PR terpisah dengan scope yang sesuai.
5. Jalankan pemeriksaan sebelum menyatakan selesai (perintah di bagian Pengujian).
6. Perbarui README modul (tabel endpoint, checklist) dan baris modul di `MODULES.md`.

## Definisi selesai

- Semua endpoint modul berjalan (tidak ada `todo(...)` yang tersisa, kecuali yang tertulis sebagai ditunda di atas) dan tabel endpoint di README modul sesuai kode.
- Logika bisnis ada di `service.ts` dan dites. Tidak ada aturan bisnis di frontend.
- Halaman frontend modul berfungsi dengan state loading dan error, memakai `api.ts` modul.
- Migrasi baru (bila ada) berupa file baru dengan RLS aktif.
- Typecheck, test, dan build lolos.
- README modul dan `MODULES.md` diperbarui.
- Tidak ada secret, `.env`, atau data pengguna di commit.

## Laporan akhir

Tutup dengan laporan singkat:
- Apa yang sudah jadi dan apa yang belum (jujur, termasuk yang hanya stub).
- Perintah yang dijalankan dan hasilnya.
- Asumsi dan `TODO(decision)` yang harus diputuskan tim, masing-masing satu kalimat.
- Perubahan di luar modulmu (kalau ada) dan siapa yang perlu me-review.
- Risiko atau hal yang kamu ragukan.

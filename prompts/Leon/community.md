# Prompt: community

| | |
| --- | --- |
| Modul | `community`: Community discussion |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Layer | backend + frontend |
| Fase | 1 |
| Bobot | 2 |
| Bergantung pada | accounts |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **Medium** |
| Branch disarankan | `feat/community-threads` |

Alasan effort: CRUD biasa dengan beberapa aturan. Effort medium.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `community` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-a, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: Fitur per Role (User: Community Discussion); Halaman Utama dan Personalisasi (Klasifikasi konten); Risiko dan Mitigasi (konten tidak pantas).
4. `backend/src/modules/community/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`threads`, `thread_posts`, `content_reports`).
6. `frontend/src/modules/community/README.md` dan halaman placeholder di `frontend/src/app/`.
7. README modul `feed` (klasifikasi konten dan sinyal kebiasaan)

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Forum diskusi per cabang olahraga: thread, balasan, media, laporan konten, dan moderasi.

## Spesifikasi dari proposal

- Thread khusus tiap olahraga (basket, padel, badminton, futsal, tennis). User membagikan pencapaian, skor, pengalaman, video, dan foto.
- Membaca thread boleh tanpa login. Membuat thread, membalas, mengunggah media, dan melapor wajib login.
- Media (foto/video) diunggah ke bucket `media` lewat signed URL (maksimal 50 MB per file). Simpan hanya path di `media jsonb`.
- Moderasi: pengguna bisa melaporkan thread atau balasan, Admin menindak (resolve atau dismiss, dan menyembunyikan konten). Tambahkan kolom `hidden` lewat migrasi baru.
- Setiap thread baru diklasifikasi otomatis (cabang, jenis konten, format teks/foto/video, lokasi bila ada) lewat `createFeedApi(ctx).classifyContent(...)`. Pembuatan, balasan, dan pembacaan thread juga dicatat sebagai sinyal kebiasaan lewat `recordSignal`.
- Isi konten adalah teks biasa. Jangan merender HTML mentah.

## Yang harus dikerjakan

### Database
Tabel `threads`, `thread_posts`, `content_reports` sudah ada. Tambah `hidden`, index paginasi, dan batas panjang lewat migrasi baru.

### Backend
- `schema.ts`: judul, isi, media (maks jumlah), filter cabang, cursor.
- `service.ts`: list thread (cursor pagination, filter cabang), buat thread, ambil thread beserta balasan, balas, sign upload, lapor, daftar laporan admin, resolve (opsi sembunyikan konten).
- Rate limit sederhana per user untuk membuat thread dan laporan (batas di service, belum perlu Redis).

### Frontend
- `/community` (daftar, filter cabang), `/community/[id]` (thread dan balasan), `/community/new`, `/admin/reports`.
- Unggah media langsung ke Storage lewat signed URL, tampilkan progres dan error.

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- `createCommunityApi(ctx).countOpenReports()` untuk dasbor admin
- `listRecentThreads(filter)` untuk feed

Yang kamu pakai dari modul lain:
- `createAccountsApi(ctx).getProfileSummaries`
- `createFeedApi(ctx).classifyContent`, `recordSignal` (dev-a, modul sendiri)

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Aturan moderasi rinci (kata terlarang, sanksi pengguna) belum ada. Hanya sediakan laporan dan sembunyikan konten.

## Di luar tugas ini

- Notifikasi, reaksi/like, pesan pribadi (tidak ada di proposal).
- Personalisasi urutan (modul feed).
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Pembacaan publik tanpa token berhasil.
- Konten tersembunyi tidak muncul untuk publik.
- Laporan ganda dari user yang sama pada target yang sama ditolak.
- Validasi media (jumlah, tipe).

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

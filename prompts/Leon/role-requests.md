# Prompt: role-requests

| | |
| --- | --- |
| Modul | `role-requests`: Pengajuan Coach dan Owner Lapangan |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Layer | backend + frontend |
| Fase | 1 |
| Bobot | 1 |
| Bergantung pada | accounts |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **Medium** |
| Branch disarankan | `feat/role-requests-submit-and-review` |

Alasan effort: Alurnya jelas dan kecil. Effort medium.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `role-requests` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-a, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: Role dan Hak Akses; Fitur per Role (Coach, Admin); Arsitektur (Kelompok API: Pengajuan role).
4. `backend/src/modules/role-requests/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`role_requests`).
6. `frontend/src/modules/role-requests/README.md` dan halaman placeholder di `frontend/src/app/`.
7. README modul `accounts` (fungsi `grantRole`)

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Alur pengajuan User menjadi Coach atau Owner Lapangan dan persetujuannya oleh Admin.

## Spesifikasi dari proposal

- Semua akun mulai sebagai User, lalu bisa mengajukan diri menjadi Coach atau Owner Lapangan. Pengajuan disetujui Admin.
- Pengajuan Coach memuat verifikasi pengalaman dan prestasi dalam bentuk teks, gambar, video, atau URL. Simpan sebagai daftar bukti `[{type: text|image|video|url, value}]`. Gambar dan video diunggah lewat signed URL ke bucket `media`.
- Pengajuan Owner Lapangan hanya mengajukan role. Lapangannya sendiri harus disetujui terpisah di modul `venues`. Jangan campur dua persetujuan ini.
- Admin menyetujui atau menolak. Saat disetujui, role diberikan lewat `createAccountsApi(ctx).grantRole`. Tabel `user_roles` hanya ditulis modul accounts.
- Satu user tidak boleh punya dua pengajuan `pending` untuk role yang sama.
- Aksi admin pada endpoint admin otomatis tercatat di audit log oleh hook di core. Jangan menulis audit log manual.

## Yang harus dikerjakan

### Database
Tabel `role_requests` sudah ada. Periksa kolom catatan penolakan dan batasan unik untuk pengajuan pending ganda (partial unique index lewat migrasi baru).

### Backend
- `schema.ts` untuk bukti (batasi jumlah dan panjang) dan alasan penolakan.
- `service.ts`: submit coach/owner, daftar milik sendiri, daftar admin (filter status, paginasi), approve, reject. Approve dan reject harus atomik terhadap status (tidak bisa diproses dua kali).
- `routes.ts` sesuai tabel endpoint di README modul.

### Frontend
- `/apply/coach` (form bukti: tambah teks, URL, unggah gambar/video), `/apply/owner`, `/apply/status`.
- `/admin/approvals/roles`: daftar pengajuan, detail bukti, tombol setujui/tolak dengan alasan.

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- `createRoleRequestsApi(ctx).countPending()` untuk dasbor admin

Yang kamu pakai dari modul lain:
- `createAccountsApi(ctx).grantRole`, `getProfileSummary` (dev-a, modul sendiri)

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Apakah Coach yang sudah disetujui bisa dicabut dan oleh siapa (proposal tidak menyebut). Sediakan `revokeRole` di accounts saja, tanpa endpoint.

## Di luar tugas ini

- Persetujuan lapangan (venues).
- Badge atau label khusus Admin.
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Pengajuan pending ganda ditolak.
- Approve memberi role, reject tidak.
- Approve dua kali tidak memberi role dua kali.
- User biasa tidak bisa mengakses endpoint admin.

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

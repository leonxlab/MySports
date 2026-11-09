# Prompt: accounts

| | |
| --- | --- |
| Modul | `accounts`: Akun dan profil |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Layer | backend + frontend |
| Fase | 1 |
| Bobot | 2 |
| Bergantung pada | - |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **Medium** |
| Branch disarankan | `feat/accounts-profile-and-roles` |

Alasan effort: Logikanya sederhana tetapi semua modul bergantung pada bentuk keluarannya. Effort medium cukup, tekankan pada kejelasan antarmuka `createAccountsApi`.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `accounts` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-a, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: Role dan Hak Akses; Profil dan Level; Fitur per Role (User); Arsitektur (Kelompok API: Akun dan profil).
4. `backend/src/modules/accounts/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`profiles`, `user_roles`, `profile_sport_experience`, `profile_gallery`).
6. `frontend/src/modules/accounts/README.md` dan halaman placeholder di `frontend/src/app/`.
7. `backend/src/core/auth.ts` dan `backend/src/core/roles.ts` (cara role dibaca dari tabel `user_roles`)

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Profil pemain dan sistem role yang menjadi dasar semua modul lain. Modul ini memblokir hampir semua pekerjaan lain, jadi selesaikan dan merge paling dulu, mulai dari bagian minimal (bootstrap, getMe, role) sebelum bagian galeri.

## Spesifikasi dari proposal

- Semua akun mulai sebagai User. Satu akun boleh memegang beberapa role sekaligus (user, coach, owner, admin).
- Login dan signup memakai Supabase Auth langsung dari frontend. Backend hanya membuat profil lewat `POST /bootstrap` setelah signup. Endpoint ini harus idempotent (dipanggil dua kali tidak membuat dua baris).
- Field profil: nama tampilan, usia, pengalaman bermain (lama dan riwayat per cabang olahraga), role, Level (0 sampai 300, hanya dibaca dari modul `level`), foto profil, galeri (foto, video, quotes), badge VIP (hanya komponen tampilan dari modul `vip`).
- Admin tampil sebagai user biasa. Endpoint profil publik tidak boleh menyertakan role `admin` atau penanda apa pun yang membedakannya.
- Upload foto dan galeri langsung ke bucket Supabase `media` lewat signed URL. File tidak lewat backend.
- Level: sampai modul `level` jadi, kembalikan `level: 0` di profil dan beri `TODO(integration)`. Setelah itu panggil `createLevelApi(ctx).getLevelSummary(userId)`.

## Yang harus dikerjakan

### Database
Tabel `profiles`, `user_roles`, `profile_sport_experience`, `profile_gallery` sudah ada migrasinya. Periksa apakah cukup (misalnya urutan galeri, batas ukuran). Perubahan lewat migrasi baru.

### Backend
- `schema.ts`: skema zod untuk bootstrap, update profil, pengalaman per cabang (`:sport` harus salah satu dari lima cabang), item galeri (kind photo/video/quote; quote wajib `quote_text`, photo/video wajib `storage_path`).
- `service.ts`: `bootstrapProfile`, `getMe`, `updateMe`, `getPublicProfile`, `upsertExperience`, galeri (tambah, hapus; hanya pemilik), `signPhotoUpload`.
- Fungsi untuk modul lain (ekspor lewat `createAccountsApi`): `getProfileSummary(userId)` dan `getProfileSummaries(ids)` (id, nama, foto, level), `getRoles(userId)`, `grantRole(userId, role, grantedBy)`, `revokeRole(...)`. Hanya modul ini yang menulis ke `user_roles`.
- `routes.ts`: ganti semua `todo(...)`. Respons `/me` boleh memuat role sendiri, respons `/:id` tidak boleh memuat role admin.

### Frontend
- Halaman: `/login`, `/register`, `/profile`, `/profile/[id]`, `/profile/edit` (route sudah ada sebagai placeholder).
- Sesi: komponen client `SessionProvider` dan hook `useMe` di `frontend/src/modules/accounts/components`. Panggil `POST /accounts/bootstrap` sekali setelah signup pertama berhasil.
- Halaman profil menyediakan slot untuk komponen modul lain: `LevelBadge`/`LevelProgress` (modul level), `VipBadge` dan `VipSubscribeButton` (modul vip). Pasang placeholder yang aman bila komponen itu belum ada.
- Styling: library UI belum dipilih. Pakai CSS sederhana dan jangan menambah dependensi besar. Nama aplikasi belum ditentukan, jadi taruh di satu konstanta.

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- `createAccountsApi(ctx)`: `getProfileSummary(s)`, `getRoles`, `grantRole`, `revokeRole` (dipakai role-requests, open-play, community, scoring, admin)
- Komponen `SessionProvider`, `useMe` (dipakai semua halaman yang butuh login)

Yang kamu pakai dari modul lain:
- `createLevelApi(ctx).getLevelSummary` (dev-d), nanti

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Nama aplikasi (ditunda).
- Library UI/styling (dibahas di memo dev-d, `docs/decisions/ui-stack.md`).

## Di luar tugas ini

- Pengajuan Coach/Owner (modul role-requests).
- Perhitungan Level.
- Mengubah `core/auth.ts` (kalau perlu, PR terpisah scope `backend-core`).
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Bootstrap dipanggil dua kali: satu profil, satu role user.
- Profil publik pengguna ber-role admin tidak memuat penanda admin.
- Hanya pemilik yang bisa menghapus item galeri.
- Validasi galeri (quote tanpa teks ditolak).
- Service diuji dengan Supabase client tiruan, tanpa jaringan.

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

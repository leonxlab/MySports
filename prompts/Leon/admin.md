# Prompt: admin

| | |
| --- | --- |
| Modul | `admin`: Dasbor admin dan audit log |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Layer | backend + frontend |
| Fase | 1 |
| Bobot | 1 |
| Bergantung pada | role-requests, venues, payments, community, level |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **Medium** |
| Branch disarankan | `feat/admin-overview-and-audit` |

Alasan effort: Kecil. Effort medium cukup.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `admin` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-a, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: Role dan Hak Akses; Fitur per Role (Admin); Risiko dan Mitigasi (baris Admin tampil sebagai user biasa).
4. `backend/src/modules/admin/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`admin_audit_log`).
6. `frontend/src/modules/admin/README.md` dan halaman placeholder di `frontend/src/app/`.
7. `backend/src/core/auth.ts` (hook audit) dan `backend/src/core/roles.ts` (`evaluateAccess`)
8. `backend/tests/access.test.ts`

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Dasbor ringkasan dan audit log tindakan admin. Layar persetujuan lain tinggal di modul pemiliknya, jadi modul ini kecil.

## Spesifikasi dari proposal

- Admin punya akses ke semua fitur dan bisa melewati batasan role, tetapi tidak punya label atau badge. Pengguna lain melihatnya sebagai user biasa.
- Karena itu semua tindakan admin pada endpoint berrole dicatat di `admin_audit_log` (hook di `core/auth.ts`, sudah ada). Modul ini hanya menampilkannya.
- Dasbor: jumlah pengajuan role menunggu, lapangan menunggu persetujuan, laporan konten terbuka, tanda anti-cheat terbuka. Ambil lewat fungsi `count...` yang diekspor modul pemiliknya, atau query count read-only. Jangan menyalin logikanya.
- Audit log: daftar dengan paginasi, filter admin dan rentang tanggal. Hanya baca.
- Pengaturan biaya layanan ada di modul `payments`, bukan di sini.

## Yang harus dikerjakan

### Database
Tabel `admin_audit_log` sudah ada. Tambahkan index bila filter butuh (migrasi baru).

### Backend
- `GET /overview` dan `GET /audit-log` (cursor pagination).
- Tambahkan test integrasi kecil untuk hook audit: panggil endpoint admin dengan Supabase client tiruan dan pastikan satu baris audit tertulis, dan tidak ada untuk user biasa atau GET.
- Tulis `docs/admin-bootstrap.md`: cara menunjuk admin pertama lewat SQL di Supabase (admin ditunjuk internal, tidak ada endpoint untuk itu).

### Frontend
- `/admin` (dasbor dengan tautan ke layar di modul lain) dan `/admin/audit`.
- Guard halaman: bila bukan admin, arahkan keluar. Ini hanya soal tampilan, keamanan tetap di backend.

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- Tidak ada untuk modul lain.

Yang kamu pakai dari modul lain:
- Fungsi hitung dari role-requests, venues, community, level (dev-a, dev-b, dev-d). Sampai tersedia, tampilkan 0 dan beri `TODO(integration)`.

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Berapa lama audit log disimpan (belum diputuskan).

## Di luar tugas ini

- Menambah label admin di UI publik.
- Layar persetujuan, biaya, moderasi, anti-cheat (milik modul lain).
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Hook audit menulis baris untuk aksi admin non-GET berrole.
- Tidak menulis untuk GET, user biasa, atau respons error.
- Paginasi audit log.

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

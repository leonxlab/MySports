# Prompt: equipment

| | |
| --- | --- |
| Modul | `equipment`: Sewa alat |
| Pemilik | dev-b (Open play end-to-end) |
| Layer | backend + frontend |
| Fase | 4 |
| Bobot | 1 |
| Bergantung pada | accounts, payments |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **Medium** |
| Branch disarankan | `feat/equipment-minimal-rental` |

Alasan effort: Kecil dan banyak keputusan menggantung. Effort medium cukup.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `equipment` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-b, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: Fitur per Role (User dan Coach: Sewa alat); Pertanyaan Terbuka (keputusan 11); Roadmap Pengembangan (Fase 4).
4. `backend/src/modules/equipment/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`equipment_items`, `equipment_rentals`).
6. `frontend/src/modules/equipment/README.md` dan halaman placeholder di `frontend/src/app/`.
7. README modul `payments` (target `equipment_rental`)

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Sewa alat dari Coach atau user terdekat. Di proposal statusnya "dipikirkan nanti" dan masuk Fase 4, jadi jangan dikerjakan sebelum gate Fase 3 terpenuhi kecuali diminta. Lingkup sengaja kecil.

## Spesifikasi dari proposal

- User: rekomendasi alat dari Coach atau user yang menyewakan, berdasarkan jarak sesuai lapangan.
- Coach: sewa raket atau alat dari Coach lain atau dari lapangan. Rekomendasi diarahkan ke alat milik Coach lebih dulu.
- Pembayaran lewat modul payments dengan target `equipment_rental`.
- Seluruh detail (deposit, ketersediaan per tanggal, pengambilan dan pengembalian, kerusakan) belum diputuskan.

## Yang harus dikerjakan

### Database
Tabel `equipment_items` dan `equipment_rentals` sudah ada.

### Backend
- Implementasi minimal: daftarkan alat, ubah, cari terdekat (urutkan alat milik Coach lebih dulu), detail, sewa (membuat checkout), `onPaid('equipment_rental')` mengonfirmasi sewa.
- Jangan menambah aturan yang tidak ada di proposal (deposit, denda).

### Frontend
- `/equipment`, `/equipment/[id]`, `/equipment/mine` dengan fitur minimal di atas.

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- Tidak ada.

Yang kamu pakai dari modul lain:
- `createPaymentsApi(ctx).createCheckout`, `onPaid` (dev-b)
- `createVenuesApi(ctx).getCourt` untuk titik acuan jarak

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Semua kebijakan sewa: deposit, durasi, pengembalian, kerusakan, ketersediaan (TODO(decision) untuk tiap poin).

## Di luar tugas ini

- Apa pun di luar daftar minimal di atas.
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Urutan rekomendasi: alat Coach lebih dulu, lalu jarak.
- Sewa menjadi confirmed hanya setelah paid.
- Pemilik tidak bisa menyewa alatnya sendiri.

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

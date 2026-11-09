# Prompt: venues

| | |
| --- | --- |
| Modul | `venues`: Lapangan |
| Pemilik | dev-b (Open play end-to-end) |
| Layer | backend + frontend |
| Fase | 1 |
| Bobot | 2 |
| Bergantung pada | accounts, role-requests |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **Medium** |
| Branch disarankan | `feat/venues-registration-and-search` |

Alasan effort: CRUD ditambah satu fungsi geospasial dan constraint. Effort medium.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `venues` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-b, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: Role dan Hak Akses; Fitur per Role (Owner Lapangan, Admin, User); Arsitektur (Kelompok API: Lapangan).
4. `backend/src/modules/venues/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`venues`, `courts`, `court_slots`).
6. `frontend/src/modules/venues/README.md` dan halaman placeholder di `frontend/src/app/`.
7. `supabase/migrations/20261108000300_venues.sql` (PostGIS dan `geography(point)`)

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Pendaftaran lapangan oleh Owner Lapangan, persetujuan Admin, pengaturan jadwal dan harga, serta pencarian berdasarkan jarak.

## Spesifikasi dari proposal

- Owner Lapangan mengupdate ketersediaan (jadwal kosong atau terpakai) dan harga lapangan. Lapangan harus disetujui Admin sebelum tampil.
- Pencarian berdasarkan jarak dari lokasi user (lat, lng, radius) dan cabang. Jarak dihitung di database dengan PostGIS (`ST_DWithin`, `ST_Distance`), hasil terurut dari yang terdekat, jarak dalam meter.
- Hanya lapangan berstatus approved yang muncul di pencarian publik. Owner melihat lapangan miliknya apa pun statusnya.
- Satu venue punya banyak court, tiap court punya cabang dan harga per jam. Slot (`court_slots`) berstatus free, booked, atau blocked. Status booked diubah oleh modul payments saat booking dibayar, lewat fungsi yang diekspor modul ini.
- Harga bertipe `numeric`. Supabase mengembalikannya sebagai string, tangani di service dan jangan memakai float untuk hitungan uang.

## Yang harus dikerjakan

### Database
Tabel `venues`, `courts`, `court_slots` sudah ada. Buat migrasi BARU untuk fungsi SQL `search_venues(lat, lng, radius_m, sport)` dan untuk batasan slot tidak tumpang tindih (exclusion constraint dengan `tstzrange`, butuh extension `btree_gist`).

### Backend
- `schema.ts`: lokasi (lat/lng valid), jam slot (akhir > awal), harga >= 0.
- `service.ts`: daftar/pencarian, detail, buat venue (status pending), ubah, tambah court, `setAvailability` (upsert massal), `setPrice`, daftar pending, approve, reject.
- Ekspor untuk modul lain: `getCourt(courtId)` (termasuk lokasi venue), `markSlotBooked(courtId, startsAt, endsAt)`, `releaseSlot(...)`, `countPending()`.
- Kepemilikan: owner hanya boleh mengubah venue miliknya (cek di service, jangan hanya mengandalkan role).

### Frontend
- `/venues` (pencarian dengan geolokasi, daftar terurut jarak), `/venues/[id]` (court, harga, ketersediaan).
- `/owner/venues`, `/owner/venues/new`, `/owner/venues/[id]/schedule` (editor jadwal dan harga).
- `/admin/approvals/venues`.
- Peta belum dipilih. Cukup daftar. Jangan menambah library peta tanpa kesepakatan.

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- `createVenuesApi(ctx)`: `getCourt`, `markSlotBooked`, `releaseSlot`, `countPending`, pencarian dasar untuk feed

Yang kamu pakai dari modul lain:
- `createAccountsApi` (nama owner), `createRoleRequestsApi` tidak langsung (role dicek lewat core)

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Radius pencarian bawaan dan batas maksimum belum ditentukan, pakai konstanta dan tandai.
- Aturan pembatalan booking dan pelepasan slot (belum ada).

## Di luar tugas ini

- Proses pembayaran (payments).
- Pembuatan open play (open-play).
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Validasi slot (akhir > awal, tidak tumpang tindih).
- Venue pending tidak muncul di pencarian publik, muncul untuk owner.
- Owner lain tidak bisa mengubah venue yang bukan miliknya.
- Pencarian jarak: dokumentasikan cara menguji fungsi SQL di Supabase lokal (`supabase db reset`) dan lampirkan hasil query contoh di PR.

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

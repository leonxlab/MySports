# Prompt: open-play

| | |
| --- | --- |
| Modul | `open-play`: Open play dan slot |
| Pemilik | dev-b (Open play end-to-end) |
| Layer | backend + frontend |
| Fase | 1 |
| Bobot | 2 |
| Bergantung pada | accounts, venues, payments |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **High** |
| Branch disarankan | `feat/open-play-slots-and-join` |

Alasan effort: Ada konkurensi dan ketergantungan ke pembayaran. Perlu berpikir hati-hati tentang urutan kejadian. Effort high.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `open-play` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-b, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: Fitur per Role (User, Coach); Pembayaran dan Biaya Layanan; Setting Match dan Control Menu (Setting slot); Arsitektur (Kelompok API: Open play dan slot).
4. `backend/src/modules/open-play/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`open_plays`, `open_play_participants`).
6. `frontend/src/modules/open-play/README.md` dan halaman placeholder di `frontend/src/app/`.
7. README modul `payments` dan `venues`
8. `supabase/migrations/20261108000500_open_play.sql`

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Coach membuat open play dan slot, user mencari berdasarkan jarak, join, dan membayar. Coach mencari member. Bagian paling sensitif: kuota dan pembayaran tidak boleh balapan.

## Spesifikasi dari proposal

- Coach: booking lapangan, cari member, setting slot (kuota peserta maksimal, jam, harga per slot, status terbuka atau penuh).
- User: cari open play berdasarkan jarak dari lokasi, join dengan mendaftar dan membayar untuk mengamankan slot.
- Hanya pemain yang sudah join dan membayar yang masuk bracket. Peserta `confirmed` hanya muncul setelah pembayaran lunas (dikonfirmasi lewat callback payments, bukan klien).
- Kuota tidak boleh terlampaui walau banyak user join bersamaan. Gunakan fungsi SQL atau transaksi dengan penguncian baris untuk memeriksa kuota dan membuat baris peserta secara atomik.
- Status otomatis menjadi `full` saat peserta confirmed mencapai kuota, dan kembali `open` bila ada yang batal.
- Cari member (Coach): daftar pemain dengan informasi lengkap (nama, umur, pengalaman main, Level, foto/video/quotes) lewat modul accounts dan level.
- Bergantung pada payments: join membuat checkout dengan target `open_play`. Gunakan registri `onPaid` di payments supaya tidak ada impor melingkar.

## Yang harus dikerjakan

### Database
Tabel `open_plays` dan `open_play_participants` sudah ada. Migrasi BARU: fungsi `join_open_play(open_play_id, user_id)` atomik, fungsi pencarian dengan jarak (lewat `courts` dan `venues.location`), dan kolom `hold_expires_at` bila memakai penahanan slot.

### Backend
- `schema.ts`, `service.ts`: `searchOpenPlays`, `getOpenPlay`, `createOpenPlay` (court harus milik booking Coach atau lapangan approved), `updateSlot` (kuota tidak boleh di bawah peserta confirmed), `joinOpenPlay`, `leaveOpenPlay`, `listParticipants`, `searchMembers`, `getMemberInfo`.
- Daftarkan handler `payments.onPaid('open_play', ...)` yang mengubah peserta menjadi `confirmed`.
- Ekspor: `listConfirmedParticipants(openPlayId)` (untuk bracket), `getOpenPlay(id)`, `listNearby(filters)` (untuk feed), `confirmParticipant`.

### Frontend
- `/open-play` (cari, filter, jarak), `/open-play/[id]` (detail, tombol join yang mengarah ke checkout).
- `/coach/open-play/new`, `/coach/open-play/[id]` (kelola slot dan peserta), `/coach/members` (cari member).

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- `createOpenPlayApi(ctx)`: `listConfirmedParticipants`, `getOpenPlay`, `listNearby` (bracket, feed, match)

Yang kamu pakai dari modul lain:
- `createPaymentsApi(ctx)`: `createCheckout`, `onPaid` (dev-b, modul sendiri)
- `createVenuesApi`: `getCourt`
- `createAccountsApi`: `getProfileSummaries`, `createLevelApi`: `getLevelSummary` (dev-a, dev-d)

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Berapa lama slot ditahan menunggu pembayaran sebelum dilepas (TODO(decision), usul awal 15 menit sebagai konstanta).
- Kebijakan pembatalan dan pengembalian dana (belum ada).

## Di luar tugas ini

- Pembuatan bracket (bracket).
- Perhitungan biaya (payments).
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Balapan kuota: N join bersamaan untuk kuota K menghasilkan tepat K peserta (uji fungsi atau simulasi dengan transaksi).
- Peserta menjadi confirmed hanya setelah callback paid.
- Update kuota di bawah jumlah confirmed ditolak.
- Penahanan slot kedaluwarsa melepas kuota.

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

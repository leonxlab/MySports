# Prompt: payments

| | |
| --- | --- |
| Modul | `payments`: Booking dan pembayaran |
| Pemilik | dev-b (Open play end-to-end) |
| Layer | backend + frontend |
| Fase | 1 |
| Bobot | 3 |
| Bergantung pada | accounts |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **High** |
| Branch disarankan | `feat/payments-gateway-and-fees` |

Alasan effort: Menyangkut uang, keamanan, dan konsistensi data. Salah di sini mahal. Effort high.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `payments` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-b, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: Pembayaran dan Biaya Layanan; Fitur per Role (Admin: Atur biaya layanan); Risiko dan Mitigasi (baris Dana pemain ditampung lalu diteruskan); Pertanyaan Terbuka (keputusan 3).
4. `backend/src/modules/payments/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`payments`, `wallets`, `wallet_entries`, `withdrawals`, `fee_settings`, `court_bookings`).
6. `frontend/src/modules/payments/README.md` dan halaman placeholder di `frontend/src/app/`.
7. `supabase/migrations/20261108000400_payments.sql`
8. README modul `open-play` dan `venues`

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Semua uang masuk ke aplikasi lewat payment gateway, diteruskan ke Coach atau Owner setelah dipotong biaya layanan, lalu bisa ditarik. Model dan persentase biaya diatur Admin. Gateway belum dipilih, jadi bangun di atas antarmuka.

## Spesifikasi dari proposal

- Langkah: (1) user bayar open play, sewa lapangan, atau nanti sewa alat; (2) aplikasi menampung dana lewat payment gateway; (3) setelah transaksi selesai dana diteruskan ke Coach atau Owner Lapangan dikurangi biaya layanan; (4) penerima menarik saldo (withdraw).
- Dua model biaya layanan, dipilih Admin: `withdraw_percent` (aplikasi memotong persen dari jumlah yang ditarik) dan `payer_fee` (fee ditambahkan ke harga yang dibayar user). Persentase juga diatur Admin dan tersimpan di tabel `fee_settings` (satu baris). Model bisa diganti tanpa mengubah aplikasi.
- Payment gateway biasanya memotong biayanya sendiri. Perhitungan fee harus memasukkan itu.
- Uang: jangan pernah `float`. Pakai bilangan bulat satuan terkecil mata uang (rupiah) atau library desimal, dan satu fungsi pembulatan yang jelas. Di database `numeric`.
- Jumlah yang ditagih selalu dihitung server dari harga target (open play, booking), tidak pernah diambil dari klien.
- Webhook gateway: verifikasi signature, idempoten (`gateway_ref` unik), dan satu-satunya sumber kebenaran status bayar. Jangan percaya redirect dari klien.
- Status: `pending` → `paid` → `settled`, atau `failed`, `refunded`. Buat state machine eksplisit, transisi ilegal ditolak.
- Saldo dicatat di buku besar `wallet_entries` yang hanya ditambah, dan `wallets.balance` selalu cocok dengan jumlah ledger (ubah dalam satu transaksi).
- Gunakan payment gateway berlisensi dan periksa aspek hukumnya sebelum peluncuran (risiko tertulis di proposal).

## Yang harus dikerjakan

### Database
Tabel `payments`, `wallets`, `wallet_entries`, `withdrawals`, `fee_settings`, `court_bookings` sudah ada. Migrasi BARU untuk fungsi SQL atomik penambahan ledger+saldo dan constraint tambahan yang Anda perlukan.

### Backend
- `gateway.ts`: antarmuka `PaymentGateway` (`createCharge`, `verifyWebhook`, `parseEvent`) dan `FakeGateway` untuk dev dan test. Pilihan `PAYMENT_PROVIDER` dari env. Penyedia sungguhan belum dipilih, jangan menebak.
- `fees.ts`: `computeFees(model, percent, amount, gatewayFee)` fungsi murni dengan test tabel untuk kedua model dan pembulatan.
- `state.ts`: transisi status pembayaran.
- `service.ts`: `createCheckout` (target `open_play|court_booking|equipment_rental`, kunci idempotensi), `handleWebhook`, `createCourtBooking` (memanggil `venues.markSlotBooked` saat paid), `settle`, wallet, withdrawal (penyedia payout juga lewat antarmuka, belum dipilih), `getFeeSettings`, `updateFeeSettings` (hanya admin).
- Registri `onPaid(targetType, handler)` untuk modul lain (open-play, equipment).
- `routes.ts`: untuk `POST /webhook/:provider` jangan memakai preHandler login, tetapi verifikasi signature di dalam handler. Pastikan body mentah tersedia bila gateway membutuhkannya.

### Frontend
- `/checkout/[id]`, `/bookings`, `/wallet`, `/wallet/withdraw`.
- `/admin/fees`: pilih model, atur persen, tampilkan contoh hitungan sebelum disimpan.
- Alur redirect ke halaman gateway hanya sebagai tampilan. Status akhir selalu dibaca dari backend.

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- `createPaymentsApi(ctx)`: `createCheckout`, `onPaid`, `settle`, `getFeeSettings`

Yang kamu pakai dari modul lain:
- `createVenuesApi`: `markSlotBooked`, `getCourt`
- `createOpenPlayApi`: handler `onPaid` didaftarkan oleh open-play

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Penyedia gateway dan metode payout (TODO(decision)). Tulis memo `docs/decisions/payment-gateway.md`: opsi, biaya, syarat lisensi, rekomendasi. Memo hanya rekomendasi, keputusan di tangan tim.
- Kapan tepatnya 'transaksi selesai' memicu settlement (setelah open play selesai? setelah booking dipakai?). Pakai asumsi tertulis dan tandai.
- Kebijakan refund.

## Di luar tugas ini

- Integrasi gateway sungguhan sebelum diputuskan.
- Langganan VIP.
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Tabel kasus biaya: kedua model, persen 0, persen tidak bulat, dengan dan tanpa fee gateway.
- State machine: transisi legal dan ilegal.
- Webhook dua kali tidak menggandakan kredit saldo.
- Signature salah ditolak.
- Saldo = jumlah ledger setelah serangkaian transaksi.
- Jumlah tagihan tidak bisa dipengaruhi klien.

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

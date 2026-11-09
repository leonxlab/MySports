# Modul payments: Booking dan pembayaran

Semua uang masuk ke aplikasi lewat payment gateway, diteruskan ke Coach/Owner dikurangi biaya layanan, lalu bisa ditarik (withdraw). Model dan persen biaya diatur Admin. Gateway belum dipilih.

| | |
| --- | --- |
| Pemilik | dev-b (Open play end-to-end) |
| Fase | 1 |
| Prefix API | `/api/v1/payments` |
| Bergantung pada | accounts, venues (`markSlotBooked`, `getCourt`) |
| Tabel | `payments`, `wallets`, `wallet_entries`, `withdrawals`, `fee_settings`, `court_bookings` |

## Keputusan desain

- `court_bookings` hanya catatan transaksi sewa lapangan. Ketersediaan lapangan satu sumber, yaitu `court_slots` di modul venues; payments mengubahnya hanya lewat `venues.markSlotBooked` / `releaseSlot`.
- Ada dua aliran uang: sewa lapangan (Coach membayar Owner Lapangan) dan open play (peserta membayar Coach). Coach wajib punya booking `confirmed` sebelum membuat open play.
- Uang selalu bilangan bulat rupiah di kode (`fees.ts`), `numeric` di database. Pembulatan setengah ke atas hanya di `percentOf`.
- Biaya gateway: `TODO(decision)` siapa yang menanggung. Asumsi sementara aplikasi menanggung.
- Refund: `TODO(decision)`. Asumsi sementara hanya dari status `paid`.

## Endpoint

Berjalan: checkout (open play), webhook, wallet, withdraw, fee-settings. Masih `501`: `POST /bookings` dan `GET /bookings/mine` (menunggu modul venues di-merge, `TODO(integration)`), serta checkout untuk `court_booking` dan `equipment_rental`. Withdraw baru mencatat permintaan (`requested`), tanpa payout ke rekening (`TODO(decision)`).

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| POST | `/checkout` | Buat pembayaran untuk open play, sewa lapangan, atau sewa alat | login |
| POST | `/webhook/:provider` | Callback gateway (verifikasi signature, idempotent) | publik |
| POST | `/bookings` | Sewa lapangan | login |
| GET | `/bookings/mine` | Booking milik sendiri | login |
| GET | `/wallet` | Saldo | login |
| GET | `/wallet/entries` | Riwayat saldo | login |
| POST | `/withdrawals` | Tarik saldo | login |
| GET | `/withdrawals` | Riwayat penarikan | login |
| GET | `/fee-settings` | Model dan persen biaya layanan | admin |
| PUT | `/fee-settings` | Ubah model (potongan saat withdraw / fee ke pembayar) dan persen | admin |

## Checklist

- [x] Migrasi: `20261109000200_payments_atomic.sql` (`payments_settle`, `wallet_withdraw`). Belum dijalankan dengan `supabase db reset` (Docker tidak ada di sesi ini)
- [x] `schema.ts` untuk input
- [x] Kerangka: `fees.ts`, `state.ts`, `gateway.ts` (FakeGateway), `createPaymentsApi` dengan `onPaid`, semuanya dengan test
- [x] `service.ts` (checkout, webhook, settle, wallet, withdraw, fee settings) dan test dengan Supabase tiruan di memori
- [ ] Booking lapangan (butuh venues)
- [ ] `routes.ts`: tersisa `todo` untuk `/bookings` dan `/bookings/mine`
- [ ] Frontend: `frontend/src/modules/payments`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

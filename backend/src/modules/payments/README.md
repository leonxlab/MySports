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

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

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

- [ ] Migrasi: `supabase/migrations/*_payments.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [x] Kerangka: `fees.ts`, `state.ts`, `gateway.ts` (FakeGateway), `createPaymentsApi` dengan `onPaid`, semuanya dengan test
- [ ] `service.ts` penuh (checkout, webhook, settle, wallet, withdraw) dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/payments`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

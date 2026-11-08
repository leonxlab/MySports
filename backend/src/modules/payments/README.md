# Modul payments: Booking dan pembayaran

Semua uang masuk ke aplikasi lewat payment gateway, diteruskan ke Coach/Owner dikurangi biaya layanan, lalu bisa ditarik (withdraw). Model dan persen biaya diatur Admin. Gateway belum dipilih.

| | |
| --- | --- |
| Pemilik | dev-a (platform) |
| Fase | 1 |
| Prefix API | `/api/v1/payments` |
| Bergantung pada | accounts |
| Tabel | `payments`, `wallets`, `wallet_entries`, `withdrawals`, `fee_settings`, `court_bookings` |

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
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/payments`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

# Modul payments: Booking dan pembayaran

Semua uang masuk ke aplikasi lewat payment gateway, diteruskan ke Coach/Owner dikurangi biaya layanan, lalu bisa ditarik (withdraw). Model dan persen biaya diatur Admin. Gateway: **LxPay** (QRIS LeonXLab, https://leonxlab.app/docs/lxpay) - keputusan lengkap di `docs/decisions/payment-gateway.md`.

| | |
| --- | --- |
| Pemilik | dev-b (Open play end-to-end) |
| Fase | 1 |
| Prefix API | `/api/v1/payments` |
| Bergantung pada | accounts, venues (`markSlotBooked`, `getCourt`) |
| Tabel | `payments`, `wallets`, `wallet_entries`, `withdrawals`, `fee_settings`, `court_bookings` |

## Keputusan desain

- `court_bookings` hanya catatan transaksi sewa lapangan. Ketersediaan lapangan satu sumber, yaitu `court_slots` di modul venues; payments mengubahnya hanya lewat `venues.markSlotBooked` / `releaseSlot` / `releaseRange`.
- Ada dua aliran uang: sewa lapangan (Coach membayar Owner Lapangan) dan open play (peserta membayar Coach). Coach wajib punya booking `confirmed` sebelum membuat open play.
- Uang selalu bilangan bulat rupiah di kode (`fees.ts`), `numeric` di database. Pembulatan setengah ke atas hanya di `percentOf`.
- Gateway **LxPay**: QRIS dinamis; pembayar membayar `amountWithCode` = tagihan + kode unik 3-4 digit. Webhook `transaction.paid` diverifikasi lewat header `X-Lxpay-Signature` (`sha256(secret + "." + body)`, perbandingan constant-time) dan idempoten. Cadangan bila webhook tidak sampai: backend poll `GET /transactions/:reference` saat pembayaran masih `pending`. Fee merchant LxPay di-set feeMode=platform di dashboard (biaya ditanggung aplikasi).
- Instruksi bayar (payload QRIS, `amountWithCode`, `expiresAt`) disimpan di `payments.qris_payload`, `qris_amount_with_code`, dan `qris_expires_at`, lalu ikut respons checkout serta `GET /:id` supaya QR bisa ditampilkan ulang tanpa transaksi baru. QR kedaluwarsa: tagihan ditandai `failed`, slot dilepas, tagihan baru dibuat saat checkout ulang.
- Env: `PAYMENT_PROVIDER=lxpay`, `LXPAY_API_KEY`, `LXPAY_WEBHOOK_SECRET`, `LXPAY_BASE_URL` (lihat `.env.example`). Webhook URL di dashboard LxPay: `<backend>/api/v1/payments/webhook/lxpay`. Dev/test tetap `PAYMENT_PROVIDER=fake` (`FakeGateway`).
- Biaya gateway: diasumsikan aplikasi menanggung (lihat ADR).
- Refund: `TODO(decision)`. Asumsi sementara hanya dari status `paid`.

## Endpoint

Berjalan: checkout (open play dan sewa lapangan), booking, webhook (`/webhook/fake` dan `/webhook/lxpay`), wallet, withdraw, fee-settings. Masih `501`: checkout `equipment_rental` (Fase 4). Withdraw baru mencatat permintaan (`requested`), payout ke rekening diproses manual Admin (`TODO(decision)`).

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
| GET | `/fee-preview` | Contoh hitungan biaya sebelum disimpan (query: model, percent, amount) | admin |
| GET | `/:id` | Status satu pembayaran milik sendiri (pending dicek ulang ke gateway) | login |

## Checklist

- [x] Migrasi: `20261109000200_payments_atomic.sql` (`payments_settle`, `wallet_withdraw`) dan `20261122120000_payments_lxpay.sql` (`qris_payload`, `qris_amount_with_code`, `qris_expires_at`). Belum dijalankan dengan `supabase db reset` (Docker tidak ada di sesi ini)
- [x] `schema.ts` untuk input
- [x] Kerangka: `fees.ts`, `state.ts`, `gateway.ts` (`FakeGateway` + `LxPayGateway`), `createPaymentsApi` dengan `onPaid`, semuanya dengan test
- [x] `service.ts` (checkout, webhook, poll status gateway, settle, wallet, withdraw, fee settings) dan test dengan Supabase tiruan di memori
- [x] Booking lapangan: slot ditahan atomik saat booking dibuat (`venues.markSlotBooked`), dilepas bila pembayaran gagal atau QR kedaluwarsa. `TODO(decision)`: batas waktu tahan slot yang tidak dibayar
- [x] `routes.ts`
- [x] Frontend: `frontend/src/modules/payments` (checkout QRIS, booking, wallet, withdraw, admin fee)
- [x] README ini diperbarui, status di `MODULES.md` diubah
- [ ] Uji sandbox LxPay dengan merchant sungguhan (butuh pendaftaran merchant di dashboard)

# Keputusan: Payment Gateway (ADR)

Status: **diputuskan** (2026-11-22) - gateway = **LxPay** (QRIS, milik LeonXLab).
Dokumentasi API: https://leonxlab.app/docs/lxpay. Implementasi: `backend/src/modules/payments/gateway.ts` (`LxPayGateway`), dipilih lewat `PAYMENT_PROVIDER=lxpay`.

## Keputusan

- Penyedia: **LxPay** - QRIS dinamis. Satu akun QRIS melayani banyak transaksi lewat *unique code* (3-4 digit) yang ditambahkan ke nominal; pembayar membayar `amountWithCode`, bukan tagihan polos.
- Metode aktif: **QRIS**. Alur: buat transaksi `POST /transactions` (reference = paymentId, idempoten) - tampilkan QR - webhook `transaction.paid` memverifikasi `X-Lxpay-Signature` (`sha256(secret + "." + body)`, constant-time) - status berubah di backend. Cadangan bila webhook tidak sampai: backend mem-poll `GET /transactions/:reference` saat pembayaran masih `pending` (dipanggil dari GET `/payments/:id` dan checkout ulang).
- Fee: aplikasi memakai model sendiri (`fee_settings`, diatur Admin di `/admin/fees`). Fee merchant LxPay di-set **feeMode=platform** di dashboard merchant supaya tidak menambah beban pembayar; biaya LxPay ditanggung aplikasi (asumsi lama tetap berlaku).
- Payout: saldo Coach/Owner tetap di wallet internal aplikasi (`wallets`), ditarik lewat `POST /payments/withdrawals` (status `requested`, diproses manual Admin). Endpoint `/withdrawals` milik LxPay hanya untuk saldo merchant aplikasi, bukan per pengguna.
- Refund: masih `TODO(decision)` - tidak berubah dari rencana lama.
- Webhook secret: `LXPAY_WEBHOOK_SECRET`. Webhook URL di dashboard merchant: `https://<backend>/api/v1/payments/webhook/lxpay`.

## Env

| Variabel | Isi |
| --- | --- |
| `PAYMENT_PROVIDER` | `lxpay` (produksi) atau `fake` (dev/test) |
| `LXPAY_API_KEY` | API key merchant (`xpk_live_...`), ditampilkan sekali saat pendaftaran |
| `LXPAY_WEBHOOK_SECRET` | secret webhook dari dashboard merchant |
| `LXPAY_BASE_URL` | default `https://leonxlab.app` |

## Catatan teknis

- Batas nominal LxPay Rp500 - Rp10.000.000; transaksi PENDING kedaluwarsa dalam 60 menit. Setelah itu tagihan ditandai `failed` (dari poll atau checkout ulang), slot lapangan dilepas, dan pembayar bisa menagih ulang (tagihan baru dengan reference baru).
- Instruksi bayar (payload QRIS, `amountWithCode`, `expiresAt`) disimpan di kolom `payments.qris_payload` / `qris_expires_at` (migrasi `20261122120000_payments_lxpay.sql`) supaya halaman `/checkout/[id]` bisa menampilkan ulang QR tanpa transaksi baru.
- `FakeGateway` tetap dipakai di dev/test (`PAYMENT_PROVIDER=fake`); verifikasi signature-nya tidak berubah.
- Uji sandbox LxPay dengan merchant sungguhan masih menggantung (butuh pendaftaran merchant).

# Keputusan: Payment Gateway (ADR)

Status: **belum diputuskan** — `PAYMENT_PROVIDER` masih `undecided` di `backend/.env.example` dan `backend/app.json`. Kode di `backend/src/modules/payments/` disiapkan agar gateway bisa ditukar tanpa mengubah pemanggil (`createCheckout`, `onPaid`, `settle`, `getFeeSettings`).

## Pertanyaan yang harus dijawab sebelum produksi

| No | Pertanyaan | Dampak kalau belum |
| --- | --- | --- |
| 1 | Penyedia gateway lokal mana (mis. Midtrans, Xendit, QRIS statis/dinamis, transfer manual)? | Checkout open play berbayar dan sewa alat tidak bisa jalan; modul payments tetap stub |
| 2 | Siapa target payout (owner lapangan / coach penyewa alat) dan lewat jalur apa? | Uang tidak bisa diteruskan; settle() tidak punya implementasi nyata |
| 3 | Fee admin: persentase saat withdraw atau dibebankan ke pembayar? (proposal keputusan #3 — besaran diatur Admin lewat panel) | `getFeeSettings()` punya nilai default tapi tidak terverifikasi bisnis |
| 4 | Kebijakan refund dan kapan payment dianggap hangus (`pending_payment` kedaluwarsa)? | Slot bisa terkunci permanen atau terlepas terlalu cepat |
| 5 | Timing settle: saat webhook `paid` masuk atau batch berkala? | Konsistensi saldo vs latensi konfirmasi |

## Dampak deploy

Main app (Supabase + Heroku + Vercel) bisa dideploy tanpa keputusan ini karena alur gratis (join open play gratis, statistik, feed) tidak menyentuh payments. Alur berbayar dibiarkan mati sampai keputusan jatuh, lalu isi kolom di bawah dan catat di docs/CHANGELOG.md.

## Template keputusan (isi nanti)

- Penyedia: ...
- Metode aktif: ...
- Fee: ...
- Payout: ...
- Refund: ...
- Webhook secret: `PAYMENT_WEBHOOK_SECRET` di-set saat itu juga.

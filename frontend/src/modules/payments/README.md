# Frontend modul payments

Backend: `backend/src/modules/payments/README.md`. Hanya tampilan, tanpa aturan bisnis.

Halaman:

- `/checkout/[id]`: Pembayaran. Saat masih pending dan tagihan punya QRIS (gateway LxPay), QR dirender di sini (pustaka `qrcode`) beserta nominal `amountWithCode` yang harus dibayar tepat (tagihan + kode unik 3-4 digit). Status ditanyakan ulang tiap 3 detik.
- `/bookings`: Booking saya
- `/wallet`: Saldo
- `/wallet/withdraw`: Tarik saldo
- `/admin/fees`: Biaya layanan (admin)

Komponen open play (`OpenPlayDetail`) dan sewa lapangan (`VenueDetail`) mengarahkan pembayar ke halaman `/checkout/[id]` karena instruksi QR ada di sana.

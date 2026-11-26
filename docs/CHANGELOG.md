# Perubahan

## 2026-11-22 — Gateway pembayaran LxPay (QRIS) + rampungkan modul payments

- Gateway ditetapkan: **LxPay** (QRIS LeonXLab, https://leonxlab.app/docs/lxpay) lewat `PAYMENT_PROVIDER=lxpay`. ADR `docs/decisions/payment-gateway.md` kini berstatus diputuskan.
- Backend baru: `LxPayGateway` (`backend/src/modules/payments/gateway.ts`) — buat transaksi QRIS (reference = paymentId, idempoten), verifikasi webhook `X-Lxpay-Signature` (sha256, constant-time), dan poll `GET /transactions/:reference` sebagai cadangan webhook saat GET pembayaran masih pending.
- Checkout dan `GET /payments/:id` kini membawa instruksi bayar: `amountWithCode` (tagihan + kode unik 3–4 digit QRIS), `qrisPayload`, `expiresAt`; disimpan di kolom baru `payments.qris_payload` / `qris_expires_at` (migrasi `20261122120000_payments_lxpay.sql`).
- Tagihan QR kedaluwarsa otomatis ditandai gagal (dari poll atau checkout ulang), slot lapangan dilepas, lalu tagihan baru dibuat.
- Frontend: halaman `/checkout/[id]` merender QR QRIS (pustaka `qrcode`) beserta nominal persis yang harus dibayar; CTA open play dan sewa lapangan mengarah ke halaman status.
- Env baru backend: `LXPAY_API_KEY`, `LXPAY_WEBHOOK_SECRET`, `LXPAY_BASE_URL` (lihat `docs/environment.md` dan `backend/.env.example`). Dev/test tetap `PAYMENT_PROVIDER=fake`.
- Dependensi frontend: +`qrcode`, +`@types/qrcode` (dev).
- Checklist frontend payments di README modul kini tercentang; uji sandbox LxPay dengan merchant sungguhan masih menggantung.

## 2026-11-21 — OTP email via Resend (SMTP) untuk daftar & login

- Modul baru `backend/src/modules/auth-otp/`: kode OTP 6 digit dikirim lewat **SMTP Resend** (`smtp.resend.com:465`, nodemailer; user `resend`, password `RESEND_API_KEY`), pengirim `otp@id.leonxlab.com`.
- Login dengan **Google tetap jalur utama** (Supabase OAuth); OTP email hanya alur in-app di `/login/email` dan `/register/email`.
- Migrasi baru `supabase/migrations/20261120090000_auth_otp_codes.sql`: tabel `auth_otp_codes` (kode disimpan sebagai hash + pepper, tanpa policy RLS — hanya service role).
- Rate limit bertingkat: cooldown 60 detik per email, 5 kirim/email/jam, 30 kirim/IP/jam, 5 percobaan verifikasi lalu kode hangus. Verifikasi constant-time.
- Env baru backend: `RESEND_API_KEY`, `RESEND_SMTP_HOST`, `RESEND_SMTP_PORT`, `RESEND_FROM_EMAIL`, `OTP_PEPPER` (lihat `docs/environment.md`).
- Frontend: `OtpForm` dua langkah (email → kode), tautan dari halaman Google login/daftar, pertukaran sesi via `verifyOtp` magic link.
- Kode berlaku 5 menit.
- Dependensi backend: +`nodemailer`, +`@types/nodemailer` (dev).

## 2026-11-20 — Rebrand ke Peluit

- Nama aplikasi ditetapkan: **Peluit** (sebelumnya MySports / Open Play). Penyebutan "open play" sebagai nama fitur tetap.
- UI frontend (judul halaman, login, feed) dan README/proposal dirapikan ke nama baru.
- Namespace event di yolo-service berubah `openplay:` → `peluit:` (hanya memengaruhi format `event_id` baru; backend idempoten lewat `event_id` sehingga aman).
- Menyiapkan tempat branding: lihat `docs/branding.md` (logo & banner menyusul).
- Menambah `docs/environment.md`: daftar env per layanan + cara app utama dan yolo-service (host terpisah) saling terintegrasi.

## 2026-11-20 — Rapikan sisa rebrand + perkuat integrasi (hasil audit)

- Sisa rename: `docs/setup-local.md` (cd peluit-app), judul FastAPI di `yolo-service/app/main.py` dan `app/modules/jobs/metrics.py`, README bagian "masih terbuka" (nama aplikasi dikeluarkan dari daftar terbuka), `docs/work/dev-a-issues.md` baris nama aplikasi, tabel keputusan menggantung di `prompts/INTEGRATION.md`.
- Keamanan: verifikasi `x-service-key` di backend kini memakai `crypto.timingSafeEqual` (constant-time).
- Integrasi: endpoint baru `GET /healthz` di backend (butuh `x-service-key`) untuk smoke test antar host dari GPU; checklist go-live di `docs/deploy.md`.
- Dokumen baru: `docs/decisions/payment-gateway.md` (ADR gateway pembayaran, status belum diputuskan), `CONTRIBUTING.md`, catatan kontrak `calibration.schema.json` yang dijanjikan di `contracts/README.md`.
- Prompts devices/jobs/calibration kini merujuk `docs/environment.md` untuk variabel lintas host.

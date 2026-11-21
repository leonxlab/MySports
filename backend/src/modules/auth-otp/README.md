# Modul auth-otp: OTP email untuk daftar & login

Kode OTP 6 digit dikirim via **Resend** untuk dua alur: daftar (`signup`) dan masuk (`login`). Menggantikan kewajiban password: pengguna cukup email.

| | |
| --- | --- |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Fase | 1 |
| Prefix API | `/api/v1/auth-otp` |
| Bergantung pada | tidak ada |
| Tabel | `auth_otp_codes` |
| Layanan luar | Resend (`RESEND_API_KEY`) |

## Endpoint

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| POST | `/request` | Minta kode OTP dikirim ke email | publik |
| POST | `/verify` | Verifikasi kode; signup membuat akun, login memvalidasi | publik |

## Rate limit (anti-spam)

| Batas | Nilai | Error |
| --- | --- | --- |
| Cooldown antar kirim ke email sama | 60 detik | 429 `OTP_COOLDOWN` |
| Kirim per email per jam | 5 | 429 `OTP_LIMIT_EMAIL` |
| Kirim per IP per jam | 30 | 429 `OTP_LIMIT_IP` |
| Percobaan verifikasi salah per kode | 5, lalu kode hangus | 401 |

Verifikasi memakai perbandingan constant-time. Kode disimpan sebagai hash (SHA-256 dengan pepper `OTP_PEPPER`), email juga di-hash untuk penghitungan IP. Tanpa policy RLS: hanya service role yang boleh menyentuh tabel.

## Cara kerja

1. `POST /request {email, purpose}` → kode 6 digit dibuat, disimpan hash-nya, dikirim via Resend. Satu kode aktif per (email, purpose); kode lama dihapus saat permintaan baru.
2. `POST /verify {email, purpose, code}` → cek hash, kedaluwarsa (10 menit), dan batas percobaan.
   - `purpose=signup`: akun Supabase dibuat (`email_confirm: true`). Email sudah terdaftar → 409 `EMAIL_TAKEN`.
   - `purpose=login`: email harus sudah terdaftar; kegagalan membuat sesi → 500 `SESSION_FAILED`.

## Alur frontend

- Daftar: isi email → `/request` → isi kode → `/verify` → akun dibuat → login OTP.
- Masuk: isi email → `/request` → isi kode → `/verify` → frontend menukar sesi via `supabase.auth.signInWithOtp` (Supabase mengirim email sesinya sendiri) atau token dari backend.

> Catatan sesi: `/verify` login saat ini hanya memvalidasi OTP. Sesuai konvensi repo, pembuatan sesi frontend tetap lewat Supabase Auth; integrasi penuh ditandai `TODO(integration)` di service.ts.

## Checklist

- [x] Migrasi tabel `auth_otp_codes`
- [x] Env `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `OTP_PEPPER` di env.ts, .env.example, app.json
- [x] Service request/verify dengan rate limit bertingkat
- [x] Kirim email via Resend (fallback: kode ke log di dev)
- [ ] Integrasi sesi frontend penuh (magic link / token)
- [ ] Template HTML email final + domain pengirim terverifikasi di Resend

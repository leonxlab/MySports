-- modul: auth-otp — OTP email untuk daftar & login via Resend
-- Tabel menyimpan kode OTP hash, bukan teks polos. Idempoten per (email_hash, purpose).
create table auth_otp_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null, -- disimpan lowercase untuk pencocokan; tidak pernah dikirim ke klien lain
  email_hash text not null, -- sha256(email + pepper) untuk rate limit tanpa membocorkan email
  purpose text not null check (purpose in ('signup', 'login')),
  code_hash text not null, -- sha256(code + email + pepper), 6 digit angka
  attempts int not null default 0, -- percobaan verifikasi yang salah untuk id ini
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz, -- diisi saat verifikasi berhasil
  ip_hash text -- sha256(ip) untuk rate limit per klien
);

create unique index auth_otp_email_purpose_active_idx
  on auth_otp_codes (email, purpose)
  where consumed_at is null;

create index auth_otp_email_requested_idx
  on auth_otp_codes (email_hash, requested_at desc);

-- RLS: backend mengakses dengan service role key (melewati RLS), jadi tabel dikunci penuh.
alter table auth_otp_codes enable row level security;
-- Sengaja tanpa policy: hanya service role (backend dan worker) yang boleh membaca/menulis.

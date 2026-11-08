-- modul: payments
-- Uang selalu numeric dan dihitung di backend. Gateway belum dipilih (lihat proposal).
create table payments (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid not null references profiles(id),
  payee_id uuid references profiles(id),
  target_type text not null check (target_type in ('open_play', 'court_booking', 'equipment_rental')),
  target_id uuid not null,
  amount numeric(14,2) not null check (amount >= 0),
  fee_amount numeric(14,2) not null default 0,
  fee_model text check (fee_model in ('withdraw_percent', 'payer_fee')),
  gateway text,
  gateway_ref text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded', 'settled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table wallets (
  user_id uuid primary key references profiles(id),
  balance numeric(14,2) not null default 0 check (balance >= 0)
);

-- buku besar, hanya ditambah, tidak diubah
create table wallet_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  payment_id uuid references payments(id),
  kind text not null check (kind in ('credit', 'fee', 'withdraw', 'refund')),
  amount numeric(14,2) not null,
  created_at timestamptz not null default now()
);
create index wallet_entries_user_idx on wallet_entries (user_id, created_at desc);

create table withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  amount numeric(14,2) not null check (amount > 0),
  fee_amount numeric(14,2) not null default 0,
  status text not null default 'requested' check (status in ('requested', 'processing', 'paid', 'rejected')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- satu baris, diatur Admin: potongan persen saat withdraw atau fee dibebankan ke pembayar
create table fee_settings (
  id int primary key default 1 check (id = 1),
  model text not null default 'payer_fee' check (model in ('withdraw_percent', 'payer_fee')),
  percent numeric(5,2) not null default 0 check (percent >= 0 and percent <= 100),
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);
insert into fee_settings default values on conflict do nothing;

create table court_bookings (
  id uuid primary key default gen_random_uuid(),
  booked_by uuid not null references profiles(id),
  court_id uuid not null references courts(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  payment_id uuid references payments(id),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table payments enable row level security;
alter table wallets enable row level security;
alter table wallet_entries enable row level security;
alter table withdrawals enable row level security;
alter table fee_settings enable row level security;
alter table court_bookings enable row level security;

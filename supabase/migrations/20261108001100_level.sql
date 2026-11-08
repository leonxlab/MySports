-- modul: level
-- Hanya menit terverifikasi YOLO yang dihitung. Rumus ada di backend/src/modules/level/service.ts.
create table play_minutes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  session_id uuid references device_sessions(id) on delete set null,
  segment_id uuid not null,
  day date not null,
  verified_seconds int not null check (verified_seconds >= 0),
  mode text not null check (mode in ('open_play', 'solo')),
  created_at timestamptz not null default now(),
  unique (segment_id, user_id)
);
create index play_minutes_user_day_idx on play_minutes (user_id, day);

create table xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  day date not null,
  minutes_counted numeric(6,2) not null,
  xp int not null,
  created_at timestamptz not null default now()
);
create index xp_ledger_user_idx on xp_ledger (user_id, day);

create table anti_cheat_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  segment_id uuid,
  reason text not null,
  score numeric(4,3),
  status text not null default 'open' check (status in ('open', 'dismissed', 'confirmed')),
  reviewed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create view user_xp as
  select user_id, coalesce(sum(xp), 0)::bigint as xp, count(*) > 0 as has_verified_session
    from xp_ledger
   group by user_id;

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table play_minutes enable row level security;
alter table xp_ledger enable row level security;
alter table anti_cheat_flags enable row level security;

-- View memakai hak peminta, jadi RLS tabel xp_ledger tetap berlaku (anon tidak bisa baca lewat PostgREST).
alter view user_xp set (security_invoker = on);

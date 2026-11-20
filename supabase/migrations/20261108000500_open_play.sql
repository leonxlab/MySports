-- modul: open-play
create table open_plays (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id),
  court_id uuid not null references courts(id),
  sport sport_type not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  quota int not null check (quota > 0),
  price numeric(12,2) not null default 0 check (price >= 0),
  status text not null default 'open' check (status in ('open', 'full', 'closed', 'finished', 'cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index open_plays_start_idx on open_plays (sport, starts_at);

create table open_play_participants (
  open_play_id uuid not null references open_plays(id) on delete cascade,
  user_id uuid not null references profiles(id),
  payment_id uuid references payments(id),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'confirmed', 'cancelled')),
  joined_at timestamptz not null default now(),
  primary key (open_play_id, user_id)
);

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table open_plays enable row level security;
alter table open_play_participants enable row level security;

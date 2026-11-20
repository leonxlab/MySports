-- modul: scoring
create table score_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  team text not null check (team in ('home', 'away')),
  points int not null default 1,
  scorer_id uuid references profiles(id),
  source text not null check (source in ('ai', 'manual')),
  -- AI masuk sebagai 'suggested', Coach yang mengonfirmasi atau mengoreksi
  status text not null default 'confirmed' check (status in ('suggested', 'confirmed', 'corrected', 'voided')),
  detail jsonb not null default '{}',
  event_key uuid unique,          -- event_id dari yolo-service (idempotensi)
  occurred_at_ms int,
  confirmed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index score_events_match_idx on score_events (match_id, created_at);

create table fouls (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references profiles(id),
  kind text,
  created_at timestamptz not null default now()
);

create table player_match_stats (
  match_id uuid not null references matches(id) on delete cascade,
  user_id uuid not null references profiles(id),
  points int not null default 0,
  stats jsonb not null default '{}',   -- misal smash, lob, tembakan 2/3 poin per cabang
  primary key (match_id, user_id)
);

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table score_events enable row level security;
alter table fouls enable row level security;
alter table player_match_stats enable row level security;

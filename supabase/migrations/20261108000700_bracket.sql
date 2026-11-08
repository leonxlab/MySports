-- modul: bracket
create table brackets (
  id uuid primary key default gen_random_uuid(),
  open_play_id uuid not null references open_plays(id) on delete cascade,
  sport sport_type not null,
  mode text not null check (mode in ('singles', 'doubles', 'team')),
  court_count int not null check (court_count > 0),
  match_minutes int not null check (match_minutes > 0),
  break_minutes int not null default 0 check (break_minutes >= 0),
  total_minutes int not null check (total_minutes > 0),
  version int not null default 1,
  generated_at timestamptz not null default now()
);

create table bracket_rounds (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references brackets(id) on delete cascade,
  round_no int not null,
  unique (bracket_id, round_no)
);

create table bracket_matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references bracket_rounds(id) on delete cascade,
  court_no int not null,
  home_players uuid[] not null,
  away_players uuid[] not null
);

create table bracket_resting (
  round_id uuid not null references bracket_rounds(id) on delete cascade,
  user_id uuid not null references profiles(id),
  primary key (round_id, user_id)
);

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table brackets enable row level security;
alter table bracket_rounds enable row level security;
alter table bracket_matches enable row level security;
alter table bracket_resting enable row level security;

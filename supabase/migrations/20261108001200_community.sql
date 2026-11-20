-- modul: community
create table threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id),
  sport sport_type not null,
  title text not null,
  body text,
  media jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index threads_sport_idx on threads (sport, created_at desc);

create table thread_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  media jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id),
  target_type text not null check (target_type in ('thread', 'post')),
  target_id uuid not null,
  reason text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table threads enable row level security;
alter table thread_posts enable row level security;
alter table content_reports enable row level security;

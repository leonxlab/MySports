-- modul: feed
create table user_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('search', 'view_open_play', 'view_thread', 'post_thread', 'join_open_play')),
  sport sport_type,
  term text,
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index user_signals_user_idx on user_signals (user_id, created_at desc);

-- klasifikasi konten otomatis: cabang, jenis, format, lokasi, rentang level
create table content_classification (
  content_type text not null,
  content_id uuid not null,
  sport sport_type,
  content_kind text not null,
  format text check (format in ('text', 'photo', 'video')),
  city text,
  level_min int,
  level_max int,
  primary key (content_type, content_id)
);

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table user_signals enable row level security;
alter table content_classification enable row level security;

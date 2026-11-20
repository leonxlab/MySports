-- modul: match
create table matches (
  id uuid primary key default gen_random_uuid(),
  bracket_match_id uuid references bracket_matches(id) on delete set null,
  created_by uuid not null references profiles(id),
  sport sport_type not null,
  -- mode, waktu, jumlah pemain, time out, hydration break, jeda, aturan skor (menimpa nilai bawaan)
  settings jsonb not null default '{}',
  status text not null default 'scheduled' check (status in ('scheduled', 'running', 'paused', 'finished', 'cancelled')),
  elapsed_seconds int not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table matches enable row level security;

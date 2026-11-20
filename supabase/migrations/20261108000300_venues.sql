-- modul: venues
create table venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  name text not null,
  address text,
  location geography(point, 4326) not null,
  status request_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index venues_location_idx on venues using gist (location);

create table courts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  sport sport_type not null,
  name text not null,
  price_per_hour numeric(12,2) not null default 0 check (price_per_hour >= 0),
  active boolean not null default true
);

create table court_slots (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references courts(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'free' check (status in ('free', 'booked', 'blocked')),
  unique (court_id, starts_at),
  check (ends_at > starts_at)
);

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table venues enable row level security;
alter table courts enable row level security;
alter table court_slots enable row level security;

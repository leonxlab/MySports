-- modul: accounts
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  age int check (age between 5 and 100),
  bio text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

create table user_roles (
  user_id uuid not null references profiles(id) on delete cascade,
  role app_role not null,
  granted_by uuid references profiles(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table profile_sport_experience (
  user_id uuid not null references profiles(id) on delete cascade,
  sport sport_type not null,
  years numeric(4,1) check (years >= 0),
  notes text,
  primary key (user_id, sport)
);

create table profile_gallery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('photo', 'video', 'quote')),
  storage_path text,
  quote_text text,
  created_at timestamptz not null default now()
);

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table profile_sport_experience enable row level security;
alter table profile_gallery enable row level security;

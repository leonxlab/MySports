-- modul: devices
create table device_sessions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete set null,
  coach_id uuid not null references profiles(id),
  pair_code text not null unique,            -- kode sesi (juga dipakai di QR)
  status text not null default 'open' check (status in ('open', 'active', 'closed')),
  calibration jsonb,                         -- titik ring/gawang/garis dari Coach
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- maksimal 3 device per sesi: camera_home, camera_away, controller
create table session_devices (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references device_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id),
  role text not null check (role in ('camera_home', 'camera_away', 'controller')),
  capability jsonb,                          -- WebGPU, FPS, hasil benchmark singkat
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz,
  unique (session_id, role)
);

-- antrean pekerjaan untuk yolo-service
create table video_segments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references device_sessions(id) on delete cascade,
  device_id uuid not null references session_devices(id) on delete cascade,
  seq int not null,
  storage_path text not null,
  size_bytes bigint check (size_bytes <= 52428800),   -- 50 MB
  status text not null default 'pending_upload'
    check (status in ('pending_upload', 'queued', 'processing', 'done', 'failed')),
  attempts int not null default 0,
  locked_by text,
  locked_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (device_id, seq)
);
create index video_segments_queue_idx on video_segments (status, created_at);

-- Worker mengambil satu pekerjaan secara atomik, dua worker tidak akan mendapat baris yang sama.
create or replace function claim_next_segment(p_worker text)
returns setof video_segments
language sql
as $$
  update video_segments
     set status = 'processing', locked_by = p_worker, locked_at = now(), attempts = attempts + 1
   where id = (
     select id from video_segments
      where status = 'queued'
      order by created_at
      limit 1
      for update skip locked
   )
  returning *;
$$;

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table device_sessions enable row level security;
alter table session_devices enable row level security;
alter table video_segments enable row level security;

-- Fungsi antrean hanya untuk service role (yolo-service). Klien tidak boleh memanggilnya lewat API.
revoke execute on function claim_next_segment(text) from public, anon, authenticated;

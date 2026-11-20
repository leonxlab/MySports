-- modul: role-requests
create table role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  requested_role app_role not null check (requested_role in ('coach', 'owner')),
  status request_status not null default 'pending',
  -- bukti: [{"type": "text|image|video|url", "value": "..."}]
  evidence jsonb not null default '[]',
  note text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index role_requests_status_idx on role_requests (status, created_at);

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table role_requests enable row level security;

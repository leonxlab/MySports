-- Keep one active application per user and requested role, including concurrent submissions.
alter table public.role_requests
  add column if not exists rejection_reason text;

create unique index if not exists role_requests_one_pending_per_role_idx
  on public.role_requests (user_id, requested_role)
  where status = 'pending';

create index if not exists role_requests_created_id_idx
  on public.role_requests (created_at desc, id desc);

-- modul: admin. Ditulis otomatis oleh hook di backend/src/core/auth.ts saat admin lolos karena bypass.
create table admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references profiles(id),
  method text not null,
  path text not null,
  target jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_log_idx on admin_audit_log (created_at desc);

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table admin_audit_log enable row level security;

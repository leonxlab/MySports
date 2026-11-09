alter table public.threads
  add column if not exists hidden boolean not null default false;

alter table public.thread_posts
  add column if not exists hidden boolean not null default false;

alter table public.threads
  add constraint threads_title_length_check
  check (char_length(title) between 1 and 120);

alter table public.threads
  add constraint threads_body_length_check
  check (body is null or char_length(body) <= 5000);

alter table public.thread_posts
  add constraint thread_posts_body_length_check
  check (char_length(body) between 1 and 5000);

alter table public.content_reports
  add constraint content_reports_reason_length_check
  check (reason is null or char_length(reason) <= 1000);

create index if not exists threads_visible_sport_cursor_idx
  on public.threads (sport, created_at desc, id desc)
  where hidden = false;

create index if not exists threads_visible_cursor_idx
  on public.threads (created_at desc, id desc)
  where hidden = false;

create index if not exists thread_posts_visible_thread_cursor_idx
  on public.thread_posts (thread_id, created_at asc, id asc)
  where hidden = false;

create index if not exists content_reports_status_cursor_idx
  on public.content_reports (status, created_at desc, id desc);

create unique index if not exists content_reports_one_per_reporter_target_idx
  on public.content_reports (reporter_id, target_type, target_id);

alter table public.threads enable row level security;
alter table public.thread_posts enable row level security;
alter table public.content_reports enable row level security;

alter table public.content_classification
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.content_classification
  add constraint content_classification_latitude_check
  check (latitude is null or latitude between -90 and 90);

alter table public.content_classification
  add constraint content_classification_longitude_check
  check (longitude is null or longitude between -180 and 180);

alter table public.content_classification
  add constraint content_classification_coordinates_pair_check
  check ((latitude is null) = (longitude is null));

alter table public.content_classification
  add constraint content_classification_level_range_check
  check (level_min is null or level_max is null or level_min <= level_max);

create index if not exists user_signals_user_sport_created_idx
  on public.user_signals (user_id, sport, created_at desc);

create index if not exists user_signals_user_kind_created_idx
  on public.user_signals (user_id, kind, created_at desc);

create index if not exists content_classification_sport_type_idx
  on public.content_classification (sport, content_type, content_id);

create index if not exists content_classification_kind_sport_idx
  on public.content_classification (content_kind, sport, content_id);

alter table public.user_signals enable row level security;
alter table public.content_classification enable row level security;

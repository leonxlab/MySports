-- modul: venues. Pencarian jarak, koordinat terbaca, dan slot tidak boleh tumpang tindih.
create extension if not exists btree_gist;

alter table court_slots
  add constraint court_slots_no_overlap
  exclude using gist (court_id with =, tstzrange(starts_at, ends_at) with &&);

-- koordinat terbaca (lat/lng) untuk backend; tidak diberikan ke klien langsung
create or replace view venues_geo as
  select id, st_y(location::geometry) as lat, st_x(location::geometry) as lng from venues;
revoke all on venues_geo from anon, authenticated;

-- lapangan yang sudah disetujui dalam radius (meter), terdekat dulu
create or replace function venues_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision,
  p_sport sport_type default null
) returns table (id uuid, distance_m double precision)
language sql stable as $$
  select v.id, st_distance(v.location, st_makepoint(p_lng, p_lat)::geography) as distance_m
  from venues v
  where v.status = 'approved'
    and st_dwithin(v.location, st_makepoint(p_lng, p_lat)::geography, p_radius_m)
    and (p_sport is null or exists (
      select 1 from courts c where c.venue_id = v.id and c.sport = p_sport and c.active))
  order by distance_m
$$;
revoke all on function venues_nearby(double precision, double precision, double precision, sport_type) from anon, authenticated;

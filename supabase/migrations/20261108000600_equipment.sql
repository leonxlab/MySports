-- modul: equipment (Fase 4)
create table equipment_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  name text not null,
  sport sport_type,
  price_per_day numeric(12,2) not null default 0,
  location geography(point, 4326),
  active boolean not null default true
);
create index equipment_items_location_idx on equipment_items using gist (location);

create table equipment_rentals (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references equipment_items(id),
  renter_id uuid not null references profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  payment_id uuid references payments(id),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'returned', 'cancelled'))
);

-- RLS aktif tanpa policy: hanya backend (service role) yang boleh akses. Lihat rules.md bagian 6.
alter table equipment_items enable row level security;
alter table equipment_rentals enable row level security;

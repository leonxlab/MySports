-- Fondasi. Dipakai semua modul.
create extension if not exists postgis;
create extension if not exists pgcrypto;

create type sport_type as enum ('basketball', 'badminton', 'tennis', 'padel', 'futsal');
create type app_role as enum ('user', 'coach', 'owner', 'admin');
create type request_status as enum ('pending', 'approved', 'rejected');

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Bucket Storage. Semua privat, akses lewat signed URL dari backend.
insert into storage.buckets (id, name, public, file_size_limit) values
  ('media',    'media',    false, 52428800),   -- foto/video profil dan komunitas
  ('segments', 'segments', false, 52428800),   -- potongan video kamera, maks 50 MB, dihapus setelah diproses
  ('models',   'models',   false, null)        -- bobot YOLO
on conflict (id) do nothing;

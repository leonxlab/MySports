# supabase

Satu-satunya sumber skema database. Aturan lengkap: `rules.md` bagian 6.

```
migrations/   urut menurut timestamp, satu file per perubahan
seed.sql      data uji lokal
```

Urutan migrasi awal mengikuti ketergantungan antar modul (payments sebelum open_play, matches sebelum scoring dan devices).

## Pakai Supabase CLI

```bash
npm i -g supabase            # atau: npx supabase ...
supabase init                # sekali saja, membuat supabase/config.toml (commit file ini)
supabase start               # Postgres + Auth + Storage lokal (butuh Docker)
supabase db reset            # jalankan semua migrasi + seed di lokal
supabase link --project-ref <ref-proyek>
supabase db push             # kirim migrasi ke proyek Supabase bersama
```

Migrasi baru: `supabase migration new <modul>_<ringkasan>`, tulis SQL, `supabase db reset` untuk menguji, lalu PR.

## Catatan

- Semua tabel RLS-nya aktif tanpa policy. Hanya backend (service role) dan yolo-service yang mengakses data. Klien hanya memakai Supabase Auth dan upload ke Storage lewat signed URL.
- Bucket: `media`, `segments` (maks 50 MB per file, dihapus setelah diproses), `models` (bobot YOLO). Paket gratis Supabase membatasi file 50 MB, cukup untuk pengembangan. Pilih paket sebelum peluncuran.
- `claim_next_segment()` mengambil pekerjaan antrean secara atomik untuk worker YOLO.
- Tidak ada tabel VIP sengaja. Langganan belum dibuka.
- PostGIS dipakai untuk pencarian berdasarkan jarak (`venues.location`, `equipment_items.location`).

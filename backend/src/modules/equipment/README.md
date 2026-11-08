# Modul equipment: Sewa alat

Rekomendasi dan sewa alat dari Coach atau user terdekat. Di proposal statusnya 'dipikirkan nanti', jadi kerangka saja sampai Fase 4.

| | |
| --- | --- |
| Pemilik | dev-a (platform) |
| Fase | 4 |
| Prefix API | `/api/v1/equipment` |
| Bergantung pada | accounts, payments |
| Tabel | `equipment_items`, `equipment_rentals` |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| GET | `/` | Cari alat terdekat (rekomendasi alat milik Coach lebih dulu) | login |
| GET | `/:id` | Detail alat | login |
| POST | `/` | Daftarkan alat untuk disewakan | login |
| PATCH | `/:id` | Ubah data alat | login |
| POST | `/:id/rent` | Sewa alat | login |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_equipment.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/equipment`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

# Modul venues: Lapangan

Owner Lapangan mendaftarkan lapangan, mengatur ketersediaan dan harga. Admin menyetujui lapangan. Pencarian berdasarkan jarak (PostGIS).

| | |
| --- | --- |
| Pemilik | dev-a (platform) |
| Fase | 1 |
| Prefix API | `/api/v1/venues` |
| Bergantung pada | accounts, role-requests |
| Tabel | `venues`, `courts`, `court_slots` |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| GET | `/` | Cari lapangan berdasarkan jarak dan cabang (lat, lng, sport, radius) | publik |
| GET | `/pending` | Lapangan menunggu persetujuan | admin |
| GET | `/:id` | Detail lapangan | publik |
| POST | `/` | Daftarkan lapangan baru | owner lapangan |
| PATCH | `/:id` | Ubah data lapangan | owner lapangan |
| POST | `/:id/courts` | Tambah court di lapangan | owner lapangan |
| GET | `/courts/:courtId/availability` | Jadwal kosong dan terpakai | publik |
| PUT | `/courts/:courtId/availability` | Update ketersediaan | owner lapangan |
| PUT | `/courts/:courtId/price` | Atur harga sewa | owner lapangan |
| POST | `/:id/approve` | Setujui lapangan | admin |
| POST | `/:id/reject` | Tolak lapangan | admin |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_venues.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/venues`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

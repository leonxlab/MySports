# Modul venues: Lapangan

Owner Lapangan mendaftarkan lapangan, mengatur ketersediaan dan harga. Admin menyetujui lapangan. Pencarian berdasarkan jarak (PostGIS).

| | |
| --- | --- |
| Pemilik | dev-b (Open play end-to-end) |
| Fase | 1 |
| Prefix API | `/api/v1/venues` |
| Bergantung pada | accounts, role-requests |
| Tabel | `venues`, `courts`, `court_slots` |

## Keputusan desain

- **Satu sumber ketersediaan:** `court_slots` milik modul ini. Modul lain (payments, open-play) tidak menentukan ketersediaan dari tabelnya sendiri.
- Slot berubah `free` -> `booked` hanya lewat `markSlotBooked(slotIds)`, dipanggil payments setelah pembayaran `paid`. UPDATE bersyarat sehingga atomik: semua slot atau tidak sama sekali, yang sudah terisi ditolak 409 `SLOT_TAKEN`. `releaseSlot` mengembalikannya.
- Slot tidak boleh tumpang tindih (exclusion constraint). Slot `booked` tidak bisa diubah owner.
- Publik hanya melihat lapangan `approved`.
- Fungsi lintas modul: `getCourt`, `findFreeSlots`, `markSlotBooked`, `releaseSlot`, `countPending`.
- Coach wajib membayar sewa lapangan (booking `confirmed`) sebelum membuat open play di court itu.

## Endpoint

Semua endpoint backend sudah berjalan. Frontend belum. Ubah tabel ini bersamaan dengan kode.

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

- [x] Migrasi: `20261109000100_venues_geo.sql` (fungsi `venues_nearby`, view `venues_geo`, slot tidak boleh tumpang tindih). Belum dijalankan dengan `supabase db reset` (Docker tidak ada di sesi ini)
- [x] `schema.ts` untuk input
- [x] `service.ts`, `slots.ts` dan test (fungsi murni dites; query Supabase belum punya test integrasi)
- [x] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/venues`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

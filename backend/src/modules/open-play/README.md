# Modul open-play: Open play dan slot

Coach membuat open play dan mengatur slot (kuota, jam, harga). User mencari berdasarkan jarak, join, dan bayar. Coach mencari member.

| | |
| --- | --- |
| Pemilik | dev-a (platform) |
| Fase | 1 |
| Prefix API | `/api/v1/open-play` |
| Bergantung pada | accounts, venues, payments |
| Tabel | `open_plays`, `open_play_participants` |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| GET | `/` | Cari open play berdasarkan jarak, cabang, tanggal | publik |
| GET | `/members/search` | Coach mencari pemain | coach |
| GET | `/members/:userId` | Info lengkap member (nama, umur, pengalaman, Level, galeri) | coach |
| GET | `/:id` | Detail open play | publik |
| POST | `/` | Buat open play | coach |
| PATCH | `/:id` | Setting slot: kuota, jam, harga, status | coach |
| POST | `/:id/join` | Join dan mulai pembayaran | login |
| DELETE | `/:id/join` | Batal join | login |
| GET | `/:id/participants` | Peserta terkonfirmasi | coach |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_open_play.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/open-play`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

# Modul community: Community discussion

Thread per cabang olahraga: bagikan pencapaian, skor, pengalaman, video, foto. Ada laporan konten dan moderasi.

| | |
| --- | --- |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Fase | 1 |
| Prefix API | `/api/v1/community` |
| Bergantung pada | accounts |
| Tabel | `threads`, `thread_posts`, `content_reports` |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| GET | `/threads` | Daftar thread (filter cabang) | publik |
| POST | `/threads` | Buat thread | login |
| GET | `/threads/:id` | Detail thread dan balasan | publik |
| POST | `/threads/:id/posts` | Balas thread | login |
| POST | `/media/sign` | Signed URL upload foto atau video | login |
| POST | `/reports` | Laporkan konten | login |
| GET | `/reports` | Antrean laporan | admin |
| POST | `/reports/:id/resolve` | Tindak laporan | admin |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_community.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/community`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

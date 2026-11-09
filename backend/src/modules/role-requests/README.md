# Modul role-requests: Pengajuan Coach dan Owner Lapangan

User mengajukan diri jadi Coach (bukti pengalaman: teks, gambar, video, URL) atau Owner Lapangan. Admin menyetujui atau menolak.

| | |
| --- | --- |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Fase | 1 |
| Prefix API | `/api/v1/role-requests` |
| Bergantung pada | accounts |
| Tabel | `role_requests`, `user_roles (tulis lewat accounts)` |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| POST | `/coach` | Ajukan jadi Coach dengan bukti pengalaman dan prestasi | login |
| POST | `/owner` | Ajukan jadi Owner Lapangan | login |
| GET | `/mine` | Status pengajuan milik sendiri | login |
| GET | `/` | Daftar pengajuan menunggu | admin |
| POST | `/:id/approve` | Setujui pengajuan (memberi role) | admin |
| POST | `/:id/reject` | Tolak pengajuan | admin |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_role_requests.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/role-requests`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

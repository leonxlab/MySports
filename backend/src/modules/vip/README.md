# Modul vip: VIP (coming soon)

Belum dibangun. Backend tidak punya endpoint dan tidak ada tabel. Frontend hanya menampilkan badge VIP, tombol Langganan VIP, dan tombol Generate Highlight, semuanya nonaktif berlabel 'Coming soon'. Jangan tambah apa pun di sini sebelum isi paket VIP diputuskan.

| | |
| --- | --- |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Fase | 4 |
| Prefix API | `/api/v1/vip` |
| Bergantung pada | tidak ada |
| Tabel | tidak ada |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| - | - | Tidak ada endpoint | - |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_vip.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/vip`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

# Modul level: Level dan jam main

Level 0 sampai 300 dari menit main yang diverifikasi AI: Open Play terdaftar 2 XP/menit, main sendiri 1 XP/menit, batas 180 menit/hari. Rumus ada di service.ts dan sudah dites. Anti-cheat menandai rekaman yang dicurigai untuk review manual.

| | |
| --- | --- |
| Pemilik | dev-d (AI olahraga raket, Level, dan fondasi UI) |
| Fase | 3 |
| Prefix API | `/api/v1/level` |
| Bergantung pada | devices |
| Tabel | `play_minutes`, `xp_ledger`, `anti_cheat_flags`, `user_xp (view)` |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| GET | `/me` | Level dan XP sendiri | login |
| GET | `/users/:userId` | Level pemain lain | login |
| POST | `/internal/play-activity` | Terima menit main terverifikasi dari yolo-service | x-service-key |
| GET | `/flags` | Daftar rekaman yang ditandai anti-cheat | admin |
| POST | `/flags/:id/resolve` | Putuskan hasil review | admin |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_level.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/level`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

# Modul match: Setting match dan control menu

Setting match per cabang (mode, waktu, jumlah pemain, time out, hydration break, jeda), nilai bawaan yang bisa diedit, dan kontrol jalannya match (timer, pause). Update langsung lewat WebSocket.

| | |
| --- | --- |
| Pemilik | dev-b (Open play end-to-end) |
| Fase | 2 |
| Prefix API | `/api/v1/match` |
| Bergantung pada | bracket |
| Tabel | `matches` |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| GET | `/defaults/:sport` | Nilai bawaan aturan per cabang | coach |
| POST | `/` | Buat match dari bracket match atau manual | coach |
| GET | `/:id` | Detail dan status match | login |
| PATCH | `/:id/settings` | Edit setting match (Coach atau User sesuai kepemilikan) | login |
| POST | `/:id/start` | Mulai | coach |
| POST | `/:id/pause` | Pause | coach |
| POST | `/:id/resume` | Lanjut | coach |
| POST | `/:id/finish` | Selesai | coach |
| POST | `/:id/timeout` | Time out | coach |
| POST | `/:id/hydration` | Hydration break | coach |
| WS | `/:id/live` | Timer dan skor langsung | publik |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_match.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/match`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

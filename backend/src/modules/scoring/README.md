# Modul scoring: Skor dan statistik

Menerima kejadian skor dari AI (status suggested) dan dari Coach (manual), menghitung poin per cabang di rules/, dan menyajikan statistik. AI tidak menghitung skor sendiri.

| | |
| --- | --- |
| Pemilik | dev-c (Skor, device, dan AI olahraga tim) |
| Fase | 2 |
| Prefix API | `/api/v1/scoring` |
| Bergantung pada | match |
| Tabel | `score_events`, `fouls`, `player_match_stats` |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| GET | `/users/:userId/stats` | Statistik pemain per cabang | login |
| GET | `/:matchId` | Papan skor | login |
| GET | `/:matchId/stats` | Statistik match | login |
| POST | `/:matchId/events` | Input skor manual | coach |
| POST | `/:matchId/fouls` | Catat pelanggaran | coach |
| PUT | `/:matchId/players/:playerId/points` | Isi atau koreksi poin peserta | coach |
| PATCH | `/events/:eventId` | Konfirmasi atau koreksi usulan AI | coach |
| DELETE | `/events/:eventId` | Batalkan kejadian skor | coach |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_scoring.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/scoring`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

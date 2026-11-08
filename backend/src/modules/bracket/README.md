# Modul bracket: Bracket otomatis

Membagi pemain yang sudah bayar ke lapangan dan ronde. Selisih jumlah main antar pemain paling banyak satu match. Algoritma berupa fungsi murni di algorithm.ts supaya mudah dites dengan contoh tabel di proposal.

| | |
| --- | --- |
| Pemilik | dev-b (match dan AI) |
| Fase | 2 |
| Prefix API | `/api/v1/bracket` |
| Bergantung pada | open-play |
| Tabel | `brackets`, `bracket_rounds`, `bracket_matches`, `bracket_resting` |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| POST | `/generate` | Buat bracket dari jumlah pemain, lapangan, durasi | coach |
| GET | `/open-play/:openPlayId` | Bracket milik satu open play | login |
| GET | `/:id` | Detail bracket | login |
| PATCH | `/:id/matches/:matchId` | Koreksi manual susunan pemain | coach |
| POST | `/:id/regenerate` | Buat ulang bracket | coach |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_bracket.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/bracket`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

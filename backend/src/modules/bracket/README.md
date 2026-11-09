# Modul bracket: Bracket otomatis

Membagi pemain yang sudah bayar ke lapangan dan ronde. Selisih jumlah main antar pemain paling banyak satu match. Algoritma berupa fungsi murni di algorithm.ts supaya mudah dites dengan contoh tabel di proposal.

| | |
| --- | --- |
| Pemilik | dev-b (Open play end-to-end) |
| Fase | 2 |
| Prefix API | `/api/v1/bracket` |
| Bergantung pada | open-play |
| Tabel | `brackets`, `bracket_rounds`, `bracket_matches`, `bracket_resting` |

## Endpoint

Semua endpoint backend sudah berjalan. Frontend belum. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| POST | `/generate` | Buat bracket dari jumlah pemain, lapangan, durasi | coach |
| GET | `/open-play/:openPlayId` | Bracket milik satu open play | login |
| GET | `/:id` | Detail bracket | login |
| PATCH | `/:id/matches/:matchId` | Koreksi manual susunan pemain | coach |
| POST | `/:id/regenerate` | Buat ulang bracket | coach |

## Catatan desain

- Peserta dibaca read-only dari `open_play_participants` berstatus `confirmed`. `TODO(integration)`: ganti dengan `createOpenPlayApi(ctx).listConfirmedParticipants` setelah modul open-play siap.
- Hasil deterministik per `seed` (versi bracket). Basket/futsal memakai tim tetap bila tim lebih banyak daripada yang bisa main sekaligus; selain itu tim dibentuk ulang tiap ronde.
- `TODO(decision)`: ukuran tim bawaan 5 bila Coach tidak mengatur; sisa pemain yang tidak habis dibagi tim bergantian istirahat.
- Regenerate dan koreksi ditolak (409) bila match dari bracket itu sudah berjalan.

## Checklist

- [ ] Migrasi: `supabase/migrations/*_bracket.sql` (sudah ada kerangkanya, periksa)
- [x] `schema.ts` untuk input
- [x] `algorithm.ts`, `correction.ts`, `service.ts` dan test (service diuji lewat fungsi murni; query Supabase belum punya test integrasi)
- [x] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/bracket`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

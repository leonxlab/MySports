# Modul scoring: Skor dan statistik

Menerima kejadian skor dari AI (status suggested) dan dari Coach (manual), menghitung poin per cabang di rules/, dan menyajikan statistik. AI tidak menghitung skor sendiri.

| | |
| --- | --- |
| Pemilik | dev-c (Skor, device, dan AI olahraga tim) |
| Fase | 2 |
| Prefix API | `/api/v1/scoring` |
| Bergantung pada | match (`getMatchSettings`), bracket (`getBracketMatch`), accounts (`getProfileSummaries`) |
| Tabel | `score_events`, `fouls`, `player_match_stats` (tulis); `matches` (baca saja) |

## Endpoint

Coach = pembuat match (`matches.created_by`); admin lolos semua cek.

| Method | Path | Fungsi | Akses | Request | Respons |
| --- | --- | --- | --- | --- | --- |
| GET | `/users/:userId/stats` | Statistik pemain per cabang | login | - | `UserSportStats[]` |
| GET | `/:matchId` | Papan skor dan antrean usulan AI | login | - | `Scoreboard` |
| GET | `/:matchId/stats` | Statistik match per pemain | login | - | `MatchStats` |
| POST | `/:matchId/events` | Input skor manual (langsung `confirmed`) | coach | `{ kind, team, points?, scorerId?, action?, occurredAtMs? }` | 201 `Scoreboard` |
| POST | `/:matchId/fouls` | Catat pelanggaran | coach | `{ playerId, kind? }` | 201 `Foul` |
| PUT | `/:matchId/players/:playerId/points` | Isi atau koreksi poin peserta (menimpa jumlah dari kejadian) | coach | `{ points, stats? }` | `MatchStats` |
| PATCH | `/events/:eventId` | Konfirmasi usulan AI atau koreksi kejadian | coach | `{ action: "confirm" \| "correct", team?, points?, scorerId? }` | `Scoreboard` |
| DELETE | `/events/:eventId` | Batalkan kejadian skor (`voided`) | coach | - | `Scoreboard` |

Kode error khusus: `EVENT_NOT_ALLOWED` (400, kejadian tidak berlaku untuk cabang), `MATCH_FINISHED` (409), `TEAM_REQUIRED` (400), `POINTS_REQUIRED` (400, basket dari AI wajib memilih 2/3), `SCORER_NOT_IN_TEAM` (400), `EVENT_NOT_SUGGESTED` (409), `EVENT_VOIDED` (409), `SCORE_EVENT_NOT_FOUND` (404).

Siaran WebSocket kanal `match:{id}`: `{ type: "score", scoreboard }`, `{ type: "suggestions", suggestions }`, `{ type: "stats", stats }`, `{ type: "foul", foul }`.

## Untuk modul lain (`createScoringApi(ctx)`)

- `ingestSuggestedEvents(events)`: dipanggil devices. Simpan `basket_made`, `goal`, `ball_landed` sebagai `suggested`, idempoten lewat `event_key` (= `event_id`). Hasil per event: `stored`, `duplicate`, atau `skipped` dengan alasan (`NO_MATCH`, `NOT_SCORING`, `KIND_NOT_ALLOWED`, `MATCH_NOT_FOUND`).
- `getScoreSnapshot(matchId)`: papan skor untuk match dan devices.

## Aturan skor (`rules/`)

Fungsi murni, skor selalu dihitung ulang dengan memutar ulang kejadian `confirmed`/`corrected`. Nilai bawaan bisa ditimpa Coach lewat `matches.settings.rules` (kunci yang tidak dikenal diabaikan).

| Cabang | Kejadian | Nilai bawaan (`settings.rules`) |
| --- | --- | --- |
| Basket | `basket_made` 1/2/3 poin | `targetPoints: null` (selesai oleh waktu) |
| Futsal | `goal` | `targetGoals: null` |
| Badminton | `point` (rally) | `pointsPerGame: 21, winBy: 2, cap: 30, gamesToWin: 2` |
| Tennis, padel | `point` | `gamesPerSet: 6, setsToWin: 2, tiebreakAt: 6, tiebreakPoints: 7, noAd: false` |

## Asumsi dan keputusan yang belum final

- `TODO(decision)`: struktur game/set badminton, tennis, padel. Memakai aturan resmi BWF/ITF sebagai bawaan yang bisa diganti.
- `TODO(decision)`: pembeda basket 2/3 poin (#10). Usulan AI basket disimpan dengan `points_unconfirmed`; Coach wajib memilih 2 atau 3 saat konfirmasi.
- `TODO(decision)`: tim pencetak dari warna baju. Sementara dibaca dari `settings.rules.teamColors = { home, away }` bila diisi; selain itu tim kosong dan Coach memilih.
- `TODO(decision)`: `ball_landed` ke tim: jatuh di dalam sisi S = poin untuk lawan S; di luar dekat sisi S = poin untuk S.
- `TODO(decision)`: memadukan skor manual dengan hasil AI yang menyusul (#4). Sekarang urutan masuk (`created_at`); `source`, `status`, `occurred_at_ms` disimpan untuk kebijakan nanti.
- `TODO(decision)`: kejadian AI tennis dan padel (#11). Sementara sama dengan badminton (`ball_landed`).
- Konfirmasi usulan AI (memilih tim atau 2/3) tetap `confirmed`; `corrected` hanya bila Coach memakai `action: "correct"`.

## Checklist

- [x] Migrasi: `20261112090000_scoring_suggestions_and_stats.sql` (tim boleh kosong untuk usulan, indeks statistik)
- [x] `schema.ts` untuk input
- [x] `rules/` dan `service.ts` dengan test (`rules.test.ts`, `service.test.ts`)
- [x] `routes.ts` (tidak ada `todo(...)` tersisa)
- [x] Frontend: `/match/[id]/result`, `/stats`, komponen `ScorerPicker`, `ManualActionPanel`, `FoulPanel`, `SuggestionQueue`
- [ ] `npm run typecheck && npm test` (backend) dan `typecheck && build` (frontend) belum dijalankan di sesi penulisan (dependensi belum terpasang)
- [ ] `supabase db reset` untuk migrasi belum dijalankan
- [ ] Komponen control menu dipasang di `coach/match/[id]` oleh pemilik halaman (Jonathan)

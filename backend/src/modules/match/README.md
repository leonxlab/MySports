# Modul match: Setting match dan control menu

Setting match per cabang (mode, waktu, jumlah pemain, time out, hydration break, jeda), nilai bawaan yang bisa diedit, dan kontrol jalannya match (timer, pause). Update langsung lewat WebSocket.

| | |
| --- | --- |
| Pemilik | Jonathan (Open play end-to-end) |
| Fase | 2 |
| Prefix API | `/api/v1/match` |
| Bergantung pada | bracket (`getBracketMatch`), open_plays (dibaca untuk cek pemilik) |
| Tabel | `matches` |

## Endpoint

| Method | Path | Fungsi | Akses | Status |
| --- | --- | --- | --- | --- |
| GET | `/defaults/:sport` | Nilai bawaan aturan per cabang | coach | jadi |
| POST | `/` | Buat match dari bracket match atau manual | coach | jadi |
| GET | `/:id` | Detail dan status match | login | jadi |
| PATCH | `/:id/settings` | Edit setting (hanya sebelum mulai) | login, pemilik | jadi |
| POST | `/:id/start` | Mulai | coach, pemilik | jadi |
| POST | `/:id/pause` | Pause | coach, pemilik | jadi |
| POST | `/:id/resume` | Lanjut | coach, pemilik | jadi |
| POST | `/:id/finish` | Selesai | coach, pemilik | jadi |
| POST | `/:id/timeout` | Time out (memakai jatah) | coach, pemilik | jadi |
| POST | `/:id/hydration` | Hydration break (memakai jatah) | coach, pemilik | jadi |
| WS | `/:id/live` | Timer dan skor langsung | publik | tersambung, autentikasi menunggu dev-c |

"Pemilik" = pembuat match. Admin boleh mengontrol semua match.

## Aturan

- **Status**: `scheduled` → `running` ⇄ `paused` → `finished`; `cancelled` dari status mana pun yang belum selesai. Aturannya murni di `rules.ts` (`applyAction`) dan diuji tanpa database.
- **Timer dihitung server.** Yang disimpan hanya `elapsed_seconds` (akumulasi sampai jeda terakhir) dan `runtime.resumedAt`. Waktu berjalan = `elapsed_seconds` + (sekarang − `resumedAt`) saat `running`. Klien memakai `elapsedSeconds` dan `serverTime` dari respons atau pesan WS lalu menghitung sendiri per detik; jam perangkat tidak ikut menentukan.
- **Aksi serentak aman**: setiap perubahan memakai `UPDATE ... WHERE status = <status lama>`. Dua time out bersamaan tidak bisa memakai satu jatah dua kali; yang kalah dapat `409 MATCH_CONFLICT`.
- **Setting** disimpan penuh di `matches.settings` saat dibuat (nilai bawaan cabang + penimpa Coach). Edit hanya boleh saat `scheduled`. Penghitung (`runtime`) ada di kolom terpisah supaya edit setting tidak bisa meresetnya.
- **Satu bracket match = satu match** (indeks unik parsial). Membuat match dari bracket match mensyaratkan pembuatnya pemilik open play-nya (atau admin).
- Setiap perubahan disiarkan ke kanal `match:<id>` berupa `{ type: "match", match: <MatchView> }`.

## Untuk modul lain

`createMatchApi(ctx).getMatchSettings(id)` mengembalikan `{ id, sport, bracketMatchId, createdBy, status, settings }`. Modul scoring membaca aturan skor dari `settings.rules`.

## TODO(decision)

- **Angka bawaan per cabang** (durasi, jumlah pemain, jatah dan lama time out, hydration, jeda) adalah placeholder di `rules.ts` (`DEFAULT_SETTINGS`). Proposal hanya menyebut parameternya. Ganti di satu tempat itu setelah tim memutuskan.
- Match yang lewat dari `durationMinutes` belum selesai otomatis; Coach menekan selesai sendiri.
- Autentikasi WebSocket ada di `core/realtime.ts` (milik dev-c).

## Checklist

- [x] Migrasi: `20261108000800_match.sql` (kerangka) + `20261109000400_match_runtime.sql` (kolom `runtime`, indeks unik)
- [x] `schema.ts`, `rules.ts`, `service.ts`, `routes.ts`, test
- [ ] Migrasi dijalankan ke database sungguhan (belum diuji di sesi ini)
- [ ] Frontend: `frontend/src/modules/match`
- [ ] Status di `MODULES.md` diubah

# Titik temu antar jalur

Siapa menyediakan apa untuk siapa. Setiap baris adalah janji antar dua orang. Kalau tanda tangan atau bentuknya berubah, beri tahu pemakai dan ubah baris ini dalam PR yang sama.

Folder prompt: `Leon`, `Jonathan`, `Aldo`, dan `Eugene`, sesuai nama di `prompts/`.

Konvensi (rules.md bagian 3):

- Modul lain hanya dipanggil lewat `create<Modul>Api(ctx)` dari `backend/src/modules/<modul>/index.ts`. Contoh: `createAccountsApi(app.ctx).getProfileSummaries(ids)`.
- Penyedia merge **kerangka tipe** (nama fungsi, parameter, tipe hasil, boleh melempar `NotImplemented`) lebih dulu supaya pemakai bisa menulis kode di atas tipe yang benar.
- Pemakai yang belum bisa memanggil menulis tiruan sementara di sisinya dan memberi komentar `TODO(integration): menunggu <modul>.<fungsi>`.
- Hanya pemilik modul yang menulis ke tabelnya sendiri. Modul lain membaca lewat fungsi yang diekspor atau query read-only.

## Fungsi backend lintas modul

| Penyedia | Fungsi | Pemakai | Keterangan |
| --- | --- | --- | --- |
| accounts (Leon) | `getProfileSummary(userId)`, `getProfileSummaries(ids)` | open-play, community, scoring, bracket, admin | `id`, `display_name`, `photo_path`, `level` (sementara `0` sampai modul level siap) |
| accounts (Leon) | `getRoles`, `grantRole`, `revokeRole` | role-requests | Hanya accounts yang menulis `user_roles`; role admin hanya melalui penunjukan internal |
| role-requests (Leon) | `countPending()` | admin | |
| community (Leon) | `countOpenReports()`, `listRecentThreads(filter)` | admin, feed | |
| feed (Leon) | `classifyContent(...)`, `recordSignal(...)` | community, open-play | |
| venues (Jonathan) | `getCourt(courtId)`, `markSlotBooked`, `releaseSlot`, `countPending()` | payments, open-play, equipment, admin | `getCourt` memuat lokasi venue |
| payments (Jonathan) | `createCheckout(...)`, `onPaid(targetType, handler)`, `settle(paymentId)`, `getFeeSettings()` | open-play, equipment | `onPaid` menghindari impor melingkar |
| open-play (Jonathan) | `listConfirmedParticipants(openPlayId)`, `getOpenPlay(id)`, `listNearby(filters)` | bracket, match, feed | |
| bracket (Jonathan) | `getBracketMatch(id)` | match, scoring | Pemain per sisi |
| match (Jonathan) | `getMatch(id)`, `getMatchSettings(id)` | scoring, devices | |
| scoring (Aldo) | `ingestSuggestedEvents(events)`, `getScoreSnapshot(matchId)` | devices, match | Idempoten lewat `event_key` |
| devices (Aldo) | `getSession(id)` | match | |
| level (Eugene) | `ingestPlayActivity(...)`, `getLevelSummary(userId)`, `countOpenFlags()` | devices, accounts, feed, admin | Rumus tidak berubah |

## Komponen frontend lintas modul

| Penyedia | Komponen | Dipasang di | Pemilik halaman |
| --- | --- | --- | --- |
| accounts (Leon) | `SessionProvider`, `useMe` | semua halaman yang butuh login | semua |
| vip (Leon) | `VipBadge`, `VipSubscribeButton` | `profile` | Leon |
| vip (Leon) | `GenerateHighlightButton` | `match/[id]/result` | Aldo (PR kecil, review Aldo) |
| level (Eugene) | `LevelBadge`, `LevelProgress` | `profile`, kartu member di open-play | Leon, Jonathan |
| match (Jonathan) | layout control menu, `useMatchLive` | `coach/match/[id]` | Jonathan |
| scoring (Aldo) | `ScorerPicker`, `ManualActionPanel`, `FoulPanel`, `SuggestionQueue` | `coach/match/[id]` | Jonathan |
| UI kit (Eugene, Fase 0) | komponen dasar, layout, navigasi | semua | semua |

## Kontrak dan migrasi lintas jalur

| Yang berubah | Pembuat | Perlu review dari | Catatan |
| --- | --- | --- | --- |
| `contracts/calibration.schema.json` baru | Aldo | Eugene, Jonathan | PR terpisah, sebelum detektor mulai |
| Event atau endpoint tanda kecurigaan (anti-cheat) | Leon | Aldo, Eugene | PR kontrak terpisah. Level menerima, devices meneruskan |
| Event pantulan dinding padel (opsional) | Eugene | Leon, Aldo | Hanya bila disetujui masuk cakupan |
| Migrasi kolom `video_segments` (`duration_ms`, `started_at_ms`), `device_sessions` (`consent_at`, `sport`) dan fungsi `requeue_stale_segments` | Aldo | Leon (worker `jobs`) | Nama kolom dibahas dulu |
| Migrasi kolom `hidden` pada `threads` dan `thread_posts` | Leon | satu orang lain (review migrasi) | Hanya menyentuh modul sendiri, dicatat karena migrasi bersifat bersama |
| `core/realtime.ts`: autentikasi WebSocket | Aldo | Leon atau Jonathan | Dipakai match dan devices |

## Urutan merge di awal (jalur kritis)

1. Leon: `accounts` minimal (bootstrap, `getMe`, `createAccountsApi`, `SessionProvider`).
2. Jonathan: kerangka `createPaymentsApi` (tanda tangan saja), `FakeGateway`.
3. Aldo: `core/realtime.ts` dengan autentikasi, dan PR kontrak kalibrasi.
4. Eugene: memo UI stack dan, setelah disetujui, kerangka tampilan.
5. Jonathan: kerangka `createMatchApi` (tipe `getMatch`, `getMatchSettings`) supaya scoring bisa mulai.
6. Setelah itu tiap orang bebas bergerak di jalurnya, dengan titik temu di tabel di atas.

## Keputusan bersama yang masih menggantung

Disarikan dari "Pertanyaan Terbuka" di proposal dan yang muncul saat membagi kerja. Pemilik jalur yang menyentuhnya menandai `TODO(decision)` dan menunggu keputusan tim, bukan memutuskan sendiri.

| Keputusan | Menyentuh |
| --- | --- |
| Nama aplikasi | accounts, frontend (konstanta) |
| Library UI dan styling | Eugene (memo), semua frontend |
| Penyedia payment gateway dan metode payout | payments |
| Penyedia GPU dan jadwal nyala-mati | jobs, devices |
| Format segmen video (HLS atau MediaRecorder) | devices |
| Pembeda basket 2 dan 3 poin | scoring, basketball |
| Kejadian AI tennis dan padel | scoring, tennis, padel |
| Struktur game dan set di badminton, tennis, padel | scoring |
| Atribusi menit main ke pemain | level, play_activity |
| Memadukan skor manual dengan hasil AI yang menyusul | scoring, devices |
| Penyimpanan klip atau hash anti-cheat | anti_cheat, level |
| Isi paket VIP dan retensi klip | vip (tidak dibangun) |
| Kebijakan pembatalan dan refund | open-play, payments, venues |

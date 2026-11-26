# Modul devices: Device dan deteksi AI

Pairing sampai 3 device per sesi (kamera home, kamera away, controller) lewat QR atau kode sesi. Kamera mengunggah segmen video langsung ke Supabase Storage lewat signed URL, yolo-service mengambil dari antrean dan mengirim event ke endpoint /events.

| | |
| --- | --- |
| Pemilik | dev-c (Skor, device, dan AI olahraga tim) |
| Fase | 3 |
| Prefix API | `/api/v1/devices` |
| Bergantung pada | match (`getMatchSettings`), scoring (`ingestSuggestedEvents`), level (`ingestPlayActivity`, belum ada: `TODO(integration)`) |
| Tabel | `device_sessions`, `session_devices`, `video_segments`; bucket Storage `segments` |

## Endpoint

| Method | Path | Fungsi | Akses | Request |
| --- | --- | --- | --- | --- |
| POST | `/sessions` | Buat sesi pairing (kode 6 karakter, berlaku 30 menit) | coach | `{ matchId?, sport? }` |
| POST | `/sessions/join` | Pasang device dengan kode | login | `{ code, role }` |
| GET | `/sessions/:id` | Status sesi dan device (kode hanya untuk Coach sesi) | Coach sesi atau device | - |
| POST | `/sessions/:id/capability` | Laporkan resolusi, FPS, baterai; balikan berisi peringatan | device | `{ width, height, fps, webgpu?, connection?, batteryLevel?, charging? }` |
| POST | `/sessions/:id/heartbeat` | Isi `last_seen_at` (status online) | device | - |
| POST | `/sessions/:id/consent` | Catat persetujuan pemain (`consent_at`), idempoten | Coach sesi atau kamera | `{ agreed: true }` |
| POST | `/sessions/:id/calibration` | Simpan kalibrasi (`contracts/calibration.schema.json`) | coach (pemilik sesi) | kalibrasi |
| POST | `/sessions/:id/segments/sign` | Signed URL unggah segmen, path `{sessionId}/{deviceId}/{seq}` | kamera | `{ seq, sizeBytes, mimeType, startOffsetMs, durationMs }` |
| POST | `/sessions/:id/segments/:segmentId/uploaded` | Cek file ada di Storage, lalu status `queued`; idempoten | kamera | - |
| POST | `/events` | Terima batch kejadian dari yolo-service, hasil per event | x-service-key | `ingestEventsBody` |
| WS | `/sessions/:id/live?token=` | Status device langsung (`{ type: "session" }`) | Coach sesi atau device | - |

Kode error khusus: `SESSION_CODE_INVALID` (404), `TOO_MANY_ATTEMPTS` (429, 10 kode salah per 10 menit per user), `ROLE_TAKEN` (409), `ALREADY_JOINED` (409), `CONSENT_REQUIRED` (409), `SEGMENT_ALREADY_UPLOADED` (409), `SEGMENT_NOT_UPLOADED` (409), `SEGMENT_TOO_LARGE` (413), `CALIBRATION_SPORT_MISMATCH` (400), `SESSION_CLOSED` (409).

Aturan:
- Satu peran hanya satu device per sesi; controller hanya Coach pemilik sesi.
- Kamera tidak bisa minta signed URL sebelum persetujuan pemain dicatat.
- Peringatan kemampuan kamera: `RESOLUTION_BELOW_1080P`, `FPS_BELOW_30`, `NOT_CHARGING`. Angka dari syarat awal proposal, belum hasil uji (`TODO(decision)` #12).
- Ingest: `basket_made`, `goal`, `ball_landed` ke scoring (status `suggested`, idempoten lewat `event_id`); `play_activity` ke level.

## Untuk modul lain

- `createDevicesApi(ctx).getSession(id)`: status sesi tanpa kode pairing (dipakai match).

## Asumsi dan keputusan yang belum final

- `TODO(decision)`: format segmen. Memakai potongan MediaRecorder, satu siklus recorder per segmen 30 detik (`docs/decisions/video-segment-format.md`).
- `TODO(decision)`: batas antrean offline di device (#4). Sementara 1 GB di IndexedDB.
- `TODO(decision)`: siapa yang boleh membuat sesi tanpa Coach (XP solo). Sementara hanya role coach.
- `TODO(decision)`: masa berlaku kode (30 menit); batas percobaan disimpan di memori proses (cukup untuk satu dyno).
- `TODO(integration)`: `level.ingestPlayActivity` belum ada; event `play_activity` dijawab `skipped`.
- `TODO(integration)`: `start_offset_ms` dihitung dari awal rekaman kamera, belum diselaraskan dengan timer match.
- `TODO(integration)`: QR belum dirender (library belum dipasang); layar Coach menampilkan kode dan tautan `/device/pair?code=`.
- Kolom offset bernama `start_offset_ms` (bukan `started_at_ms` seperti di `prompts/INTEGRATION.md`) karena worker `jobs` sudah membaca nama itu.

## Checklist

- [x] Migrasi: `20261112100000_devices_consent_and_segment_timing.sql`
- [x] `schema.ts`, `code.ts`, `service.ts` dengan test (`code.test.ts`, `service.test.ts`, `calibration.test.ts`)
- [x] `routes.ts` (tidak ada `todo(...)` tersisa)
- [x] Frontend: `/coach/session/new`, `/device/pair`, `/device/camera/[sessionId]`
- [ ] Typecheck, test, build belum dijalankan di sesi penulisan (dependensi belum terpasang)
- [ ] `supabase db reset` belum dijalankan
- [ ] Uji layar kamera di HP Android dan iPhone (rencana di memo format segmen)

# Variabel lingkungan (env)

Ringkasan semua variabel per layanan. Contoh siap salin ada di `.env.example` tiap folder.

## Backend (Heroku) — `backend/.env`

| Variabel | Wajib | Isi |
| --- | --- | --- |
| `NODE_ENV` | ya | `development` / `production` |
| `PORT` | tidak | default `3001` |
| `CORS_ORIGINS` | ya | URL frontend produksi + preview, dipisah koma |
| `SUPABASE_URL` | ya | URL proyek Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ya | service role key (jangan pernah ke frontend) |
| `YOLO_SERVICE_KEY` | ya | kunci bersama ≥16 karakter, harus sama dengan yolo-service |
| `PAYMENT_PROVIDER` | sementara | masih `undecided` |
| `PAYMENT_WEBHOOK_SECRET` | sementara | kosong sampai gateway dipilih |

## Frontend (Vercel) — `frontend/.env.local`

| Variabel | Isi |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL backend (Heroku) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (bukan service role) |

## YOLO service (host GPU terpisah) — `yolo-service/.env`

| Variabel | Isi |
| --- | --- |
| `SUPABASE_URL` | URL proyek Supabase (bucket segments/models) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |
| `BACKEND_URL` | URL backend publik (Heroku), contoh `https://peluit-api.herokuapp.com` |
| `YOLO_SERVICE_KEY` | kunci bersama, sama dengan backend |

## Integrasi antar host (app utama ↔ yolo-service)

Kedua layanan berjalan di host berbeda dan hanya bertemu di dua titik:

1. **yolo-service → backend**: `POST {BACKEND_URL}/api/v1/devices/events` dengan header `x-service-key: YOLO_SERVICE_KEY`. Backend memvalidasi lewat `requireServiceKey` di `backend/src/core/auth.ts`. Payload mengikuti `contracts/detection-event.schema.json` (idempoten lewat `event_id`).
2. **Supabase sebagai perantara file**: yolo-service mengunduh segmen dan mengunggah hasil langsung ke bucket `segments`/`models`, backend hanya membuat signed URL — video tidak pernah melewati backend (batas router Heroku 30 detik).

Karena host terpisah: `BACKEND_URL` harus URL publik (bukan localhost), CORS backend hanya mengizinkan domain frontend, dan kunci `YOLO_SERVICE_KEY` dirotasi di kedua layanan bersamaan. Jaringan antar layanan tidak perlu dibuka langsung — tidak ada backend → yolo-service call.

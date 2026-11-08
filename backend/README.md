# backend

API Open Play. Fastify + TypeScript + zod, data di Supabase, deploy ke Heroku.

```bash
cp .env.example .env
npm install
npm run dev        # :3001
npm run typecheck
npm test
```

## Struktur

```
src/
  server.ts            titik masuk (baca env, buat client Supabase, listen)
  app.ts               rakit Fastify: cors, websocket, auth, error handler, semua modul
  config/env.ts        validasi environment (zod)
  core/                milik berdua: auth+role, error, realtime hub, tipe konteks
  modules/<modul>/     satu folder per fitur (index, routes, service, schema, README)
  modules/index.ts     daftar modul
tests/                 test tingkat aplikasi
```

## Menambah endpoint

1. Buka `modules/<modul>/README.md`, lihat endpoint yang direncanakan.
2. Tulis skema di `schema.ts`, logika di `service.ts` (dengan test), lalu ganti `todo(...)` di `routes.ts` dengan handler.
3. Perbarui tabel endpoint di README modul.

Cek akses selalu lewat `preHandler`:

```ts
app.post("/", { preHandler: app.requireRole("coach") }, async (req) => { ... });
```

- `requireRole()` tanpa argumen = semua yang login. Admin selalu lolos dan aksinya otomatis masuk `admin_audit_log`.
- `requireServiceKey` untuk endpoint yang dipanggil yolo-service.
- Endpoint WebSocket: lihat `core/realtime.ts` (`liveRoute`).

## Menambah modul baru

Buat `modules/<nama>/` dengan pola yang sama, daftarkan di `modules/index.ts`, tambahkan di `MODULES.md` dan `CODEOWNERS`.

## Deploy

Lihat `docs/deploy.md`. `Procfile` dan `app.json` sudah ada. Build berjalan lewat `heroku-postbuild`.

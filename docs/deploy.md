# Deploy

| Layanan | Tempat | Folder |
| --- | --- | --- |
| Database, auth, storage | Supabase | `supabase/` |
| Backend API | Heroku | `backend/` |
| Frontend web | Vercel | `frontend/` |
| yolo-service | GPU hosting sewa (belum dipilih) | `yolo-service/` |

## Supabase

1. Buat proyek di supabase.com. Catat project ref, URL, anon key, service role key.
2. `supabase link --project-ref <ref>` lalu `supabase db push`.
3. Cek bucket `media`, `segments`, `models` sudah ada (dibuat oleh migrasi pertama).
4. Paket gratis membatasi file 50 MB. Itu cukup untuk uji, tapi pilih paket sebelum peluncuran.

## Heroku (backend dari subfolder)

Heroku men-deploy akar repo, sedangkan API ada di `backend/`. Cara paling ringkas: buildpack subdir.

```bash
heroku create <nama-app-api>
heroku buildpacks:add -i 1 https://github.com/timanovsky/subdir-heroku-buildpack
heroku buildpacks:add -i 2 heroku/nodejs
heroku config:set PROJECT_PATH=backend

heroku config:set \
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  YOLO_SERVICE_KEY=... CORS_ORIGINS=https://<domain-vercel>
```

Lalu di dashboard Heroku: Deploy → GitHub → pilih repo → branch `main` → Enable Automatic Deploys. Cek buildpack itu masih terawat sebelum dipakai. Workflow CI GitHub Actions tidak digunakan; validasi dilakukan lokal sebelum merge.

Catatan:
- Router Heroku memutus request yang tidak dijawab dalam 30 detik. Karena itu video tidak pernah lewat backend, hanya signed URL.
- WebSocket jalan di dyno web biasa. Dengan lebih dari satu dyno, `RealtimeHub` perlu diganti (Supabase Realtime atau Redis).
- Kredit Heroku mahasiswa berakhir setelah 24 bulan. Siapkan anggaran sebelum itu.

## Vercel (frontend)

1. Import repo di Vercel. **Root Directory = `frontend`**.
2. Environment variables: `NEXT_PUBLIC_API_URL` (URL Heroku), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Setiap PR mendapat preview URL. Tambahkan domain preview ke `CORS_ORIGINS` backend bila perlu menguji dari preview.

## GPU hosting (yolo-service)

Penyedia dan jadwal nyala-matinya belum diputuskan (pertanyaan terbuka #3). Langkah di bawah berlaku untuk penyedia mana pun yang memberi mesin Linux dengan GPU NVIDIA dan Docker.

1. Ukur dulu di laptop RTX: catat FPS, memori GPU, dan detik proses per menit video di `docs/benchmarks.md`. Pilih paket GPU dari angka itu.
2. Di mesin sewa: pasang Docker dan NVIDIA Container Toolkit.
3. `git clone` repo, lalu `git checkout yolo-vX.Y.Z` (hanya tag rilis).
4. `cd yolo-service && cp .env.example .env`, isi `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKEND_URL` (URL Heroku), `YOLO_SERVICE_KEY`.
5. `docker compose up -d --build`.
6. Unduh bobot: `docker compose exec worker python -m scripts.download_models <file>.pt`.
7. Cek `curl localhost:8000/gpu`, `curl localhost:8001/metrics`, dan lihat log worker.

Biaya GPU berjalan selama mesin menyala. Matikan mesin bila tidak ada match.

Worker mengekspos metrik antrean di port 8001. Docker Compose merestart layanan yang gagal,
memeriksa healthcheck API/worker, dan membatasi log container ke tiga file berukuran 10 MB.

## Rilis YOLO

```bash
git tag yolo-v0.1.0 && git push origin yolo-v0.1.0
```

Tag dibuat setelah versi itu lolos uji di laptop RTX.

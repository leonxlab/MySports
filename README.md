# MySports (nama aplikasi belum fix ditentukan)

Aplikasi untuk join MySports, menghitung skor otomatis dengan kamera AI (YOLO), dan melacak statistik di lima cabang: basket, padel, badminton, futsal, tennis. Detail produk: [`docs/proposal.md`](docs/proposal.md).

## Isi repo

| Folder | Isi | Jalan di |
| --- | --- | --- |
| [`backend/`](backend) | API REST + WebSocket (Fastify, TypeScript) | Heroku |
| [`frontend/`](frontend) | Web (Next.js, TypeScript) | Vercel |
| [`yolo-service/`](yolo-service) | Deteksi video (Python, FastAPI, YOLO) | GPU sewa; diuji di laptop RTX |
| [`supabase/`](supabase) | Migrasi SQL, seed | Supabase |
| [`contracts/`](contracts) | Kontrak event YOLO → backend | - |
| [`docs/`](docs) | Proposal, arsitektur, setup, deploy | - |
| [`prompts/`](prompts) | Prompt AI per modul dan per orang | - |

Setiap fitur adalah **modul** dengan nama yang sama di backend, frontend, dan (bila perlu) yolo-service. Daftar modul, pemilik, dan status ada di [`MODULES.md`](MODULES.md).

## Mulai

1. Baca [`rules.md`](rules.md). Isinya aturan git, kepemilikan modul, dan batas antar folder.
2. Ikuti [`docs/setup-local.md`](docs/setup-local.md).
3. Tentukan siapa dev-a sampai dev-d (jalurnya ada di `MODULES.md`), lalu ganti `@dev-a` ... `@dev-d` di `.github/CODEOWNERS` dengan username GitHub.
4. Nyalakan proteksi branch `main` di GitHub (daftarnya di `rules.md` bagian 4).
5. Buka `prompts/<nama>/00-kickoff.md` milikmu (`Leon`, `Jonathan`, `Aldo`, atau `Eugene`), lalu kerjakan modul satu per satu dengan prompt-nya (lihat `prompts/README.md`).

Status awal: kerangka saja. Semua endpoint backend menjawab `501 NOT_IMPLEMENTED`, halaman frontend berisi placeholder. Yang sudah jalan: auth guard dan cek role, pencatatan aksi admin ke audit log, rumus XP/Level (dengan test), kontrak event YOLO (dengan test), antrean video di Supabase, dan worker YOLO. Tes dijalankan lokal sebelum membuka PR.

## Perintah cepat

```bash
# backend
cd backend && npm install && npm run dev      # :3001
# frontend
cd frontend && npm install && npm run dev     # :3000
# yolo-service (setelah pasang torch, lihat docs/setup-local.md)
cd yolo-service && uvicorn app.main:app --reload --port 8000
```

## Hal yang masih terbuka di proposal

Nama aplikasi MySports tetapi belum fix ditentukan, penyedia GPU, gateway pembayaran (local), format segmen video, kejadian AI untuk tennis dan padel (karena masih dalam pencarian spesifik), pembeda basket 2/3 poin, isi paket VIP. Bagian yang bergantung pada itu ditandai `TODO(decision)` atau tertulis "belum diputuskan" di README modul.

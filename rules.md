# rules.md

Aturan kerja untuk semua yang commit ke repo ini. Kalau ada yang bentrok dengan kebiasaan pribadi, ikut file ini. Mau mengubah aturan? Buka PR ke `rules.md` dan minta persetujuan semua (empat) pemilik jalur.

Sumber kebutuhan produk ada di `docs/proposal.md`. Pembagian modul dan status ada di `MODULES.md`.

## 1. Prinsip

1. **Aturan bisnis hanya di backend.** Frontend menampilkan data dan mengirim aksi. Bracket, skor, Level, hak akses, dan hitungan biaya tidak boleh dihitung di klien. Alasannya: app iOS/Android nanti memanggil API yang sama.
2. **Satu fitur = satu modul = satu pemilik.** Modul yang sama punya nama yang sama di backend, frontend, dan (kalau ada) yolo-service.
3. **Kontrak dulu, kode kemudian.** Bentuk request, response, dan event ditulis dulu (README modul atau `contracts/`), baru dikerjakan dua sisi.
4. **`main` harus selalu bisa jalan.** Heroku dan Vercel deploy dari sana.
5. **YOLO berdiri sendiri.** Backend tidak mengimpor kode YOLO, YOLO tidak mengimpor kode backend. Mereka bicara lewat antrean di Supabase dan HTTP event (lihat `contracts/`).

## 2. Struktur repo

```
openplay-app/
├── prompts/          Prompt AI per orang dan per modul
├── backend/          API (Fastify + TypeScript) → Heroku
├── frontend/         Web (Next.js + TypeScript) → Vercel
├── yolo-service/     Deteksi (Python + FastAPI + YOLO) → GPU hosting sewa
├── supabase/         Migrasi SQL (satu-satunya sumber skema database)
├── contracts/        Kontrak lintas layanan (event YOLO → backend)
├── docs/             Proposal, arsitektur, setup, deploy
├── .github/          template PR dan issue, CODEOWNERS
├── MODULES.md        Daftar modul, pemilik, fase, status
└── rules.md          File ini
```

Batas antar folder:

- `frontend/` hanya bicara ke `backend/` lewat HTTP/WebSocket. Satu-satunya pengecualian: Supabase Auth (login/signup) dan upload file ke Storage lewat signed URL.
- `backend/` memegang service role key Supabase. `frontend/` hanya pegang anon key.
- `yolo-service/` membaca antrean `video_segments`, mengunduh segmen dari bucket `segments`, lalu mengirim hasil ke `POST /api/v1/devices/events` dengan header `x-service-key`.
- Tidak ada folder `shared/` yang diimpor lintas layanan. Kalau dua layanan perlu bentuk data yang sama, tulis di `contracts/` dan buat tipenya di masing-masing sisi.

## 3. Modul dan kepemilikan

Daftar modul resmi: accounts, role-requests, venues, open-play, payments, equipment, bracket, match, scoring, devices, level, community, feed, vip, admin.

Struktur satu modul:

```
backend/src/modules/<modul>/
  index.ts       daftar modul (nama, fase)
  routes.ts      endpoint. Tipis: validasi, cek role, panggil service
  service.ts     logika bisnis. Di sini tempat aturan hidup
  schema.ts      skema zod untuk body dan query
  README.md      tujuan, endpoint, tabel, checklist status
frontend/src/modules/<modul>/
  api.ts         pemanggilan endpoint modul
  types.ts       tipe respons
  components/    komponen khusus modul
frontend/src/app/<route>/page.tsx      halaman tipis, isinya memanggil komponen modul
yolo-service/app/modules/<modul>/      (hanya modul yang punya sisi AI)
supabase/migrations/<timestamp>_<modul>.sql
```

Aturan kepemilikan:

- Pemilik modul tercatat di `MODULES.md` dan `.github/CODEOWNERS`. Hanya pemilik yang mengubah isi modulnya.
- Butuh perubahan di modul orang lain? Tulis di issue, atau kerjakan sendiri lewat PR dan minta pemilik modul itu me-review. Jangan langsung merge.
- Modul tidak boleh mengimpor `service.ts` modul lain secara langsung. Kalau perlu data modul lain, panggil `create<Modul>Api(ctx)` yang diekspor `index.ts` modul itu (contoh: `createAccountsApi(app.ctx)`), atau baca tabelnya lewat query read-only. Ketergantungan harus tertulis di README modul (bagian "Bergantung pada") dan di `prompts/INTEGRATION.md`.
- Halaman admin tinggal di modul yang memilikinya (misal persetujuan Coach di `role-requests`, pengaturan biaya di `payments`). Modul `admin` hanya dasbor dan audit log.
- Kode inti (`backend/src/core`, `frontend/src/lib`, `yolo-service/app/core`), `contracts/`, dan `supabase/migrations` milik bersama. Perubahan di sana butuh persetujuan pemilik tiap sisi yang terdampak (backend, frontend, yolo-service), minimal dua orang. Beri waktu review 24 jam sebelum menganggap setuju diam-diam.
- Pemilik modul bisa dipindah. Ubah `MODULES.md` dan `CODEOWNERS` dalam satu PR kecil.

## 4. Alur git

### Branch

- `main` dilindungi. Tidak ada push langsung.
- Branch kerja dibuat dari `main`: `feat/<modul>-<hal-singkat>`, `fix/<modul>-<hal>`, `chore/<hal>`, `docs/<hal>`.
  Contoh: `feat/bracket-round-count`, `fix/payments-webhook-signature`.
- Umur branch pendek. Targetnya merge dalam 1–3 hari. Fitur besar dipecah jadi beberapa PR kecil, bukan satu branch yang hidup dua minggu.
- Sebelum buka PR: `git fetch && git rebase origin/main`.

Pengaturan yang perlu dinyalakan di GitHub (Settings → Branches → `main`):

- Require a pull request, 1 approval, dan nyalakan **Require review from Code Owners**
- Block force pushes
- Hanya izinkan **squash merge**

Workflow GitHub Actions tidak digunakan. Jalankan test dan typecheck yang relevan secara lokal sebelum membuka PR dan cantumkan hasilnya di deskripsi PR.
Jika branch protection atau ruleset masih mewajibkan status check dari workflow ini, hapus required check tersebut di pengaturan GitHub agar PR tidak tertahan.

### Commit

Format Conventional Commits dengan scope = modul:

```
tipe(scope): ringkasan singkat dalam bahasa Inggris, huruf kecil, tanpa titik
```

Tipe: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `build`, `ci`, `style`.

Scope: nama modul (`bracket`, `scoring`, `venues`, dst.) atau salah satu dari `backend-core`, `frontend-core`, `yolo-core`, `basketball`, `futsal`, `badminton`, `tennis`, `padel`, `play-activity`, `anti-cheat`, `jobs`, `calibration`, `db`, `contracts`, `infra`, `docs`, `deps`, `repo`. Dua scope boleh dipisah koma.

Contoh:

```
feat(bracket): compute round count from duration and break
fix(payments): reject webhook with invalid signature
feat(devices,yolo-core): add event ingest endpoint and client
chore(deps): bump fastify
```

Aktifkan hook sekali setelah clone: `git config core.hooksPath .githooks`.

Satu commit = satu perubahan yang masuk akal. Jangan campur refactor besar dengan fitur baru. Judul PR memakai format yang sama karena squash merge memakainya sebagai pesan commit di `main`.

### Pull request

- Pakai template PR yang ada. Isi bagian "Modul" dan centang checklist dengan jujur.
- Ukuran ideal di bawah 400 baris diff (di luar lockfile dan migrasi).
- Reviewer membalas dalam 24 jam. Kalau belum sempat, bilang saja.
- Penulis yang menekan merge setelah approve dan validasi lokal selesai. Hapus branch setelah merge.
- Komentar review tentang selera ("aku lebih suka begini") boleh, tapi tidak memblokir. Yang memblokir: bug, pelanggaran aturan di file ini, dan test yang kurang.

### Merge dan deploy

| Layanan | Sumber | Pemicu |
| --- | --- | --- |
| Backend (Heroku) | folder `backend/` | Auto deploy dari `main` |
| Frontend (Vercel) | folder `frontend/` | Preview per PR, produksi dari `main` |
| yolo-service (GPU sewa) | folder `yolo-service/` | Manual. Server GPU hanya menjalankan tag `yolo-vX.Y.Z` |
| Database (Supabase) | folder `supabase/migrations/` | `supabase db push` oleh pemilik modul setelah PR merge |

Detail langkah ada di `docs/deploy.md`.

### Konflik

Kalau rebase menghasilkan konflik di file yang bukan milikmu, jangan pilih salah satu sisi begitu saja. Tanyakan ke pemilik file. Konflik di `package-lock.json`: ambil versi `main`, lalu jalankan `npm install` ulang.

## 5. Aturan kode

**Umum**
- Identifier, nama file, nama tabel, dan pesan commit pakai bahasa Inggris. Komentar dan dokumentasi boleh bahasa Indonesia.
- TypeScript `strict`. Dilarang `any` kecuali ada komentar alasan di baris yang sama.
- Python 3.11, type hint wajib di fungsi publik, format dan lint dengan `ruff`.
- Tidak ada `console.log` / `print` sisa debug di `main`. Pakai logger (`app.log` di Fastify, `logging` di Python).

**Backend**
- Semua endpoint di bawah `/api/v1/<modul>`. Ubah perilaku yang merusak klien lama? Naikkan versi (`/api/v2`), jangan ubah diam-diam.
- `routes.ts` hanya: validasi input (zod), cek role, panggil `service.ts`, kembalikan respons. Logika bisnis tidak ditulis di sini.
- Role dicek di server pada setiap endpoint lewat `app.requireRole(...)`. Admin lolos semua cek. Setiap aksi admin yang lolos karena bypass dicatat otomatis ke `admin_audit_log` (hook di `core`). Jangan menulis cek `if (user.role === ...)` manual di route.
- Format error seragam: `{ "error": { "code": "VENUE_NOT_FOUND", "message": "..." } }`. Pakai `AppError` dari `core/errors.ts`.
- Upload file besar tidak lewat backend (Heroku memutus request di 30 detik). Backend hanya membuat signed URL ke Supabase Storage.
- Pekerjaan berat dan lama tidak jalan di dalam request. Taruh di antrean atau worker.
- Pembayaran: backend menganggap status dari webhook gateway sebagai satu-satunya sumber kebenaran. Jangan percaya redirect dari klien. Setiap webhook diverifikasi signature-nya dan harus idempotent.
- Uang disimpan sebagai `numeric` di database dan dihitung di backend. Dilarang `float` untuk uang. Perhitungan fee ikut model dan persentase dari `fee_settings` (diatur Admin), jangan di-hardcode.

**Frontend**
- Halaman di `src/app` tipis. Komponen dan logika tampilan ada di `src/modules/<modul>`.
- Semua panggilan API lewat `src/lib/api-client.ts` dan `api.ts` modul. Dilarang `fetch` langsung ke backend dari komponen.
- Tidak ada aturan bisnis di klien. Menyembunyikan tombol sesuai role itu soal tampilan, bukan keamanan.
- Fitur VIP hanya badge dan tombol nonaktif berlabel "Coming soon". Jangan tambah endpoint atau alur bayar VIP sebelum isi paketnya diputuskan (lihat proposal bagian VIP).

**Kontrak lintas layanan**
- Event dari YOLO ke backend didefinisikan di `contracts/detection-event.schema.json`. Mengubahnya = PR terpisah yang masuk lebih dulu, disetujui pemilik tiap sisi yang terdampak, lalu backend dan yolo-service menyesuaikan di PR masing-masing.
- Event punya `event_id` yang dibuat YOLO. Backend menyimpan dengan kunci itu supaya kirim ulang tidak menggandakan skor.
- AI hanya mengusulkan kejadian (bola masuk ring, bola mendarat di luar garis, dst.). Aturan poin, game, dan set dihitung di backend (`scoring/rules/`). Event AI masuk dengan status `suggested`, Coach yang mengonfirmasi lewat controller. Input manual penuh selalu tersedia sebagai cadangan.

## 6. Database dan migrasi

- Skema database hanya berubah lewat file di `supabase/migrations/`. Dilarang mengubah tabel lewat dashboard Supabase.
- Nama file: `YYYYMMDDHHMMSS_<modul>_<ringkasan>.sql`. Timestamp mencegah bentrok nomor urut antar anggota tim. Migrasi yang menyentuh tabel modul lain diberi tahu ke pemilik tabelnya.
- Migrasi yang sudah di-merge ke `main` tidak diedit lagi. Perbaikan = migrasi baru.
- Setiap tabel baru wajib `alter table ... enable row level security;` di migrasi yang sama. Klien tidak mengakses tabel langsung, hanya backend dengan service role, jadi tanpa policy berarti tertutup untuk umum. Tambahkan policy hanya bila ada alasan jelas dan catat di README modul.
- Setiap modul hanya menulis ke tabelnya sendiri (daftar tabel ada di README modul). Menulis ke tabel modul lain lewat fungsi yang diekspor modul itu.
- Uji migrasi di Supabase lokal (`supabase db reset`) sebelum push ke proyek bersama.
- Data uji ditaruh di `supabase/seed.sql`, tidak pernah berisi data orang sungguhan.

## 7. YOLO service

- Dikembangkan dan diuji di laptop RTX (lihat `docs/setup-local.md`), lalu di-deploy ke GPU hosting sewa memakai Docker image yang sama.
- **Bobot model tidak masuk git** (`*.pt`, `*.onnx`, `*.engine`). Simpan di bucket Supabase `models` dan unduh dengan `scripts/download_models.py`. Versi bobot dicatat di `yolo-service/models/VERSIONS.md` (nama file, tanggal, data latih, metrik).
- Cek lisensi repo dan dataset sebelum dipakai (beberapa repo referensi di proposal tidak mencantumkan lisensi). Catat hasilnya di README modul olahraga terkait.
- Alur kerja worker: ambil segmen dari antrean → unduh → deteksi → kirim event ke backend → **hapus segmen dari Storage** → tandai selesai. Segmen dihapus juga saat gagal permanen. Video tidak boleh tertinggal di server, di log, atau di folder `tmp/` setelah selesai.
- Dilarang menulis URL video, wajah, atau nama pemain ke log.
- Setiap detektor olahraga adalah satu kelas yang mengikuti `SportDetector` (`app/core/detector.py`) dan didaftarkan di registry. Menambah olahraga tidak mengubah worker.
- Detektor menghasilkan **kejadian**, bukan skor. Titik ring, gawang, atau garis datang dari kalibrasi Coach (`calibration`).
- Ukur dulu sebelum mengoptimasi: catat FPS, memori GPU, dan waktu proses per menit video untuk tiap detektor di `docs/benchmarks.md`. Angka itu dipakai untuk memilih paket GPU sewa.
- Server GPU sewa dinyalakan hanya saat dibutuhkan. Jangan simpan secret di image Docker. Kirim lewat environment.
- Server GPU hanya menjalankan release bertag `yolo-vX.Y.Z`. Tag baru dibuat setelah diuji di laptop RTX.

## 8. Environment dan secret

- `.env` tidak pernah di-commit. Setiap layanan punya `.env.example` yang selalu diperbarui saat menambah variabel.
- Secret dibagikan lewat password manager, bukan chat atau issue.
- Service role key Supabase: hanya di backend (Heroku config vars) dan yolo-service. Tidak boleh ada di frontend, `NEXT_PUBLIC_*`, atau log.
- `YOLO_SERVICE_KEY` dipakai bersama backend dan yolo-service. Ganti kalau pernah bocor.
- Kalau secret terlanjur ter-commit: anggap sudah bocor. Rotasi dulu, baru bersihkan riwayat.

## 9. Keamanan dan privasi

- Pemain harus menyetujui sebelum direkam. Layar kamera menampilkan status persetujuan, dan sesi tidak bisa mulai tanpanya.
- Video hanya ada selama deteksi berjalan. Yang disimpan: skor, statistik, menit main. Mau menyimpan klip (highlight VIP, review anti-cheat)? Kebijakan retensi harus diputuskan dan ditulis di proposal dulu.
- Admin tampil sebagai user biasa di sisi pengguna lain, tapi semua aksinya masuk audit log.
- Input pengguna selalu divalidasi (zod di backend). Jangan merender HTML mentah dari konten komunitas.
- Konten komunitas harus bisa dilaporkan dan dimoderasi (modul `community`).

## 10. Testing dan definisi selesai

Fitur dianggap selesai kalau semua ini benar:

- [ ] Endpoint berjalan dan tercatat di README modul (method, path, role, request, respons)
- [ ] Logika bisnis ada test. Wajib untuk: bracket, rumus Level/XP, aturan skor per cabang, hitungan fee, cek role
- [ ] Migrasi sudah ada, RLS aktif, `supabase db reset` lolos di lokal
- [ ] Frontend memakai `api.ts` modul, state loading dan error tertangani
- [ ] Test, typecheck, dan build yang relevan dijalankan lokal
- [ ] Checklist di README modul diperbarui dan `MODULES.md` diubah statusnya

Aturan test:

- Backend: `vitest`. Fungsi murni (bracket, XP, aturan skor) ditest langsung dengan contoh dari proposal. Contohnya tabel bracket badminton 3 lapangan 16 pemain, dan tabel XP per level.
- yolo-service: `pytest`. Detektor diuji dengan klip pendek di `yolo-service/tests/fixtures/` (maksimal beberapa MB, tanpa wajah yang bisa dikenali, sudah ada izin).
- Sebelum merge fitur yang menyentuh alur pembayaran, uji di mode sandbox gateway.

## 11. Cara bekerja berempat

- Ambil tugas lewat issue: tetapkan dirimu sebagai assignee sebelum mulai, supaya tidak dobel.
- Label issue: `mod:<modul>`, `fase:1`–`fase:4`, `backend` / `frontend` / `yolo` / `db`.
- Pantau gate fase di `MODULES.md`. Jangan mulai fase berikutnya sebelum gate fase sekarang terpenuhi, kecuali modulnya tidak bergantung.
- Sinkronisasi singkat tiap beberapa hari (chat cukup): apa yang selesai, apa yang menghalangi, kontrak mana yang akan berubah. Tiga baris per orang sudah cukup.
- Titik temu antar jalur dicatat di `prompts/INTEGRATION.md`. Penyedia merge **kerangka tipe** (tanda tangan fungsi `create<Modul>Api`, bentuk respons) lebih dulu, baru implementasi penuh, supaya pemakai tidak menunggu.
- Pekerjaan yang dibantu AI (prompt di `prompts/`) tetap ditinjau manusia. Jalankan test sendiri sebelum buka PR, dan baca diff-nya. Keputusan baru yang muncul di chat dengan AI harus dicatat di PR atau `docs/`, bukan hanya tinggal di chat.
- Prompt adalah bagian repo. Mengubahnya lewat PR, dan pemilik jalurnya yang menyetujui.
- Keputusan yang mengubah proposal (stack, aturan skor, kebijakan video) dicatat di `docs/proposal.md` lewat PR.
- Pertanyaan terbuka di proposal diperlakukan sebagai asumsi sementara. Jangan membangun fitur di atas pertanyaan yang belum dijawab tanpa menandainya `TODO(decision)`.

## 12. Dilarang

- Push langsung ke `main`, force push, atau menghapus riwayat `main`
- Commit `.env`, kunci API, bobot model, video, atau data pengguna
- Mengedit migrasi yang sudah di-merge
- Mengubah skema lewat dashboard Supabase
- Aturan bisnis di frontend
- Membuat endpoint, tabel, atau UI langganan VIP sebelum paketnya diputuskan
- Menyimpan video lebih lama dari proses deteksi
- Mengubah isi modul orang lain tanpa review pemiliknya
- Menerima keluaran AI tanpa menjalankan test dan membaca diff-nya

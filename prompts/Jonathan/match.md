# Prompt: match

| | |
| --- | --- |
| Modul | `match`: Setting match dan control menu |
| Pemilik | dev-b (Open play end-to-end) |
| Layer | backend + frontend |
| Fase | 2 |
| Bobot | 2 |
| Bergantung pada | bracket |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **Medium** |
| Branch disarankan | `feat/match-settings-and-lifecycle` |

Alasan effort: Alurnya terdefinisi, bagian real-time cukup sederhana. Effort medium.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `match` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-b, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: Setting Match dan Control Menu; Olahraga yang Didukung; AI Detection dan Device Pairing (peran controller).
4. `backend/src/modules/match/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`matches`).
6. `frontend/src/modules/match/README.md` dan halaman placeholder di `frontend/src/app/`.
7. `backend/src/core/realtime.ts` (`RealtimeHub`, `liveRoute`)
8. README modul `bracket` dan `scoring`

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Setting match per cabang dengan nilai bawaan yang bisa diedit, siklus hidup match (timer, pause, time out, hydration break), dan siaran real-time.

## Spesifikasi dari proposal

- Parameter setting per cabang: mode main (tunggal atau ganda untuk badminton, tennis, padel), waktu (durasi match atau ronde), jumlah pemain per sisi atau per lapangan, time out (jumlah dan lama), hydration break (kapan dan berapa lama), jeda antar ronde (dipakai bracket).
- Tiap cabang punya nilai bawaan dari aplikasi. Coach atau User bisa mengedit match dan mengganti nilai itu sesuai aturan mereka. Simpan hanya selisih dari nilai bawaan atau seluruh objek, tapi validasi dengan skema zod per cabang.
- Basket: full court atau half court, pemain per sisi fleksibel. Tim dikenali dari warna baju (urusan AI, bukan modul ini).
- Control menu: timer (mulai, pause, lanjut), time out dan hydration break menurut setting, melihat bracket, selesai. Pencetak skor dan input aksi diurus modul scoring. Halaman control menu menanamkan komponen dari scoring.
- State machine: `scheduled` → `running` ⇄ `paused` → `finished`, atau `cancelled`. Timer otoritatif di server (simpan waktu mulai dan akumulasi jeda), klien menghitung dari timestamp server. Siarkan tiap perubahan ke kanal `match:{id}` lewat WebSocket.
- Controller adalah perangkat (biasanya ponsel Coach). Antarmukanya harus nyaman di layar kecil dan tahan koneksi putus-nyambung.

## Yang harus dikerjakan

### Database
Tabel `matches` sudah ada (`settings jsonb`, `elapsed_seconds`, `status`). Tambah kolom yang diperlukan untuk timer (mis. `last_resumed_at`) lewat migrasi baru.

### Backend
- `defaults.ts`: nilai bawaan per cabang. Proposal tidak memberi angka, jadi pilih nilai wajar, jadikan konstanta yang mudah diubah, dan tandai `TODO(decision)`.
- `settings.ts`: skema zod per cabang dan fungsi gabung bawaan + perubahan.
- `state.ts`: transisi status dan hitung `elapsed` murni (dengan test).
- `service.ts` dan `routes.ts`: semua endpoint di README, plus `ws /:id/live` yang menyiarkan event timer. Perubahan setting oleh pembuat match atau Coach (cek kepemilikan di service).
- Ekspor `getMatch(id)` dan `getMatchSettings(id)` untuk scoring dan devices.

### Frontend
- `/coach/match/[id]` (control menu, desain mobile-first), `/match/[id]` (tampilan langsung untuk peserta), `/match/[id]/settings`.
- Hook `useMatchLive(id)` yang membuka WebSocket, menyambung ulang otomatis, dan menampilkan status koneksi.
- Sediakan slot untuk `ScorerPicker`, `ManualActionPanel`, `FoulPanel` dari modul scoring (dev-c). Pasang placeholder sampai komponen itu ada.

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- `createMatchApi(ctx)`: `getMatch`, `getMatchSettings`
- Layout control menu dan hook `useMatchLive` (dipakai scoring dan devices)

Yang kamu pakai dari modul lain:
- `createBracketApi(ctx).getBracketMatch`
- Komponen scoring (dev-c)
- `liveRoute` dari core. Autentikasi WebSocket (`?token=`) dikerjakan dev-c di `core/realtime.ts`, sampai itu merge biarkan `TODO(auth)`.

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Nilai bawaan per cabang (angka di atas, asumsi).
- Perilaku timer saat server restart (usul: pulihkan dari database).

## Di luar tugas ini

- Penghitungan skor dan statistik (scoring).
- Pairing device (devices).
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- State machine: setiap transisi legal dan ilegal.
- Hitung `elapsed` dengan beberapa pause dan resume.
- Gabung bawaan + perubahan, nilai tidak valid ditolak.
- Hanya pembuat atau Coach yang bisa mengubah setting.

Perintah pemeriksaan:
```
cd backend && npm run typecheck && npm test
cd frontend && npm run typecheck && npm run build
```
Test baru ditulis dengan `vitest` (backend). Service diuji dengan klien Supabase tiruan, tanpa jaringan.

## Cara kerja

1. Tulis rencana singkat (5 sampai 10 baris): urutan kerja, bagian paling berisiko, dan asumsi yang akan kamu pakai. Kalau ada hal yang benar-benar menghalangi dan jawabannya tidak ada di repo maupun proposal, tanyakan sebelum menulis kode. Selain itu lanjut dengan asumsi yang ditandai `TODO(decision)`.
2. Kerjakan dari bagian paling berisiko: fungsi murni dan test lebih dulu, baru service, route, lalu frontend (atau pipeline lalu detektor untuk modul YOLO).
3. Commit kecil dengan format `tipe(scope): ringkasan` (hook `.githooks/commit-msg` menolak format salah). Pecah pekerjaan menjadi PR yang bisa direview, kira-kira di bawah 400 baris diff di luar lockfile dan migrasi.
4. Jangan menyentuh file di luar modulmu kecuali tertulis di tugas ini. Perubahan di `core`, `contracts`, atau migrasi modul lain dibuat sebagai PR terpisah dengan scope yang sesuai.
5. Jalankan pemeriksaan sebelum menyatakan selesai (perintah di bagian Pengujian).
6. Perbarui README modul (tabel endpoint, checklist) dan baris modul di `MODULES.md`.

## Definisi selesai

- Semua endpoint modul berjalan (tidak ada `todo(...)` yang tersisa, kecuali yang tertulis sebagai ditunda di atas) dan tabel endpoint di README modul sesuai kode.
- Logika bisnis ada di `service.ts` dan dites. Tidak ada aturan bisnis di frontend.
- Halaman frontend modul berfungsi dengan state loading dan error, memakai `api.ts` modul.
- Migrasi baru (bila ada) berupa file baru dengan RLS aktif.
- Typecheck, test, dan build lolos.
- README modul dan `MODULES.md` diperbarui.
- Tidak ada secret, `.env`, atau data pengguna di commit.

## Laporan akhir

Tutup dengan laporan singkat:
- Apa yang sudah jadi dan apa yang belum (jujur, termasuk yang hanya stub).
- Perintah yang dijalankan dan hasilnya.
- Asumsi dan `TODO(decision)` yang harus diputuskan tim, masing-masing satu kalimat.
- Perubahan di luar modulmu (kalau ada) dan siapa yang perlu me-review.
- Risiko atau hal yang kamu ragukan.

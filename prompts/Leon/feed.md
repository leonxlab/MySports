# Prompt: feed

| | |
| --- | --- |
| Modul | `feed`: Halaman utama dan personalisasi |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Layer | backend + frontend |
| Fase | 1 |
| Bobot | 2 |
| Bergantung pada | accounts, open-play, community |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **Medium** |
| Branch disarankan | `feat/feed-home-and-explore` |

Alasan effort: Logika peringkat butuh sedikit desain, tapi lingkupnya jelas. Effort medium.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `feed` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-a, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: Halaman Utama dan Personalisasi; Fitur per Role (User); Pertanyaan Terbuka (keputusan 10).
4. `backend/src/modules/feed/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`user_signals`, `content_classification`).
6. `frontend/src/modules/feed/README.md` dan halaman placeholder di `frontend/src/app/`.
7. README modul `open-play`, `community`, `venues` (sumber konten)

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Halaman utama dengan dua jalur: "Let me choose for you" yang disusun dari kebiasaan user, dan menu global semua cabang tanpa personalisasi.

## Spesifikasi dari proposal

- Sinyal kebiasaan: apa yang dicari (kata kunci), open play yang diikuti (cabang dan lokasi yang sering), topik komunitas yang dibaca/dibalas/diposting, lokasi user.
- Klasifikasi konten otomatis pada lima dimensi: cabang olahraga, jenis konten (open play, lapangan, sewa alat, thread, pencapaian, skor), format (teks/foto/video), lokasi (area atau kota), rentang Level yang relevan. Disimpan di `content_classification`.
- Konten dicocokkan dengan sinyal user sehingga yang tampil sesuai preferensi. User bisa memfilter halaman utama.
- Menu global: semua cabang tanpa personalisasi, tetap bisa difilter.
- Tulis fungsi pemeringkat yang murni dan deterministik: masukan sinyal, item terklasifikasi, lokasi; keluaran daftar urut dengan skor yang bisa dijelaskan. Jangan memakai ML. Bobot ada di satu konstanta.
- User baru tanpa sinyal (cold start): urutkan berdasarkan kedekatan lokasi dan kebaruan.

## Yang harus dikerjakan

### Database
Tabel `user_signals` dan `content_classification` sudah ada. Tambah index untuk query per user dan per cabang (migrasi baru).

### Backend
- `ranking.ts` (fungsi murni + test).
- `service.ts`: `classifyContent`, `recordSignal`, `getHomeFeed(user, location, filters)`, `getExplore(filters)`.
- Sumber konten: baca lewat fungsi yang diekspor modul pemilik (`open-play`, `community`, `venues`) atau query read-only. Hanya tabel `user_signals` dan `content_classification` yang ditulis modul ini.
- Paginasi cursor.

### Frontend
- `/` (halaman utama, dua jalur dengan tab), `/explore`.
- Filter cabang, jenis, dan jarak. Minta izin lokasi dengan jelas dan tetap berfungsi tanpa izin.

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- `createFeedApi(ctx).classifyContent`, `recordSignal` (dipakai community, open-play)

Yang kamu pakai dari modul lain:
- `createCommunityApi`, `createOpenPlayApi`, `createVenuesApi` (list konten)
- `createLevelApi(ctx).getLevelSummary` untuk rentang Level (opsional, dev-d)

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Cara user menghapus atau mereset riwayat sinyal (privasi) belum diputuskan.
- Bobot sinyal belum ditentukan, pakai angka awal dan tandai agar mudah disetel.

## Di luar tugas ini

- Pencarian teks penuh.
- Rekomendasi berbasis ML.
- Iklan (Claude products dan proposal tidak memuat iklan).
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Pemeringkat: sinyal cabang tertentu menaikkan item cabang itu.
- Cold start memakai jarak dan kebaruan.
- Filter mengecualikan item yang tidak cocok.
- Hasil sama untuk masukan sama (deterministik).

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

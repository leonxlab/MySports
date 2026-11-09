# Prompt: level

| | |
| --- | --- |
| Modul | `level`: Level dan jam main |
| Pemilik | dev-d (AI olahraga raket, Level, dan fondasi UI) |
| Layer | backend + frontend |
| Fase | 3 |
| Bobot | 2 |
| Bergantung pada | devices |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **Medium** |
| Branch disarankan | `feat/level-ingest-and-flags` |

Alasan effort: Rumus sudah jelas, sisanya integrasi dan konsistensi data dengan satu keputusan atribusi yang pelik. Effort medium cukup.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `level` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-d, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: Profil dan Level (Aturan perhitungan Level, Kebutuhan XP per level); Risiko dan Mitigasi (kecurangan Level); Pertanyaan Terbuka (nomor 5).
4. `backend/src/modules/level/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`play_minutes`, `xp_ledger`, `anti_cheat_flags`).
6. `frontend/src/modules/level/README.md` dan halaman placeholder di `frontend/src/app/`.
7. `backend/src/modules/level/service.ts` dan `level.test.ts` (rumus dan test yang sudah lolos; jangan ubah rumusnya)
8. README modul `devices` dan `anti_cheat` (yolo)

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Menghitung Level 0 sampai 300 dari menit main yang diverifikasi AI. Rumus sudah ada dan dites, tugasmu membangun sekitar rumus itu: penerimaan data, aturan harian, ledger XP, review anti-cheat.

## Spesifikasi dari proposal

- Level mengukur jam terbang terverifikasi, bukan skor atau kemenangan. Satu Level global untuk semua cabang.
- Hanya menit saat YOLO mendeteksi aktivitas main nyata yang dihitung. Open Play terdaftar (ada bracket dan pemain lain): 2 XP per menit. Main sendiri (hanya satu pemain terdeteksi): 1 XP per menit. Batas harian maksimal 180 menit terverifikasi per hari.
- Kurva: Level 1 di 0 XP, Level 2 butuh 50 XP, Level 3 butuh 100 XP tambahan, lalu selisih naik 200 XP tiap level mulai Level 4. Level 0 berarti belum ada sesi terverifikasi. Kurva dipakai apa adanya.
- Anti-cheat: rekaman yang diputar ulang atau pola gerakan identik berulang ditandai untuk review manual oleh Admin, bukan hukuman otomatis.
- Penerimaan data: menit main datang dari event `play_activity` yang diteruskan modul devices lewat `createLevelApi(ctx).ingestPlayActivity`. Idempoten per (`segment_id`, `user_id`). Endpoint `/internal/play-activity` redundan karena jalurnya lewat devices. Hapus lewat PR bila tidak dipakai dan perbarui README.

## Yang harus dikerjakan

### Database
Tabel `play_minutes`, `xp_ledger`, `anti_cheat_flags`, view `user_xp` sudah ada. Migrasi BARU bila perlu kolom untuk koreksi (entri ledger negatif saat kecurangan dikonfirmasi).

### Backend
- Pertahankan fungsi di `service.ts` yang sudah dites. Tambahkan service di sekitarnya: `ingestPlayActivity` (hitung sisa jatah harian dari `play_minutes`/`xp_ledger` hari itu, tulis ledger), `getMyLevel`, `getUserLevel`, `getLevelSummary(userId)` (level, XP, XP menuju level berikutnya), daftar tanda anti-cheat (admin), resolve (konfirmasi memicu entri ledger koreksi).
- Batas hari: tentukan zona waktu hari (usul Asia/Jakarta) sebagai konstanta.

### Frontend
- Komponen `LevelBadge` (sudah ada) dan baru `LevelProgress` (bilah menuju level berikutnya) untuk dipasang di profil oleh modul accounts.
- `/admin/flags`: daftar tanda anti-cheat, detail alasan dan skor, tombol konfirmasi atau tolak.

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- `createLevelApi(ctx)`: `ingestPlayActivity`, `getLevelSummary`, `countOpenFlags` (accounts, devices, admin, open-play, feed)
- Komponen `LevelBadge`, `LevelProgress`

Yang kamu pakai dari modul lain:
- `createDevicesApi` memanggil modul ini (arah sebaliknya)
- Tanda anti-cheat dari yolo-service: butuh kontrak baru (lihat keputusan)

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- **Atribusi menit ke pemain.** YOLO tidak mengenali identitas. Usul: menit dihitung untuk semua peserta bracket yang sedang main pada rentang waktu itu (open play) dan untuk pemilik kamera (main sendiri). Implementasikan lewat satu fungsi kebijakan yang bisa diganti, tulis asumsinya, tandai `TODO(decision)`, dan laporkan di ringkasan akhir sebagai keputusan yang harus diambil tim.
- Zona waktu batas hari.
- Cara tanda anti-cheat sampai ke backend: kontrak baru di `contracts/` (jenis event atau endpoint terpisah). Bahas dengan dev-a (anti_cheat) dan dev-c (devices) dan ajukan PR kontrak terpisah lebih dulu.
- Apakah klip anti-cheat boleh disimpan dan berapa lama (nomor 5): default tidak disimpan.

## Di luar tugas ini

- Mengubah rumus kurva atau tarif XP.
- Deteksi aktivitas (yolo `play_activity`).
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Test yang ada tetap lolos tanpa diubah.
- Ingest dua kali untuk segmen yang sama tidak menggandakan XP.
- Batas 180 menit per hari lintas beberapa segmen dan sesi.
- Open play 2 XP dan solo 1 XP per menit pada jalur ingest.
- Konfirmasi kecurangan menambah entri koreksi dan menurunkan Level dengan benar.

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

# Prompt: bracket

| | |
| --- | --- |
| Modul | `bracket`: Bracket otomatis |
| Pemilik | dev-b (Open play end-to-end) |
| Layer | backend + frontend |
| Fase | 2 |
| Bobot | 3 |
| Bergantung pada | open-play |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **High** |
| Branch disarankan | `feat/bracket-algorithm` |

Alasan effort: Masalah kombinatorik dengan banyak kasus tepi dan banyak contoh yang harus cocok. Perlu penalaran yang teliti. Effort high.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `bracket` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-b, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: Bracket Otomatis (seluruhnya, termasuk semua contoh); Setting Match dan Control Menu (Jeda antar ronde); Olahraga yang Didukung.
4. `backend/src/modules/bracket/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`brackets`, `bracket_rounds`, `bracket_matches`, `bracket_resting`).
6. `frontend/src/modules/bracket/README.md` dan halaman placeholder di `frontend/src/app/`.
7. `backend/src/modules/bracket/algorithm.ts` dan `bracket.test.ts` (kerangka dan daftar `it.todo` dari contoh proposal)

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Algoritma pembagian pemain ke lapangan dan ronde. Inti modul adalah fungsi murni di `algorithm.ts` yang diuji dengan contoh-contoh di proposal.

## Spesifikasi dari proposal

- Peserta: hanya pemain yang sudah join dan membayar. Kapasitas per ronde = jumlah lapangan × pemain per lapangan. Pemain istirahat = peserta − kapasitas, bergantian tiap ronde.
- Jumlah ronde = durasi total dibagi (durasi match + jeda), dibulatkan ke bawah.
- Prioritas main: pemain dengan jumlah main paling sedikit masuk lebih dulu. Selisih jumlah main antar pemain paling banyak satu match.
- Pasangan dan lawan dirotasi supaya tidak bertemu pasangan yang sama berulang. Jika durasi cukup untuk lebih dari satu siklus, siklus diulang dengan pasangan baru.
- Pemain per lapangan: badminton, tennis, padel tunggal 2 dan ganda 4 (dipilih Coach di setting match). Basket dan futsal tidak punya mode itu, yang dirotasi adalah tim.
- Basket: full court atau half court, jumlah pemain per sisi bebas diatur Coach. Contoh 15 pemain (3 tim × 5): pertandingan T1-T2, T1-T3, T2-T3, tiap tim istirahat sekali. Tepat 10 pemain: satu lapangan 5 lawan 5 dengan tim diacak ulang tiap ronde.
- Futsal: 25 pemain (5 tim × 5) di 2 lapangan: 20 main, 5 istirahat per ronde, 5 ronde, tiap pemain main 4 kali.
- Koreksi: Coach bisa mengubah susunan secara manual sebelum atau saat bracket berjalan. Ronde yang sudah berjalan tidak boleh berubah diam-diam.
- Contoh badminton ganda 3 lapangan 16 pemain: tiap ronde 12 main dan 4 istirahat, dalam 4 ronde tiap pemain main 3 kali dan istirahat sekali.

## Yang harus dikerjakan

### Database
Tabel `brackets`, `bracket_rounds`, `bracket_matches`, `bracket_resting` sudah ada. Tambah kolom versi/kunci ronde (`locked`) lewat migrasi baru bila perlu.

### Backend
- Isi `algorithm.ts`: `playersPerCourt`, `generateBracket`. Murni, tanpa database, deterministik dengan PRNG yang bisa diberi seed (untuk test). Saran pendekatan: urutkan kandidat berdasarkan jumlah main terkecil, tentukan yang istirahat dengan rotasi, lalu susun pasangan dengan meminimalkan frekuensi pasangan dan lawan yang sama (matriks hitung pasangan).
- Ubah semua `it.todo` di `bracket.test.ts` menjadi test nyata: kedelapan baris tabel "Contoh per cabang dan mode" ditambah properti umum (selisih main ≤ 1, tidak ada pemain di dua lapangan pada ronde yang sama, jumlah ronde sesuai rumus, pasangan tidak berulang selama masih ada kombinasi baru).
- `service.ts`: ambil peserta dari `createOpenPlayApi(ctx).listConfirmedParticipants`, simpan hasil ke tabel, `regenerate` (menambah versi), `editBracketMatch` (hanya ronde yang belum berjalan, validasi pemain valid dan tidak ganda).
- Ekspor `getBracketMatch(id)` untuk modul match (pemain per sisi).

### Frontend
- `/coach/open-play/[id]/bracket`: tampilkan ronde, lapangan, pemain, dan yang istirahat. Koreksi manual dengan alur pilih-lalu-tukar (tanpa library drag-and-drop dulu).
- `/open-play/[id]/schedule`: jadwal main untuk peserta (kapan main, di lapangan mana, lawan dan pasangan).

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- `createBracketApi(ctx).getBracketMatch(id)` (match, scoring butuh daftar pemain per sisi)

Yang kamu pakai dari modul lain:
- `createOpenPlayApi(ctx).listConfirmedParticipants`
- `createAccountsApi(ctx).getProfileSummaries`

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Perilaku bila peserta kurang dari kapasitas (lapangan tersisa kosong). Usul: pakai lapangan lebih sedikit dan beri peringatan ke Coach. Tulis di README dan tandai `TODO(decision)`.
- Sisa pemain yang tidak habis dibagi ukuran tim di basket dan futsal (pemain cadangan?). Belum diputuskan.
- Kalau Coach mengubah jumlah lapangan atau durasi di tengah acara.

## Di luar tugas ini

- Timer dan kontrol match (match).
- Skor (scoring).
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Seluruh contoh di proposal (8 baris tabel plus contoh badminton 16 pemain).
- Properti keadilan pada banyak kombinasi acak dengan seed tetap.
- Seed sama menghasilkan bracket sama.
- Edit manual menolak susunan yang tidak valid.

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

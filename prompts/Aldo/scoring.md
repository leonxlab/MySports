# Prompt: scoring

| | |
| --- | --- |
| Modul | `scoring`: Skor dan statistik |
| Pemilik | dev-c (Skor, device, dan AI olahraga tim) |
| Layer | backend + frontend |
| Fase | 2 |
| Bobot | 3 |
| Bergantung pada | match |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **High** |
| Branch disarankan | `feat/scoring-rules-and-events` |

Alasan effort: Banyak aturan per cabang, banyak kasus tepi, dan ada keputusan terbuka yang harus diberi asumsi eksplisit. Effort high.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `scoring` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-c, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: Scoring dan Statistik (seluruhnya); Olahraga yang Didukung; AI Detection dan Device Pairing; Pertanyaan Terbuka (nomor 4, 10, 11).
4. `backend/src/modules/scoring/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` (`score_events`, `fouls`, `player_match_stats`).
6. `frontend/src/modules/scoring/README.md` dan halaman placeholder di `frontend/src/app/`.
7. `backend/src/modules/scoring/rules/*.ts` (antarmuka `ScoreRules` dan stub lima cabang)
8. `contracts/detection-event.schema.json` dan `backend/src/modules/devices/schema.ts`
9. README modul `match` (dev-b)

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Menerima kejadian skor dari AI (sebagai usulan) dan dari Coach (manual), menerapkan aturan skor per cabang, dan menyajikan statistik. AI tidak menghitung skor, backend yang menghitung.

## Spesifikasi dari proposal

- Poin per game dihitung dari kejadian. Coach bisa menginput atau mengoreksi poin tiap peserta bila AI tidak menangkapnya.
- Kejadian dari AI masuk dengan `status = suggested`, Coach mengonfirmasi, mengoreksi, atau membatalkan lewat controller. Input manual masuk sebagai `source = manual`, `confirmed`. Kejadian AI idempoten dengan kunci `event_key` (= `event_id` dari yolo-service).
- Basket: tembakan masuk dihitung 2 atau 3 poin. AI hanya tahu bola masuk ring, jadi usulan: Coach memilih 2 atau 3 saat konfirmasi (pertanyaan terbuka nomor 10). Tim pencetak dikenali AI dari warna baju. Coach memilih pemain pencetak: saat home menyerang daftarnya pemain home, saat away menyerang daftarnya pemain away, diambil dari jadwal bracket. Statistik: poin per game, jumlah tembakan 2 poin dan 3 poin.
- Futsal: gol = 1 poin dari kejadian bola masuk gawang. Statistik poin per game. Jenis tendangan dan pencetak diinput Coach.
- Badminton: poin per rally dihitung dari kejadian kok jatuh di dalam atau di luar garis ditambah aturan rally. Statistik: poin per game, jumlah smash, lob, dan jenis pukulan lain (input Coach untuk yang tidak terdeteksi).
- Tennis dan padel: poin. Kejadian AI belum ditentukan (usulan: bola mendarat di dalam atau di luar garis seperti badminton). Padel tunggal memakai aturan dan lapangan yang sama dengan ganda (asumsi sementara).
- Aturan skor memakai nilai bawaan aplikasi dan bisa diganti Coach atau User lewat edit match (`matches.settings`). Penghitungan poin, game, dan set dikodekan di backend, bukan di AI.
- Pelanggaran dicatat Coach. Statistik per pemain per cabang dihitung dari kejadian yang `confirmed`/`corrected`.
- Saat koneksi kamera putus, Coach tetap bisa input manual. Cara memadukan skor manual dengan hasil AI yang menyusul belum diputuskan (nomor 4). Rancang data (`source`, `status`, `occurred_at_ms`) agar kebijakan itu bisa ditambahkan kelak, jangan mengarang kebijakan sekarang.

## Yang harus dikerjakan

### Database
Tabel `score_events`, `fouls`, `player_match_stats` sudah ada. Tambah indeks statistik per user dan cabang bila perlu (migrasi baru).

### Backend
- Isi `rules/*.ts` untuk lima cabang (`apply`, `isFinished`, `defaults`) murni dan dites. Untuk tennis, padel, badminton, rancang struktur game/set sesederhana mungkin yang cocok dengan proposal ("poin"), lalu tulis asumsinya di README dan tandai `TODO(decision)`.
- `service.ts`: `addScoreEvent`, `confirmScoreEvent` (opsi pilih 2/3 poin), `voidScoreEvent`, `setPlayerPoints`, `addFoul`, `getScoreboard`, `getMatchStats`, `getUserStats`.
- Ekspor `ingestSuggestedEvents(events)` untuk modul devices: validasi, dedup lewat `event_key`, simpan sebagai `suggested`, siarkan ke kanal `match:{id}`.
- Ekspor `getScoreSnapshot(matchId)` untuk match dan devices.

### Frontend
- `/match/[id]/result` (papan skor, statistik per pemain, tombol `GenerateHighlightButton` dari modul vip), `/stats` (statistik user per cabang).
- Komponen untuk control menu match: `ScorerPicker` (daftar menurut sisi yang menyerang), `ManualActionPanel` (jenis tendangan, shoot, pukulan), `FoulPanel`, `SuggestionQueue` (daftar usulan AI dengan tombol konfirmasi, ubah 2/3 poin, tolak).

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- `createScoringApi(ctx)`: `ingestSuggestedEvents`, `getScoreSnapshot`
- Komponen `ScorerPicker`, `ManualActionPanel`, `FoulPanel`, `SuggestionQueue` (dipakai halaman control menu match, dev-b)

Yang kamu pakai dari modul lain:
- `createMatchApi(ctx).getMatch`, `getMatchSettings` (dev-b)
- `createBracketApi(ctx).getBracketMatch` (dev-b)
- `createAccountsApi(ctx).getProfileSummaries`

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Struktur game dan set untuk badminton, tennis, padel (belum diputuskan).
- Pembeda basket 2/3 poin (usulan Coach memilih).
- Memadukan skor manual dengan hasil AI yang menyusul (nomor 4).
- Kejadian AI untuk tennis dan padel (nomor 11).

## Di luar tugas ini

- Pairing dan upload video (devices).
- Highlight sungguhan (VIP).
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- Tiap cabang: contoh urutan kejadian menghasilkan skor yang benar, termasuk setting yang diedit Coach menimpa bawaan.
- Basket: 2 dan 3 poin menambah tim yang benar.
- Idempotensi: event_key sama dua kali tidak menambah skor.
- Konfirmasi, koreksi, dan batalkan mengubah skor dengan benar.
- Statistik hanya menghitung kejadian confirmed/corrected.

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

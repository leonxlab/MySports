# Prompt: vip

| | |
| --- | --- |
| Modul | `vip`: VIP (coming soon) |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Layer | backend + frontend |
| Fase | 4 |
| Bobot | 1 |
| Bergantung pada | - |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | **Medium** |
| Branch disarankan | `feat/vip-coming-soon-markers` |

Alasan effort: Sedikit pekerjaan, tapi risiko kelepasan membangun fitur yang belum diputuskan. Effort medium dengan penekanan pada batas.

Salin semua yang ada di bawah garis ini sebagai pesan pertama sesi baru (satu modul per sesi).

---

Kamu bekerja di monorepo Open Play: backend Fastify + TypeScript (`backend/`), frontend Next.js (`frontend/`), layanan deteksi Python (`yolo-service/`), migrasi di `supabase/`. Tugasmu: mengerjakan modul `vip` sampai memenuhi definisi selesai di bawah. Pemilik modul ini adalah dev-a, dan kamu bekerja atas namanya.

## Baca dulu, berurutan

1. `rules.md`, wajib. Perhatikan bagian 3 (kepemilikan), 5 (aturan kode), 6 (database), 10 (definisi selesai).
2. `MODULES.md` dan `prompts/INTEGRATION.md`, untuk posisi modulmu dan titik temu dengan modul lain.
3. `docs/proposal.md`, bagian: VIP: Fitur Premium (Coming Soon); Profil dan Level (Badge VIP); Risiko dan Mitigasi (baris fitur VIP butuh video tersimpan).
4. `backend/src/modules/vip/README.md` dan kerangkanya (`routes.ts`, `service.ts`, `schema.ts`, `index.ts`).
5. Migrasi tabel modulmu di `supabase/migrations/` ((tidak ada)).
6. `frontend/src/modules/vip/README.md` dan halaman placeholder di `frontend/src/app/`.
7. `frontend/src/modules/vip/components/*.tsx` (tiga komponen sudah ada)

## Yang sudah ada di repo

- Kerangka backend: semua endpoint modul membalas 501 lewat `todo(...)`, cek akses sudah terpasang lewat `app.requireRole(...)`.
- Migrasi awal tabel modulmu (kerangka). Kalau perlu diubah, buat migrasi BARU. Jangan edit file migrasi yang sudah ada.
- Halaman frontend placeholder (`ModuleStub`) di route modulmu dan `api.ts` yang sudah menyebut tiap endpoint.
- Core: autentikasi dan role (`evaluateAccess`, dites), format error `AppError`, hook audit admin, `RealtimeHub`.
- Konvensi: modul lain hanya boleh dipanggil lewat `create<Modul>Api(ctx)` dari `index.ts`-nya (rules.md bagian 3).

## Tujuan

Hanya penanda antarmuka VIP yang nonaktif. Tugas ini sengaja kecil dan penuh larangan: tidak ada endpoint, tabel, atau alur bayar.

## Spesifikasi dari proposal

- Status VIP: belum diterapkan, infrastruktur sedang disiapkan. Paket VIP adalah paket fitur premium, isinya masih dipikirkan. Highlight pertandingan otomatis hanyalah salah satu kandidat.
- Yang ada sekarang hanya tiga penanda: Badge VIP di profil (belum ada pengguna yang memilikinya), tombol Langganan VIP di profil (nonaktif, berlabel Coming soon), tombol Generate Highlight di halaman hasil match (nonaktif, berlabel Coming soon).
- Tidak ada endpoint langganan atau fitur VIP, tidak ada tabel, tidak ada pembayaran. Tombol hanya menampilkan pesan Coming soon.
- Fitur VIP yang butuh klip tersimpan bertentangan dengan kebijakan menghapus video. Itu keputusan produk yang belum ada, jadi jangan disentuh.

## Yang harus dikerjakan

### Database
Tidak ada. Jangan membuat tabel.

### Backend
- Biarkan `routes.ts` kosong. Pastikan `GET /api/v1/vip/status` tetap 404 (sudah dites di `tests/app.test.ts`).
- Perbarui README modul: tabel keputusan yang belum ada (isi paket, harga, retensi klip, persetujuan pemain) sebagai daftar pertanyaan, bukan rencana implementasi.

### Frontend
- Rapikan tiga komponen: aksesibilitas (`aria-disabled`, teks alternatif), tooltip "Coming soon", gaya konsisten. Pastikan benar-benar tidak melakukan apa pun saat diklik.
- Integrasikan: `VipBadge` dan `VipSubscribeButton` ke halaman profil (modul accounts, dev-a sendiri), `GenerateHighlightButton` ke halaman hasil match `match/[id]/result` (modul scoring, dev-c). Untuk yang kedua, buka PR kecil dan minta review dev-c, jangan merge sendiri.

## Antarmuka dengan modul lain

Yang kamu sediakan untuk modul lain:
- Tiga komponen dari `frontend/src/modules/vip`

Yang kamu pakai dari modul lain:
- Halaman profil (accounts), halaman hasil match (scoring)

Kalau fungsi dari modul lain belum ada, jangan menulisnya sendiri di modul itu. Buat tipe atau tiruan sementara di sisimu, beri komentar `TODO(integration): menunggu <modul>.<fungsi>`, dan sebutkan di laporan.

## Keputusan yang belum final

Proposal belum memutuskan hal-hal ini. Jangan memutuskan sendiri. Implementasikan dengan asumsi sementara yang jelas, mudah diganti, dan tandai `TODO(decision): ...`:

- Seluruh isi paket VIP, harga, mekanisme langganan, retensi klip. Semua ditunda. Jangan menebak.

## Di luar tugas ini

- Endpoint, tabel, integrasi payment gateway, logika "apakah user VIP".
- Fitur highlight sungguhan.
- Menambah fitur yang tidak ada di proposal.
- Menyentuh modul orang lain tanpa review pemiliknya.

## Pengujian

- `npm run typecheck` dan `npm run build` frontend lolos.
- Tes backend yang memastikan `/api/v1/vip/status` 404 masih lolos.

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

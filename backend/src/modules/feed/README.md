# Modul feed: Halaman utama dan personalisasi

Dua jalur: feed personal berbasis sinyal dan menu jelajah global. Pemeringkat deterministik memberi skor serta alasan yang dapat dibaca.

| | |
| --- | --- |
| Pemilik | Leon (dev-a) |
| Fase | 1 |
| Prefix API | `/api/v1/feed` |
| Bergantung pada | accounts, open-play, community, venues |
| Tabel | `user_signals`, `content_classification` |

## Endpoint

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| GET | `/home` | Feed personal dengan filter dan cursor pagination | login |
| GET | `/explore` | Konten global terbaru dengan filter dan cursor pagination | publik |
| POST | `/signals` | Catat sinyal pencarian, lihat, posting, atau join | login |

Filter yang tersedia: cabang, jenis konten, format, dan radius (memerlukan koordinat lokasi). Lokasi browser hanya dikirim saat pengguna meminta dan tidak disimpan sebagai sinyal.

## Pemeringkat

Fungsi murni di `ranking.ts` memakai bobot awal tunggal: kecocokan cabang 12, topik 8, pencarian 10, kebaruan 12, dan kedekatan 20. Nilai sinyal cabang/topik dibatasi tiga hit agar riwayat yang panjang tidak mendominasi. Respons personal menyertakan alasan skor.

**TODO(decision):** tim perlu menyetujui bobot awal dan kebijakan penghapusan/reset riwayat sinyal. Klasifikasi menyimpan jenis, format, lokasi, dan rentang Level, tetapi Level belum memengaruhi ranking sampai `level.getLevelSummary` tersedia. Format konten campuran foto/video dibiarkan kosong sampai aturan klasifikasinya diputuskan.

## Integrasi

- Mengekspos `classifyContent(input)` dan `recordSignal(userId, input)` lewat `createFeedApi(ctx)`.
- Community threads dibaca lewat `createCommunityApi(ctx)` dan diklasifikasikan otomatis bila belum memiliki klasifikasi.
- **TODO(integration):** gabungkan open play dan venue setelah `createOpenPlayApi`/`createVenuesApi` menyediakan daftar konten yang sesuai.
- Item tanpa koordinat tidak disertakan saat filter radius aktif; sumber open play/venue perlu mengirim lokasi untuk mendukung filter jarak.

## Migrasi dan status

Migrasi awal mengaktifkan RLS pada kedua tabel. Migrasi `20261109150000_feed_search_indexes_and_location.sql` menambah koordinat konten, constraint lokasi/rentang Level, dan index sinyal/klasifikasi.

- [x] Skema validasi, service, route, dan pemeringkat murni
- [x] Feed personal dan explore berbasis thread komunitas
- [x] Halaman home/explore, filter, lokasi opsional, cursor pagination
- [ ] Integrasi sumber open play dan venue (API modul belum tersedia)
- [ ] Gunakan ringkasan Level untuk ranking

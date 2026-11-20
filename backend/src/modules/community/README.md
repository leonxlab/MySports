# Modul community: Community discussion

Thread diskusi per cabang olahraga, balasan, media, laporan pengguna, dan moderasi.

| | |
| --- | --- |
| Pemilik | Leon (dev-a) |
| Fase | 1 |
| Prefix API | `/api/v1/community` |
| Bergantung pada | accounts, feed (integrasi klasifikasi/sinyal menunggu API feed) |
| Tabel | `threads`, `thread_posts`, `content_reports` |
| Bucket | `media` (privat; upload signed URL, maksimal 50 MB per file) |

## Endpoint

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| GET | `/threads` | Daftar thread dengan filter `sport`, `limit`, dan `cursor` | publik |
| POST | `/threads` | Buat thread; media hanya boleh memakai path signed upload milik pengguna | login |
| GET | `/threads/:id` | Detail thread dan sampai 100 balasan terbaru secara kronologis | publik |
| POST | `/threads/:id/posts` | Balas thread | login |
| POST | `/media/sign` | Minta signed upload URL; `file_name`, `content_type`, dan `file_size` divalidasi | login |
| POST | `/reports` | Laporkan thread atau balasan (maksimal 10 laporan/jam) | login |
| GET | `/reports` | Antrean laporan berpaginasi; filter status | admin |
| POST | `/reports/:id/resolve` | Selesaikan/tolak laporan dan opsional sembunyikan target | admin |

Pembuatan thread dibatasi 5 per pengguna per jam dan laporan dibatasi 10 per pengguna per jam. **TODO(decision):** konfirmasi nilai batas awal tersebut dengan tim produk. Database membatasi satu laporan per pengguna/target. Isi thread dan balasan dibatasi 5.000 karakter; judul 120 karakter; setiap konten maksimal 10 media. Signed URL berlaku mengikuti konfigurasi Supabase Storage. Bucket `media` sudah dibatasi 50 MB pada migrasi fondasi.

## Integrasi

- Ringkasan penulis diambil melalui `createAccountsApi(ctx).getProfileSummaries`.
- Mengekspos `countOpenReports()` dan `listRecentThreads({ sport?, limit? })` melalui `createCommunityApi(ctx)`.
- **TODO(integration):** panggil `createFeedApi(ctx).classifyContent` untuk thread baru serta `recordSignal` untuk pembuatan, balasan, dan pembacaan thread setelah API feed tersedia. Saat ini service feed masih kerangka.
- Lokasi tidak diminta saat membuat thread; klasifikasi lokasi belum tersedia karena skema thread tidak memiliki lokasi.

## Migrasi dan validasi

Migrasi awal membuat RLS aktif. Migrasi `20261109141500_community_moderation_indexes.sql` menambah kolom `hidden`, batas panjang, index paginasi, dan unique index laporan. Konten tersembunyi tidak disertakan dalam daftar publik maupun balasan.

## Status

- [x] Skema input dan validasi media
- [x] Service, route, rate limit, paginasi, laporan dan moderasi
- [x] Test service dan akses endpoint publik
- [x] Halaman komunitas, thread, pembuatan thread, antrean laporan admin
- [x] README dan status modul
- [ ] Integrasi klasifikasi/sinyal feed (menunggu API feed)

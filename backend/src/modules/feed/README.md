# Modul feed: Halaman utama dan personalisasi

Dua jalur: 'Let me choose for you' (dari pencarian, open play yang diikuti, topik komunitas, lokasi) dan menu global semua cabang. Konten diklasifikasi otomatis (cabang, jenis, format, lokasi, level).

| | |
| --- | --- |
| Pemilik | dev-a (platform) |
| Fase | 1 |
| Prefix API | `/api/v1/feed` |
| Bergantung pada | accounts, open-play, community |
| Tabel | `user_signals`, `content_classification` |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| GET | `/home` | Feed 'Let me choose for you' | login |
| GET | `/explore` | Menu global semua cabang (tanpa personalisasi, bisa difilter) | publik |
| POST | `/signals` | Catat sinyal kebiasaan (pencarian, lihat, join) | login |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_feed.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/feed`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

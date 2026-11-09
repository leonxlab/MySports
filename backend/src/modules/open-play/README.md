# Modul open-play: Open play dan slot

Coach membuat open play dan mengatur slot (kuota, jam, harga). User mencari berdasarkan jarak, join, dan bayar. Coach mencari member.

| | |
| --- | --- |
| Pemilik | dev-b (Open play end-to-end) |
| Fase | 1 |
| Prefix API | `/api/v1/open-play` |
| Bergantung pada | accounts, venues, payments |
| Tabel | `open_plays`, `open_play_participants` |

## Aturan

- **Coach wajib membayar sewa lapangan:** open play hanya bisa dibuat (atau jamnya diubah) bila Coach punya `court_bookings` berstatus `confirmed` yang menutup seluruh jam di court itu (`COURT_NOT_BOOKED`). Dua open play tidak boleh bertabrakan di court yang sama.
- **Kuota atomik:** join, batal, dan konfirmasi memakai fungsi SQL yang mengunci baris open play. Kursi `pending_payment` ditahan 15 menit (`TODO(decision)`), lalu dilepas pada join berikutnya. Open play berstatus `full` otomatis saat kursi (termasuk yang menunggu bayar) habis.
- **Gratis:** harga 0 langsung `confirmed` tanpa checkout.
- **Dana:** pembayaran lunas dikonfirmasi lewat `payments.onPaid("open_play")`; dana diteruskan ke Coach saat status open play menjadi `finished` (`TODO(decision)`).
- **Refund belum diputuskan:** batal setelah membayar dan membatalkan open play yang sudah punya peserta berbayar ditolak 409 `REFUND_POLICY_UNDECIDED`. Bila pembayaran lunas tapi kursi sudah dilepas dan penuh, pembayaran tetap `paid` dan tidak diteruskan.
- Fungsi lintas modul: `listConfirmedParticipants`, `getOpenPlay`, `listNearby`, `countPending`. Level member sementara `0` (`TODO(integration)`).

## Endpoint

Semua endpoint backend sudah berjalan. Frontend belum. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| GET | `/` | Cari open play berdasarkan jarak, cabang, tanggal | publik |
| GET | `/members/search` | Coach mencari pemain | coach |
| GET | `/members/:userId` | Info lengkap member (nama, umur, pengalaman, Level, galeri) | coach |
| GET | `/:id` | Detail open play | publik |
| POST | `/` | Buat open play | coach |
| PATCH | `/:id` | Setting slot: kuota, jam, harga, status | coach |
| POST | `/:id/join` | Join dan mulai pembayaran | login |
| DELETE | `/:id/join` | Batal join | login |
| GET | `/:id/participants` | Peserta terkonfirmasi | coach |

## Checklist

- [x] Migrasi: `20261109000300_open_play_atomic.sql` (`open_play_join`, `open_play_leave`, `open_play_confirm`). Belum dijalankan dengan `supabase db reset` (Docker tidak ada di sesi ini)
- [x] `schema.ts` untuk input
- [x] `service.ts`, `rules.ts` dan test dengan Supabase tiruan (fungsi SQL kuota belum dites terhadap database sungguhan)
- [x] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/open-play`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

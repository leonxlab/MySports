# Modul role-requests: Pengajuan Coach dan Owner Lapangan

User mengajukan diri jadi Coach (bukti pengalaman: teks, gambar, video, URL) atau Owner Lapangan. Admin menyetujui atau menolak.

| | |
| --- | --- |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Fase | 1 |
| Prefix API | `/api/v1/role-requests` |
| Bergantung pada | accounts |
| Tabel | `role_requests`, `user_roles (tulis lewat accounts)` |

## Endpoint

Endpoint pengajuan dan peninjauan aktif. Coach dapat menyertakan bukti teks, URL, foto, dan video. Foto/video diunggah lewat signed URL akun ke bucket `media`, lalu path-nya dikirim sebagai bukti.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| POST | `/coach` | Ajukan jadi Coach dengan bukti pengalaman dan prestasi | login |
| POST | `/owner` | Ajukan jadi Owner Lapangan | login |
| GET | `/mine` | Status pengajuan milik sendiri | login |
| GET | `/` | Daftar pengajuan dengan filter status dan cursor | admin |
| POST | `/:id/approve` | Setujui pengajuan (memberi role) | admin |
| POST | `/:id/reject` | Tolak pengajuan dengan alasan | admin |

`GET /` menerima `status` (`pending`, `approved`, `rejected`), `limit` (1–100), dan `cursor` opsional. `POST /coach` menerima `evidence` (1–10 item; teks maksimal 2000 karakter, URL valid, media path milik pemohon) dan `note` opsional. `POST /owner` menerima `note` opsional. Penolakan menerima `{ "reason": "..." }`.

Hanya satu pengajuan `pending` per user dan role yang diizinkan oleh partial unique index. Persetujuan menggunakan perubahan status compare-and-set; role diberikan melalui `createAccountsApi(ctx).grantRole`. Jika pemberian role gagal, service berusaha mengembalikan pengajuan ke `pending` dan meneruskan error.

Admin list response menambahkan `applicant` dari `accounts.getProfileSummaries`; bukti foto/video dikembalikan sebagai signed read URL satu jam.

## Checklist

- [x] Partial unique index pending per user/role dan kolom alasan penolakan
- [x] `schema.ts` untuk bukti, filter, cursor, dan alasan penolakan
- [x] `service.ts` dan test submit, approve, reject, serta pencegahan proses ganda
- [x] Semua route pada tabel endpoint
- [x] Frontend: formulir coach/owner, status pengajuan, dan persetujuan admin
- [x] README ini diperbarui, status di `MODULES.md` diubah

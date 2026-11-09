# Modul admin: Dasbor admin dan audit log

Dasbor ringkasan dan audit log tindakan admin. Layar persetujuan, biaya, moderasi, dan anti-cheat tinggal di modul pemiliknya. Admin tampil sebagai user biasa bagi pengguna lain.

| | |
| --- | --- |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Fase | 1 |
| Prefix API | `/api/v1/admin` |
| Bergantung pada | role-requests, venues, payments, community, level |
| Tabel | `admin_audit_log` |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| GET | `/overview` | Jumlah pengajuan, lapangan, dan laporan yang menunggu | admin |
| GET | `/audit-log` | Log tindakan admin | admin |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_admin.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/admin`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

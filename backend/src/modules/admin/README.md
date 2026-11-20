# Modul admin: Dasbor admin dan audit log

Dasbor ringkasan dan audit log tindakan admin. Layar persetujuan, biaya, moderasi, dan anti-cheat tinggal di modul pemiliknya. Admin tampil sebagai user biasa bagi pengguna lain.

|                 |                                                   |
| --------------- | ------------------------------------------------- |
| Pemilik         | dev-a (Identitas, komunitas, dan admin)           |
| Fase            | 1                                                 |
| Prefix API      | `/api/v1/admin`                                   |
| Bergantung pada | role-requests, venues, payments, community, level |
| Tabel           | `admin_audit_log`                                 |

## Endpoint

Endpoint ringkasan hanya menghitung laporan komunitas secara langsung. Integrasi hitungan modul
role-requests, venues, dan level menunggu API pemilik modul tersedia; nilai tersebut saat ini `0`.

| Method | Path         | Fungsi                                                               | Akses |
| ------ | ------------ | -------------------------------------------------------------------- | ----- |
| GET    | `/overview`  | Jumlah pengajuan, lapangan, dan laporan yang menunggu                | admin |
| GET    | `/audit-log` | Log tindakan admin dengan filter admin/tanggal dan cursor pagination | admin |

## Checklist

- [x] Migrasi audit log dan indeks pagination
- [x] `schema.ts`, `service.ts`, dan validasi input
- [x] `routes.ts` dan pemeriksaan akses admin
- [x] Frontend dasbor dan audit log
- [ ] Tes service, pagination, dan pencatatan audit
- [ ] Integrasi ringkasan role-requests, venues, dan anti-cheat saat API tersedia

Audit log mencatat endpoint ber-role yang berhasil mengubah data melalui hook auth. Permintaan
GET dan permintaan gagal tidak dicatat.

# Modul accounts: Akun dan profil

Profil pemain (nama, usia, pengalaman per cabang, foto, galeri) dan role. Login/signup lewat Supabase Auth; backend membuat profil setelah signup.

| | |
| --- | --- |
| Pemilik | dev-a (platform) |
| Fase | 1 |
| Prefix API | `/api/v1/accounts` |
| Bergantung pada | tidak ada |
| Tabel | `profiles`, `user_roles`, `profile_sport_experience`, `profile_gallery` |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| POST | `/bootstrap` | Buat profil dan role user setelah signup Supabase Auth | login |
| GET | `/me` | Profil sendiri beserta role dan Level | login |
| PATCH | `/me` | Ubah nama, usia, bio, foto | login |
| GET | `/:id` | Profil publik pemain lain (admin tampil sebagai user biasa) | login |
| PUT | `/me/experience/:sport` | Isi pengalaman bermain per cabang | login |
| POST | `/me/gallery` | Tambah foto, video, atau quote ke galeri | login |
| DELETE | `/me/gallery/:itemId` | Hapus item galeri | login |
| POST | `/me/photo/sign` | Minta signed URL upload foto profil | login |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_accounts.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/accounts`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

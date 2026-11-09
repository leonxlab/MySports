# Modul accounts: Akun dan profil

Profil pemain (nama, usia, pengalaman per cabang, foto, galeri) dan role. Login/signup lewat Supabase Auth; backend membuat profil setelah signup.

| | |
| --- | --- |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Fase | 1 |
| Prefix API | `/api/v1/accounts` |
| Bergantung pada | tidak ada |
| Tabel | `profiles`, `user_roles`, `profile_sport_experience`, `profile_gallery` |

## Endpoint

Endpoint bootstrap, profil sendiri, dan profil publik sudah aktif. Endpoint lain masih `501 NOT_IMPLEMENTED`.

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
- [x] Skema bootstrap
- [x] Service bootstrap, baca profil, role, dan ringkasan profil untuk modul lain
- [x] `POST /bootstrap`, `GET /me`, dan `GET /:id`
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/accounts`
- [x] README ini diperbarui, status di `MODULES.md` diubah

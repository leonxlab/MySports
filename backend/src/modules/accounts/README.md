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

Semua endpoint pada tabel ini aktif. Upload media menggunakan signed URL Storage; file tidak dikirim melalui backend.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| POST | `/bootstrap` | Buat profil dan role user setelah signup Supabase Auth | login |
| GET | `/me` | Profil sendiri beserta role dan Level | login |
| PATCH | `/me` | Ubah nama, usia, bio, foto | login |
| GET | `/:id` | Profil publik pemain lain (admin tampil sebagai user biasa) | login |
| PUT | `/me/experience/:sport` | Isi pengalaman bermain per cabang | login |
| POST | `/me/gallery/sign` | Minta signed URL untuk foto/video galeri | login |
| POST | `/me/gallery` | Tambah foto, video, atau quote ke galeri | login |
| DELETE | `/me/gallery/:itemId` | Hapus item galeri | login |
| POST | `/me/photo/sign` | Minta signed URL upload foto profil | login |

`POST /me/photo/sign` menerima `file_name` dan `content_type` gambar. `POST /me/gallery/sign` menerima gambar atau video. Keduanya mengembalikan `path`, `token`, dan `signedUrl`; klien mengunggah langsung ke bucket `media`, lalu menyimpan `path` pada profil atau galeri. Foto dan media profil dibaca melalui URL bertanda tangan yang kedaluwarsa setelah satu jam.

`PATCH /me` menerima satu atau lebih dari `display_name`, `age`, `bio`, dan `photo_path`. Path foto harus berada di direktori user yang sedang login. Pengalaman menerima `years` dan/atau `notes`. Galeri menerima `{ "kind": "quote", "quote_text": "..." }`, atau `{ "kind": "photo" | "video", "storage_path": "..." }`; media harus berada dalam direktori pemilik.

## Checklist

- [x] Migrasi awal untuk profil, role, pengalaman, dan galeri
- [x] Skema bootstrap
- [x] Service bootstrap, baca/ubah profil, pengalaman, galeri, signed upload, role, dan ringkasan profil
- [x] Semua endpoint di tabel diimplementasikan
- [x] Frontend: profil sendiri, profil publik, edit profil, pengalaman, dan galeri
- [x] README ini diperbarui, status di `MODULES.md` diubah

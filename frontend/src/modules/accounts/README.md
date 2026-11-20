# Frontend modul accounts

Backend: `backend/src/modules/accounts/README.md`. Hanya tampilan, tanpa aturan bisnis.

Halaman:

- `/login`: Login dengan Google melalui Supabase Auth
- `/register`: Daftar
- `/profile`: Profil saya
- `/profile/[id]`: Profil pemain
- `/profile/edit`: Ubah profil

`SessionProvider` dan `useMe()` diekspor dari modul ini. Provider dipasang di root layout; hook memberi status sesi, profil, loading, error, dan fungsi refresh. Saat sesi aktif belum memiliki profil atau role user hilang, provider membuatnya lewat endpoint bootstrap.

Profil mendukung ubah nama, usia, bio, foto, pengalaman per cabang, dan item galeri. Foto/video diunggah langsung ke bucket `media` memakai signed upload URL dari backend; API hanya menerima path storage dan tidak menerima isi file.

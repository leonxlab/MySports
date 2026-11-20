# Frontend modul community

Backend: `backend/src/modules/community/README.md`. Komponen hanya mengelola tampilan dan aksi; aturan validasi bisnis tetap di backend.

| Route | Fungsi |
| --- | --- |
| `/community` | Daftar thread publik, filter cabang, cursor pagination |
| `/community/[id]` | Thread, balasan, laporan konten |
| `/community/new` | Buat thread, unggah media, tampilkan progres |
| `/admin/reports` | Antrean dan tindakan moderasi admin |

Media diunggah langsung ke bucket privat `media` melalui signed URL backend. Browser membatasi ukuran file hingga 50 MB dan menggunakan XHR untuk progres upload. Semua isi thread dirender sebagai teks biasa.

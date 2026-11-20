# Frontend modul feed

Backend: `backend/src/modules/feed/README.md`. Frontend menampilkan hasil backend tanpa menghitung skor.

| Route | Fungsi |
| --- | --- |
| `/` | Tab feed personal “Let me choose for you” dan jelajah global |
| `/explore` | Jelajah global tanpa personalisasi |

Filter mencakup cabang olahraga, jenis konten, format, dan radius setelah pengguna secara eksplisit meminta akses lokasi. Jika izin lokasi ditolak, filter lain tetap berfungsi. Lokasi tidak ditulis ke riwayat sinyal.

Saat ini feed berisi thread komunitas. Sumber open play dan lapangan menunggu API dari pemilik modul.

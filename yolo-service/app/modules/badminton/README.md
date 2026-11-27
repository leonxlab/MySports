# Detektor badminton

Kok jatuh di dalam atau di luar garis.

Event: `ball_landed`. AI hanya mengusulkan kejadian, Coach mengonfirmasi lewat controller, aturan poin ada di backend.

## Model lokal

- Source lokal berada di `yolo-service/vendor/Yolo-and-TrackNet-Badminton-Analysis-main/`.
- Worker memakai `Track_Model/yolo11/best.pt` melalui Ultralytics; checkpoint tidak masuk Git (aturan `.gitignore`).
- Docker Compose memasang folder bobot secara read-only. Untuk worker di luar Compose, set `BADMINTON_YOLO_DIR` ke folder `Track_Model/yolo11`.
- Pemilik workspace menyatakan memiliki izin untuk memakai salinan lokal. File lisensi upstream belum disertakan; pastikan syarat redistribusi sebelum mempublikasikan atau membagikan image berisi bobot.
- Jalur TrackNet di source tersedia, tetapi implementasi service saat ini memakai checkpoint YOLO11.

## Alur dan batasan

- Kamera menyimpan kalibrasi sisi sendiri setelah consent; backend menggabungkan kalibrasi home/away dan mengunci layout yang dipilih pertama.
- YOLO mendeteksi kelas bernama `shuttle`, `shuttlecock`, atau `ball`. Bila checkpoint tidak memiliki kelas tersebut, `load()` gagal dengan daftar kelas yang ditemukan.
- Landing masih heuristik: lintasan harus bergerak setidaknya 0.75 m, lalu empat deteksi berurutan menetap dalam radius 0.18 m selama minimal 180 ms. Coach wajib mengonfirmasi event sebelum skor berubah.
- Atribusi `side` menganggap kamera `home`/`away` berada di baseline sisi tersebut; setengah dekat/jauh dari homografi dipetakan ke tim itu. Coach tetap harus meninjau dan mengoreksi bila kamera dipasang dari samping.
- Ambang heuristik belum divalidasi terhadap klip badminton berlabel. Nilai ini sementara dan perlu dikalibrasi dari pertandingan.

## Checklist

- [x] Integrasi lokal checkpoint YOLO11 tanpa mengambil ulang dari GitHub
- [x] `process()` menghasilkan usulan `ball_landed` deterministik dari lintasan yang menetap
- [x] Test logika landing dan event sintetis
- [ ] Verifikasi nama kelas dan inferensi checkpoint pada GPU
- [ ] Uji klip berlabel, ukur precision/recall landing dan kesalahan in/out
- [ ] Catat benchmark FPS dan memori GPU di `docs/benchmarks.md`

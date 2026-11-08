# MODULES.md

Daftar modul, pemilik, dan status. Ubah baris yang kamu kerjakan di PR yang sama dengan kodenya.

Status: `belum mulai` → `jalan` (sebagian endpoint) → `selesai` (memenuhi definisi selesai di rules.md bagian 10).

Pembagian awal hanya usulan supaya beban kira-kira seimbang: **dev-a** memegang modul platform (akun sampai komunitas), **dev-b** memegang match dan AI. Di Fase 3 dev-a ikut mengerjakan detektor badminton, tennis, dan padel karena modul platform sudah stabil. Mau tukar? Ubah tabel ini dan `.github/CODEOWNERS` dalam satu PR.

## Modul aplikasi (backend + frontend)

| Modul | Fitur | Fase | Pemilik | Bergantung pada | Status |
| --- | --- | --- | --- | --- | --- |
| accounts | Akun dan profil | 1 | dev-a | - | belum mulai |
| role-requests | Pengajuan Coach dan Owner Lapangan | 1 | dev-a | accounts | belum mulai |
| venues | Lapangan | 1 | dev-a | accounts, role-requests | belum mulai |
| open-play | Open play dan slot | 1 | dev-a | accounts, venues, payments | belum mulai |
| payments | Booking dan pembayaran | 1 | dev-a | accounts | belum mulai |
| equipment | Sewa alat | 4 | dev-a | accounts, payments | belum mulai |
| bracket | Bracket otomatis | 2 | dev-b | open-play | belum mulai |
| match | Setting match dan control menu | 2 | dev-b | bracket | belum mulai |
| scoring | Skor dan statistik | 2 | dev-b | match | belum mulai |
| devices | Device dan deteksi AI | 3 | dev-b | match, scoring | belum mulai |
| level | Level dan jam main | 3 | dev-b | devices | belum mulai |
| community | Community discussion | 1 | dev-a | accounts | belum mulai |
| feed | Halaman utama dan personalisasi | 1 | dev-a | accounts, open-play, community | belum mulai |
| vip | VIP (coming soon) | 4 | dev-a | - | belum mulai |
| admin | Dasbor admin dan audit log | 1 | dev-a | role-requests, venues, payments, community, level | belum mulai |

## Modul yolo-service (`yolo-service/app/modules/`)

| Modul | Tugas | Pemilik | Status |
| --- | --- | --- | --- |
| basketball | Bola masuk ring. Pembeda 2/3 poin belum tercakup (pertanyaan terbuka #10) | dev-b | belum mulai |
| futsal | Bola masuk gawang (gol) | dev-b | belum mulai |
| badminton | Kok jatuh di dalam atau di luar garis | dev-a | belum mulai |
| tennis | Bola mendarat di dalam atau di luar garis (usulan, belum diputuskan) | dev-a | belum mulai |
| padel | Bola mendarat di dalam atau di luar garis (usulan, belum diputuskan) | dev-a | belum mulai |
| play_activity | Menit main nyata (orang + bola) untuk Level | dev-b | belum mulai |
| anti_cheat | Deteksi rekaman diputar ulang dan pola gerak identik | dev-b | belum mulai |
| calibration | Titik ring, gawang, dan garis dari Coach | dev-b | belum mulai |
| jobs | Worker: ambil segmen dari antrean, proses, kirim event, hapus segmen | dev-b | belum mulai |

## Urutan kerja dan gate

| Fase | Modul | Gate untuk lanjut |
| --- | --- | --- |
| 1 Fondasi | accounts, role-requests, venues, open-play, payments, community, feed, admin, vip (badge saja) | Open play pertama berjalan dengan pembayaran |
| 2 Match manual | bracket, match, scoring (input manual) | Coach menjalankan open play penuh secara manual |
| 3 AI detection | devices, level, scoring (event AI), semua modul yolo-service | Akurasi skor lolos uji di lapangan |
| 4 Ekspansi | equipment, app mobile, personalisasi, VIP | - |

Modul yang tidak saling bergantung bisa jalan paralel. Dalam Fase 1, titik temu pertama adalah `accounts` (semua butuh login dan role), jadi selesaikan itu lebih dulu dan merge cepat. Setelah itu dev-a dan dev-b bisa mulai bersamaan: dev-a di `venues`/`payments`, dev-b menyiapkan `bracket/algorithm.ts` dan `level/service.ts` yang berupa fungsi murni dan tidak butuh yang lain.

## Cara mengambil modul

1. Buat issue dengan template "Tugas modul" (label `mod:<nama>`), tetapkan dirimu sebagai assignee.
2. Branch `feat/<modul>-<hal>` dari `main`.
3. Hapus `todo(...)` endpoint satu per satu sambil mengisi `service.ts` dan test.
4. Perbarui README modul dan baris di file ini, buka PR.

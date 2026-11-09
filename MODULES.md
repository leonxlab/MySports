# MODULES.md

Daftar modul, pemilik, dan status. Ubah baris yang kamu kerjakan di PR yang sama dengan kodenya.

Status: `belum mulai` → `jalan` (sebagian endpoint) → `selesai` (memenuhi definisi selesai di rules.md bagian 10).

## Pembagian untuk empat orang

Tiap orang memegang satu **jalur**: gabungan modul yang saling dekat secara alur fitur, lengkap dari backend, frontend, sampai sisi YOLO bila ada. Pembagian per fitur (bukan per lapisan) dipilih supaya satu orang bisa menyelesaikan satu fitur dari ujung ke ujung tanpa menunggu orang lain untuk bentuk API-nya. Bobot: kecil = 1, sedang = 2, besar = 3. Setiap jalur berbobot 13 dari total 52.

| Orang | Jalur | Bobot | Modul aplikasi | Modul YOLO |
| --- | --- | --- | --- | --- |
| Leon (dev-a) | Identitas, komunitas, dan admin | 13 | accounts, role-requests, community, feed, admin, vip | jobs, anti_cheat |
| Jonathan (dev-b) | Open play end-to-end | 13 | venues, open-play, payments, bracket, match, equipment | - |
| Aldo (dev-c) | Skor, device, dan AI olahraga tim | 13 | scoring, devices | calibration, basketball, futsal |
| Eugene (dev-d) | AI olahraga raket, Level, dan fondasi UI | 13 | level | badminton, tennis, padel, play_activity |

Mau tukar modul? Ubah tabel ini, `.github/CODEOWNERS`, dan baris `Pemilik` di README modul dalam satu PR kecil.

Titik temu antar jalur (siapa menyediakan apa untuk siapa) ada di [`prompts/INTEGRATION.md`](prompts/INTEGRATION.md).

### Leon (dev-a): Identitas, komunitas, dan admin (bobot 13)

Semua yang berhubungan dengan siapa penggunanya, apa yang mereka bagikan, dan siapa yang mengawasi. Ditambah dua modul YOLO yang paling mandiri: worker dan anti-cheat.

Prompt pembuka: [`prompts/Leon/00-kickoff.md`](prompts/Leon/00-kickoff.md)

| Modul | Isi | Layer | Fase | Bobot | Effort AI | Bergantung pada | Prompt | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| accounts | Akun dan profil | backend + frontend | 1 | 2 | Medium | - | [prompt](prompts/Leon/accounts.md) | jalan |
| role-requests | Pengajuan Coach dan Owner Lapangan | backend + frontend | 1 | 1 | Medium | accounts | [prompt](prompts/Leon/role-requests.md) | belum mulai |
| community | Community discussion | backend + frontend | 1 | 2 | Medium | accounts | [prompt](prompts/Leon/community.md) | belum mulai |
| feed | Halaman utama dan personalisasi | backend + frontend | 1 | 2 | Medium | accounts, open-play, community | [prompt](prompts/Leon/feed.md) | belum mulai |
| admin | Dasbor admin dan audit log | backend + frontend | 1 | 1 | Medium | role-requests, venues, payments, community, level | [prompt](prompts/Leon/admin.md) | belum mulai |
| vip | VIP (coming soon) | backend + frontend | 4 | 1 | Medium | - | [prompt](prompts/Leon/vip.md) | belum mulai |
| jobs | Worker: ambil segmen dari antrean, proses, kirim event, hapus segmen | yolo-service | 3 | 2 | Medium | - | [prompt](prompts/Leon/jobs.md) | belum mulai |
| anti_cheat | Deteksi rekaman diputar ulang dan pola gerak identik | yolo-service | 3 | 2 | High | - | [prompt](prompts/Leon/anti-cheat.md) | belum mulai |

### Jonathan (dev-b): Open play end-to-end (bobot 13)

Jalur Coach dan uang: dari lapangan, open play, pembayaran, sampai bracket dan jalannya match.

Prompt pembuka: [`prompts/Jonathan/00-kickoff.md`](prompts/Jonathan/00-kickoff.md)

| Modul | Isi | Layer | Fase | Bobot | Effort AI | Bergantung pada | Prompt | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| venues | Lapangan | backend + frontend | 1 | 2 | Medium | accounts, role-requests | [prompt](prompts/Jonathan/venues.md) | sedang dikerjakan (branch belum merge) |
| open-play | Open play dan slot | backend + frontend | 1 | 2 | High | accounts, venues, payments | [prompt](prompts/Jonathan/open-play.md) | sedang dikerjakan (branch belum merge) |
| payments | Booking dan pembayaran | backend + frontend | 1 | 3 | High | accounts | [prompt](prompts/Jonathan/payments.md) | sedang dikerjakan (branch belum merge) |
| bracket | Bracket otomatis | backend + frontend | 2 | 3 | High | open-play | [prompt](prompts/Jonathan/bracket.md) | sedang dikerjakan (branch belum merge) |
| match | Setting match dan control menu | backend + frontend | 2 | 2 | Medium | bracket | [prompt](prompts/Jonathan/match.md) | sedang dikerjakan (branch belum merge) |
| equipment | Sewa alat | backend + frontend | 4 | 1 | Medium | accounts, payments | [prompt](prompts/Jonathan/equipment.md) | belum mulai |

### Aldo (dev-c): Skor, device, dan AI olahraga tim (bobot 13)

Dari kamera sampai skor: pairing device, upload video, event AI, aturan skor per cabang, dan detektor basket serta futsal.

Prompt pembuka: [`prompts/Aldo/00-kickoff.md`](prompts/Aldo/00-kickoff.md)

| Modul | Isi | Layer | Fase | Bobot | Effort AI | Bergantung pada | Prompt | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| scoring | Skor dan statistik | backend + frontend | 2 | 3 | High | match | [prompt](prompts/Aldo/scoring.md) | belum mulai |
| devices | Device dan deteksi AI | backend + frontend | 3 | 3 | High | match, scoring | [prompt](prompts/Aldo/devices.md) | belum mulai |
| calibration | Titik ring, gawang, dan garis dari Coach | yolo-service | 3 | 1 | Medium | - | [prompt](prompts/Aldo/calibration.md) | belum mulai |
| basketball | Bola masuk ring. Pembeda 2/3 poin belum tercakup (pertanyaan terbuka #10) | yolo-service | 3 | 3 | High | - | [prompt](prompts/Aldo/basketball.md) | belum mulai |
| futsal | Bola masuk gawang (gol) | yolo-service | 3 | 3 | High | - | [prompt](prompts/Aldo/futsal.md) | belum mulai |

### Eugene (dev-d): AI olahraga raket, Level, dan fondasi UI (bobot 13)

Detektor badminton, tennis, padel; menit main dan Level. Di Fase 1-2 mengerjakan fondasi UI karena detektor baru jalan di Fase 3.

Prompt pembuka: [`prompts/Eugene/00-kickoff.md`](prompts/Eugene/00-kickoff.md)

| Modul | Isi | Layer | Fase | Bobot | Effort AI | Bergantung pada | Prompt | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| level | Level dan jam main | backend + frontend | 3 | 2 | Medium | devices | [prompt](prompts/Eugene/level.md) | belum mulai |
| badminton | Kok jatuh di dalam atau di luar garis | yolo-service | 3 | 3 | High | - | [prompt](prompts/Eugene/badminton.md) | belum mulai |
| tennis | Bola mendarat di dalam atau di luar garis (usulan, belum diputuskan) | yolo-service | 3 | 3 | High | - | [prompt](prompts/Eugene/tennis.md) | belum mulai |
| padel | Bola mendarat di dalam atau di luar garis (usulan, belum diputuskan) | yolo-service | 3 | 3 | High | - | [prompt](prompts/Eugene/padel.md) | belum mulai |
| play_activity | Menit main nyata (orang + bola) untuk Level | yolo-service | 3 | 2 | High | - | [prompt](prompts/Eugene/play-activity.md) | belum mulai |

## Urutan kerja dan gate

| Fase | Modul | Gate untuk lanjut |
| --- | --- | --- |
| 1 Fondasi | accounts, role-requests, venues, open-play, payments, community, feed, admin, vip (badge saja) | Open play pertama berjalan dengan pembayaran |
| 2 Match manual | bracket, match, scoring (input manual) | Coach menjalankan open play penuh secara manual |
| 3 AI detection | devices, level, scoring (event AI), semua modul yolo-service | Akurasi skor lolos uji di lapangan |
| 4 Ekspansi | equipment, app mobile, personalisasi, VIP | - |

Tiga titik kritis di awal:

1. `accounts` (dev-a) memblokir semua modul lain karena login dan role. Kerjakan dan merge paling dulu.
2. `payments` (dev-b) memblokir `open-play`. dev-b memulai dari antarmuka gateway dan `FakeGateway` supaya `open-play` tidak menunggu gateway sungguhan.
3. `scoring` (dev-c) bergantung pada tabel dan service `match` (dev-b). dev-b merge bentuk tipe `match` lebih dulu, dev-c menyusul.

dev-d tidak punya modul aplikasi besar di Fase 1-2, jadi mengerjakan fondasi UI (layout, navigasi, komponen bersama) dan menyiapkan lingkungan serta data uji YOLO di laptop RTX. Detail ada di `prompts/Eugene/00-kickoff.md`.

## Cara mengambil modul

1. Buat issue dengan template "Tugas modul" (label `mod:<nama>`), tetapkan dirimu sebagai assignee.
2. Branch `feat/<modul>-<hal>` dari `main`.
3. Jalankan prompt modulnya di `prompts/<orang>/<modul>.md`. Pakai Claude Opus 5 atau 5.5 dengan effort sesuai kolom "Effort AI".
4. Review hasilnya sendiri, jalankan test, perbarui README modul dan baris di file ini, buka PR.

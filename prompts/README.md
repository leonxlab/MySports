# prompts

Prompt siap pakai untuk mengerjakan tiap modul dengan Claude Opus 5 atau Opus 5.5. Satu orang, satu folder, satu prompt per modul.

```
prompts/
  README.md           file ini
  INTEGRATION.md      titik temu antar orang (siapa menyediakan apa untuk siapa)
  _review.md          prompt untuk meninjau diff sebelum atau sesudah PR
  dev-a/  00-kickoff.md  + satu file per modul
  dev-b/  ...
  dev-c/  ...
  dev-d/  ...
```

Pembagian jalur dan bobot ada di `MODULES.md`.

## Cara pakai

1. Buka Claude Code (atau sesi Claude lain yang bisa membaca repo) di akar repo.
2. **Sekali di awal:** tempel `prompts/<kamu>/00-kickoff.md`. AI membaca konteks, meringkas jalurmu, menandai hal yang tidak jelas, dan menulis daftar issue ke `docs/work/<kamu>-issues.md`. Ia berhenti setelah itu.
3. **Per modul:** buka sesi baru, buat branch `feat/<modul>-<hal>`, tempel isi prompt modul (bagian di bawah garis `---`). Satu modul per sesi supaya konteksnya bersih.
4. Atur effort sesuai kolom "Effort" di header prompt. Bila sesi macet atau hasilnya dangkal untuk modul bertanda Medium, naikkan ke High.
5. Baca diff-nya sendiri. Jalankan perintah di bagian Pengujian prompt. Baru buka PR.
6. Minta orang lain (atau sesi AI terpisah dengan `_review.md`) meninjau sebelum merge.

## Effort: kapan Medium, kapan High

| Effort | Dipakai untuk | Alasan |
| --- | --- | --- |
| Medium | CRUD dengan aturan jelas: accounts, role-requests, admin, vip, community, feed, venues, match, level, equipment, jobs, calibration | Spesifikasi sudah rinci, risiko utama ada di kerapian dan antarmuka |
| High | payments, open-play, bracket, scoring, devices, semua detektor (basketball, futsal, badminton, tennis, padel), play_activity, anti_cheat | Uang dan konkurensi, algoritma kombinatorik, banyak kasus tepi, atau riset visi komputer dengan ketidakpastian tinggi |

## Aturan yang berlaku di semua prompt

- AI tidak memutuskan pertanyaan terbuka di proposal. Ia memakai asumsi sementara yang mudah diganti, menandainya `TODO(decision)`, dan melaporkannya.
- AI jujur soal apa yang belum jadi dan tidak mengarang hasil uji, akurasi, atau benchmark.
- AI tidak menyentuh modul orang lain, `core`, `contracts`, atau migrasi modul lain di PR yang sama dengan fitur.
- Bagian yang butuh GPU, data uji, atau akses jaringan yang tidak ada di sesi dilaporkan apa adanya, bukan dipalsukan.

## Mengubah prompt

Prompt adalah bagian repo. Ubah lewat PR dan minta pemilik jalurnya menyetujui. Kalau kamu menemukan prompt yang salah atau kurang saat dipakai, perbaiki di PR yang sama dengan pekerjaanmu. Keputusan baru yang muncul di chat dengan AI harus masuk ke PR atau `docs/`, jangan hanya tinggal di chat.

## Prompt bantu

Untuk perbaikan setelah review atau CI merah, tempel ini di sesi modul yang sama:

```
Baca komentar review / log CI di bawah. Kerjakan hanya yang diminta, di modul ini saja.
Jangan merombak hal lain. Jalankan ulang pemeriksaan di bagian Pengujian prompt modul,
lalu laporkan apa yang berubah dan apa yang tidak kamu ubah beserta alasannya.

<tempel komentar atau log di sini>
```

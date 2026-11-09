# prompts

Prompt siap pakai untuk mengerjakan tiap modul dengan Claude Opus 5 atau Opus 5.5. Satu orang, satu folder, satu prompt per modul.

```
prompts/
  README.md           file ini
  INTEGRATION.md      titik temu antar orang (siapa menyediakan apa untuk siapa)
  _review.md          prompt untuk meninjau diff sebelum atau sesudah PR
  Leon/     00-kickoff.md  + satu file per modul (dev-a)
  Jonathan/ 00-kickoff.md  + satu file per modul (dev-b)
  Aldo/     00-kickoff.md  + satu file per modul (dev-c)
  Eugene/   00-kickoff.md  + satu file per modul (dev-d)
```

Pembagian jalur dan bobot ada di `MODULES.md`.

## Cara pakai

1. Buka Claude Code (atau sesi Claude lain yang bisa membaca repo) di akar repo.
2. **Sekali di awal:** tempel `prompts/<nama>/00-kickoff.md` sesuai foldermu (`Leon`, `Jonathan`, `Aldo`, atau `Eugene`). AI membaca konteks, meringkas jalurmu, menandai hal yang tidak jelas, dan menulis daftar issue ke `docs/work/<nama>-issues.md`. Ia berhenti setelah itu.
3. **Sebelum bekerja bersamaan:** pakai clone atau Git worktree terpisah untuk tiap dev; jangan berbagi checkout, branch, atau staging area. Ikuti langkah "Kerja paralel tanpa tabrakan" di `rules.md`.
4. **Per modul:** buka sesi baru, buat branch unik dari `origin/main` dengan pola `feat/<modul>-<hal>`, tempel isi prompt modul yang ada di folder nama yang sama (bagian di bawah garis `---`). Satu modul per sesi supaya konteksnya bersih.
5. Atur effort sesuai kolom "Effort" di header prompt. Bila sesi macet atau hasilnya dangkal untuk modul bertanda Medium, naikkan ke High.
6. Baca diff-nya sendiri. Jalankan perintah di bagian Pengujian prompt. Baru buka PR.
7. Minta orang lain (atau sesi AI terpisah dengan `_review.md`) meninjau sebelum merge.

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

Untuk perbaikan setelah review atau test lokal gagal, tempel ini di sesi modul yang sama:

```
Baca komentar review / log test di bawah. Kerjakan hanya yang diminta, di modul ini saja.
Jangan merombak hal lain. Jalankan ulang pemeriksaan di bagian Pengujian prompt modul,
lalu laporkan apa yang berubah dan apa yang tidak kamu ubah beserta alasannya.

<tempel komentar atau log di sini>
```

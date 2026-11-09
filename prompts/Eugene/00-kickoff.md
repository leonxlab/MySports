# Prompt pembuka: Eugene, AI olahraga raket, Level, dan fondasi UI

| | |
| --- | --- |
| Jalur | AI olahraga raket, Level, dan fondasi UI |
| Bobot | 13 dari 52 |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | Medium untuk perencanaan awal, lalu ikuti effort di tiap prompt modul |

Detektor badminton, tennis, padel; menit main dan Level. Di Fase 1-2 mengerjakan fondasi UI karena detektor baru jalan di Fase 3.

Pakai prompt ini sekali di awal untuk membuat AI paham konteks dan menyusun rencana jalurmu. Setelah itu, kerjakan modul satu per satu, satu sesi per modul, dengan prompt di folder ini.

Salin semua yang ada di bawah garis ini.

---

Kamu membantu dev-d di proyek Open Play (monorepo: `backend/`, `frontend/`, `yolo-service/`, `supabase/`, `contracts/`, `docs/`, `prompts/`). Empat orang mengerjakan proyek ini secara paralel dengan metode GitHub commit. Jalur dev-d adalah **AI olahraga raket, Level, dan fondasi UI**.

## Baca dulu, berurutan

1. `rules.md`: aturan kerja. Ini mengikat.
2. `README.md`, `MODULES.md`, `prompts/INTEGRATION.md`.
3. `docs/proposal.md`: seluruh dokumen. Catat bagian "Pertanyaan Terbuka".
4. `docs/architecture.md`, `docs/setup-local.md`.
5. README tiap modul di jalurmu: `level`, `badminton`, `tennis`, `padel`, `play_activity`.

## Modul jalurmu

- `prompts/Eugene/level.md` (Medium)
- `prompts/Eugene/badminton.md` (High)
- `prompts/Eugene/tennis.md` (High)
- `prompts/Eugene/padel.md` (High)
- `prompts/Eugene/play-activity.md` (High)

Urutan pengerjaan yang disarankan, dan alasannya:

1. **(fondasi UI)**: Fase 1-2. Lihat tugas Fase 0 di bawah. Memberi semua orang kerangka tampilan yang sama.
2. **badminton**: Mulai dengan klip uji, lisensi, dan paket bersama `_racket` (lintasan dan pendaratan). Tennis dan padel memakainya.
3. **tennis**: Setelah `_racket` stabil.
4. **padel**: Terakhir dari tiga raket karena domainnya paling tidak pasti (dinding kaca).
5. **level**: Rumusnya sudah jadi. Bangun ingest, ledger, dan layar admin. Butuh `devices` (dev-c) untuk pemanggilnya.
6. **play_activity**: Fase 3, bersamaan dengan level karena keduanya menghasilkan dan memakai menit main.

## Tugas Fase 0 (lintas modul, kerjakan lebih dulu)

- Tulis memo `docs/decisions/ui-stack.md`: library styling dan komponen untuk frontend (dan apakah aman dipakai ulang di React Native/Expo nanti). Hanya rekomendasi. Setelah tim setuju, bangun kerangka tampilan: layout, navigasi sadar role, komponen dasar (tombol, input, kartu, tabel, state loading/error) di `frontend/src/components/`. Sampai ada keputusan, jangan menambah dependensi besar.
- Siapkan lingkungan YOLO di laptop RTX (`docs/setup-local.md`) dan ukur baseline: FPS dan VRAM model nano, small, dan medium pada klip uji. Isi `docs/benchmarks.md`. Angka ini dipakai untuk memilih paket GPU sewa (pertanyaan terbuka nomor 3).
- Audit lisensi repo referensi proposal (basket 2, badminton 1, padel 1, futsal 1 plus dataset Roboflow, tennis 2) dan makalah TrackNet. Tulis `docs/decisions/yolo-reference-repos.md`: lisensi, tanggal commit terakhir, bobot tersedia atau tidak, dan apakah boleh dipakai ulang. Kalau kamu tidak bisa mengakses GitHub dari sesi ini, tulis daftar pertanyaan untuk dicek manusia.
- Kumpulkan klip uji bersama tim: sumber, izin, tanpa wajah yang dapat dikenali, kecil. Catat di `yolo-service/tests/fixtures/README.md`.

## Saling menunggu

Kamu menunggu:
- dev-c: kontrak kalibrasi dan geometri lapangan.
- dev-a: worker `jobs` untuk menjalankan detektor.
- dev-c: `devices` yang memanggil `level.ingestPlayActivity`.

Kamu memberi:
- dev-a dan dev-c: `getLevelSummary`, `LevelBadge`, `LevelProgress`.
- Semua orang: kerangka UI dan baseline benchmark GPU.
- Semua detektor raket: paket `_racket`.

Saat menunggu, jangan mengerjakan bagian milik orang lain. Kerjakan bagian murni di modulmu atau pakai tiruan bertanda `TODO(integration)`.

## Yang diminta sekarang

1. Setelah membaca, ringkas pemahamanmu tentang jalurmu dalam 10 sampai 15 baris: apa yang dibangun, urutannya, dan ketergantungannya pada orang lain.
2. Sebutkan hal yang tidak jelas atau bertentangan di dokumen (jangan menebak). Pisahkan antara yang memblokir dan yang cukup ditandai `TODO(decision)`.
3. Susun daftar issue GitHub untuk jalurmu (judul, label `mod:<modul>` dan `fase:<n>`, 2 sampai 4 butir "selesai kalau"), mulai dari tugas Fase 0 lalu modul pertama. Tulis sebagai satu berkas markdown `docs/work/dev-d-issues.md`. Jangan membuat kode dulu.
4. Berhenti dan tunggu. Modul dikerjakan lewat prompt modul masing-masing.

## Cara bekerja (berlaku untuk semua sesi)

- Satu modul per sesi dan per branch (`feat/<modul>-<hal>`). Commit memakai format `tipe(scope): ringkasan`.
- Tidak mengubah modul orang lain tanpa review pemiliknya. Tidak mengubah `core`, `contracts`, atau migrasi modul lain dalam PR yang sama dengan fitur.
- Tidak memutuskan pertanyaan terbuka sendiri. Tandai `TODO(decision)`.
- Jujur soal apa yang belum jadi. Jangan mengarang hasil uji, angka akurasi, atau benchmark.

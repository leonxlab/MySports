# Prompt pembuka: Leon, Identitas, komunitas, dan admin

| | |
| --- | --- |
| Jalur | Identitas, komunitas, dan admin |
| Bobot | 13 dari 52 |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | Medium untuk perencanaan awal, lalu ikuti effort di tiap prompt modul |

Semua yang berhubungan dengan siapa penggunanya, apa yang mereka bagikan, dan siapa yang mengawasi. Ditambah dua modul YOLO yang paling mandiri: worker dan anti-cheat.

Pakai prompt ini sekali di awal untuk membuat AI paham konteks dan menyusun rencana jalurmu. Setelah itu, kerjakan modul satu per satu, satu sesi per modul, dengan prompt di folder ini.

Salin semua yang ada di bawah garis ini.

---

Kamu membantu dev-a di proyek Open Play (monorepo: `backend/`, `frontend/`, `yolo-service/`, `supabase/`, `contracts/`, `docs/`, `prompts/`). Empat orang mengerjakan proyek ini secara paralel dengan metode GitHub commit. Jalur dev-a adalah **Identitas, komunitas, dan admin**.

## Baca dulu, berurutan

1. `rules.md`: aturan kerja. Ini mengikat.
2. `README.md`, `MODULES.md`, `prompts/INTEGRATION.md`.
3. `docs/proposal.md`: seluruh dokumen. Catat bagian "Pertanyaan Terbuka".
4. `docs/architecture.md`, `docs/setup-local.md`.
5. README tiap modul di jalurmu: `accounts`, `role-requests`, `community`, `feed`, `admin`, `vip`, `jobs`, `anti_cheat`.

## Modul jalurmu

- `prompts/dev-a/accounts.md` (Medium)
- `prompts/dev-a/role-requests.md` (Medium)
- `prompts/dev-a/community.md` (Medium)
- `prompts/dev-a/feed.md` (Medium)
- `prompts/dev-a/admin.md` (Medium)
- `prompts/dev-a/vip.md` (Medium)
- `prompts/dev-a/jobs.md` (Medium)
- `prompts/dev-a/anti-cheat.md` (High)

Urutan pengerjaan yang disarankan, dan alasannya:

1. **accounts**: Paling dulu dan secepat mungkin. Semua modul lain menunggu login dan role. Merge bagian minimal (bootstrap, `getMe`, `grantRole`, `createAccountsApi`) sebelum menyelesaikan galeri.
2. **role-requests**: Memakai `grantRole`. Kecil, bisa dikerjakan segera setelah accounts.
3. **community**: Tidak bergantung pada modul dev-b. Bisa paralel dengan role-requests.
4. **feed**: Butuh `community` dan `open-play` (dev-b) sebagai sumber konten. Mulai dari klasifikasi dan fungsi pemeringkat murni, sambungkan sumber konten belakangan.
5. **admin**: Dikerjakan menjelang akhir Fase 1 karena merangkum modul lain.
6. **vip**: Kecil. Selipkan di sela pekerjaan lain, dan hati-hati dengan batasnya.
7. **jobs**: Fase 3. Bisa dimulai lebih awal bila ada waktu: refaktor worker memakai antarmuka dan tiruan tidak butuh GPU.
8. **anti_cheat**: Fase 3, paling akhir. Mulai dari PR kontrak bersama dev-c dan dev-d.

## Tugas Fase 0 (lintas modul, kerjakan lebih dulu)

- Kerjakan `accounts` dulu dan beri tahu semua orang saat `createAccountsApi` dan `SessionProvider` sudah ada di `main`.
- Tulis `docs/admin-bootstrap.md` bersama modul admin: cara menunjuk admin pertama lewat SQL di Supabase.

## Saling menunggu

Kamu menunggu:
- dev-b: `open-play` (`listNearby`) sebagai sumber konten feed.
- dev-d: butuh `getLevelSummary` untuk profil dan feed. Pakai nilai 0 sampai tersedia.
- dev-c: halaman `match/[id]/result` untuk memasang `GenerateHighlightButton` (komponennya kamu yang menyediakan; buka PR kecil ke dev-c).

Kamu memberi:
- Semua: `createAccountsApi`, `SessionProvider`, `useMe`.
- dev-b dan dev-c: `getProfileSummaries` untuk nama dan foto pemain.

Saat menunggu, jangan mengerjakan bagian milik orang lain. Kerjakan bagian murni di modulmu atau pakai tiruan bertanda `TODO(integration)`.

## Yang diminta sekarang

1. Setelah membaca, ringkas pemahamanmu tentang jalurmu dalam 10 sampai 15 baris: apa yang dibangun, urutannya, dan ketergantungannya pada orang lain.
2. Sebutkan hal yang tidak jelas atau bertentangan di dokumen (jangan menebak). Pisahkan antara yang memblokir dan yang cukup ditandai `TODO(decision)`.
3. Susun daftar issue GitHub untuk jalurmu (judul, label `mod:<modul>` dan `fase:<n>`, 2 sampai 4 butir "selesai kalau"), mulai dari tugas Fase 0 lalu modul pertama. Tulis sebagai satu berkas markdown `docs/work/dev-a-issues.md`. Jangan membuat kode dulu.
4. Berhenti dan tunggu. Modul dikerjakan lewat prompt modul masing-masing.

## Cara bekerja (berlaku untuk semua sesi)

- Satu modul per sesi dan per branch (`feat/<modul>-<hal>`). Commit memakai format `tipe(scope): ringkasan`.
- Tidak mengubah modul orang lain tanpa review pemiliknya. Tidak mengubah `core`, `contracts`, atau migrasi modul lain dalam PR yang sama dengan fitur.
- Tidak memutuskan pertanyaan terbuka sendiri. Tandai `TODO(decision)`.
- Jujur soal apa yang belum jadi. Jangan mengarang hasil uji, angka akurasi, atau benchmark.

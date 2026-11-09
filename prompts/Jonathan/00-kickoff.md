# Prompt pembuka: Jonathan, Open play end-to-end

| | |
| --- | --- |
| Jalur | Open play end-to-end |
| Bobot | 13 dari 52 |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | Medium untuk perencanaan awal, lalu ikuti effort di tiap prompt modul |

Jalur Coach dan uang: dari lapangan, open play, pembayaran, sampai bracket dan jalannya match.

Pakai prompt ini sekali di awal untuk membuat AI paham konteks dan menyusun rencana jalurmu. Setelah itu, kerjakan modul satu per satu, satu sesi per modul, dengan prompt di folder ini.

Salin semua yang ada di bawah garis ini.

---

Kamu membantu dev-b di proyek Open Play (monorepo: `backend/`, `frontend/`, `yolo-service/`, `supabase/`, `contracts/`, `docs/`, `prompts/`). Empat orang mengerjakan proyek ini secara paralel dengan metode GitHub commit. Jalur dev-b adalah **Open play end-to-end**.

## Baca dulu, berurutan

1. `rules.md`: aturan kerja. Ini mengikat.
2. `README.md`, `MODULES.md`, `prompts/INTEGRATION.md`.
3. `docs/proposal.md`: seluruh dokumen. Catat bagian "Pertanyaan Terbuka".
4. `docs/architecture.md`, `docs/setup-local.md`.
5. README tiap modul di jalurmu: `venues`, `open-play`, `payments`, `bracket`, `match`, `equipment`.

## Modul jalurmu

- `prompts/dev-b/venues.md` (Medium)
- `prompts/dev-b/open-play.md` (High)
- `prompts/dev-b/payments.md` (High)
- `prompts/dev-b/bracket.md` (High)
- `prompts/dev-b/match.md` (Medium)
- `prompts/dev-b/equipment.md` (Medium)

Urutan pengerjaan yang disarankan, dan alasannya:

1. **payments**: Mulai dari antarmuka `PaymentGateway`, `FakeGateway`, `computeFees`, dan state machine. `open-play` menunggu `createCheckout` dan `onPaid`, jadi merge kerangka itu lebih dulu.
2. **venues**: Bisa paralel dengan payments setelah accounts ada. `payments` butuh `markSlotBooked`.
3. **open-play**: Setelah payments dan venues punya kerangka. Perhatikan kuota atomik.
4. **bracket**: Algoritmanya murni dan tidak butuh yang lain. Boleh dimulai kapan saja, bahkan sebelum open-play selesai.
5. **match**: Merge kerangka tipe `getMatch` dan `getMatchSettings` lebih awal karena `scoring` (dev-c) bergantung padanya.
6. **equipment**: Fase 4. Jangan dimulai sebelum gate Fase 3.

## Tugas Fase 0 (lintas modul, kerjakan lebih dulu)

- Tulis memo `docs/decisions/payment-gateway.md`: opsi gateway berlisensi untuk Indonesia, biaya, syarat, kebutuhan hukum, dan rekomendasimu. Ini rekomendasi untuk diputuskan tim, jangan mengunci pilihan.
- Merge kerangka `createPaymentsApi` (tanda tangan `createCheckout`, `onPaid`) secepatnya agar `open-play` tidak menunggu.

## Saling menunggu

Kamu menunggu:
- dev-a: `accounts` (login, role, nama pemain).
- dev-c: tidak menunggu; sebaliknya dev-c menunggu `match` darimu.

Kamu memberi:
- dev-c: `getMatch`, `getMatchSettings`, `getBracketMatch`, layout control menu dan `useMatchLive`.
- dev-a: `listNearby`, `listConfirmedParticipants`, `countPending` untuk feed dan admin.

Saat menunggu, jangan mengerjakan bagian milik orang lain. Kerjakan bagian murni di modulmu atau pakai tiruan bertanda `TODO(integration)`.

## Yang diminta sekarang

1. Setelah membaca, ringkas pemahamanmu tentang jalurmu dalam 10 sampai 15 baris: apa yang dibangun, urutannya, dan ketergantungannya pada orang lain.
2. Sebutkan hal yang tidak jelas atau bertentangan di dokumen (jangan menebak). Pisahkan antara yang memblokir dan yang cukup ditandai `TODO(decision)`.
3. Susun daftar issue GitHub untuk jalurmu (judul, label `mod:<modul>` dan `fase:<n>`, 2 sampai 4 butir "selesai kalau"), mulai dari tugas Fase 0 lalu modul pertama. Tulis sebagai satu berkas markdown `docs/work/dev-b-issues.md`. Jangan membuat kode dulu.
4. Berhenti dan tunggu. Modul dikerjakan lewat prompt modul masing-masing.

## Cara bekerja (berlaku untuk semua sesi)

- Satu modul per sesi dan per branch (`feat/<modul>-<hal>`). Commit memakai format `tipe(scope): ringkasan`.
- Tidak mengubah modul orang lain tanpa review pemiliknya. Tidak mengubah `core`, `contracts`, atau migrasi modul lain dalam PR yang sama dengan fitur.
- Tidak memutuskan pertanyaan terbuka sendiri. Tandai `TODO(decision)`.
- Jujur soal apa yang belum jadi. Jangan mengarang hasil uji, angka akurasi, atau benchmark.

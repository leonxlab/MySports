# Prompt pembuka: Aldo, Skor, device, dan AI olahraga tim

| | |
| --- | --- |
| Jalur | Skor, device, dan AI olahraga tim |
| Bobot | 13 dari 52 |
| Model | Claude Opus 5 atau Opus 5.5 |
| Effort | Medium untuk perencanaan awal, lalu ikuti effort di tiap prompt modul |

Dari kamera sampai skor: pairing device, upload video, event AI, aturan skor per cabang, dan detektor basket serta futsal.

Pakai prompt ini sekali di awal untuk membuat AI paham konteks dan menyusun rencana jalurmu. Setelah itu, kerjakan modul satu per satu, satu sesi per modul, dengan prompt di folder ini.

Salin semua yang ada di bawah garis ini.

---

Kamu membantu dev-c di proyek Open Play (monorepo: `backend/`, `frontend/`, `yolo-service/`, `supabase/`, `contracts/`, `docs/`, `prompts/`). Empat orang mengerjakan proyek ini secara paralel dengan metode GitHub commit. Jalur dev-c adalah **Skor, device, dan AI olahraga tim**.

## Baca dulu, berurutan

1. `rules.md`: aturan kerja. Ini mengikat.
2. `README.md`, `MODULES.md`, `prompts/INTEGRATION.md`.
3. `docs/proposal.md`: seluruh dokumen. Catat bagian "Pertanyaan Terbuka".
4. `docs/architecture.md`, `docs/setup-local.md`.
5. README tiap modul di jalurmu: `scoring`, `devices`, `calibration`, `basketball`, `futsal`.

## Modul jalurmu

- `prompts/Aldo/scoring.md` (High)
- `prompts/Aldo/devices.md` (High)
- `prompts/Aldo/calibration.md` (Medium)
- `prompts/Aldo/basketball.md` (High)
- `prompts/Aldo/futsal.md` (High)

Urutan pengerjaan yang disarankan, dan alasannya:

1. **calibration**: Mulai dengan PR kontrak `contracts/calibration.schema.json`. Detektor semua orang bergantung padanya, jadi cepat dimerge dan direview dev-d dan dev-b.
2. **scoring**: Aturan skor per cabang adalah fungsi murni, boleh dimulai sebelum `match` dari dev-b selesai. Bagian yang butuh `match` menyusul.
3. **devices**: Fase 3, tetapi bagian murni (generator kode sesi, skema) bisa dimulai lebih awal. Frontend kamera adalah bagian terbesar.
4. **basketball**: Fase 3. Siapkan klip uji dan evaluasi repo referensi lebih awal.
5. **futsal**: Fase 3, setelah basketball karena banyak yang bisa dipakai ulang.

## Tugas Fase 0 (lintas modul, kerjakan lebih dulu)

- Perkuat `backend/src/core/realtime.ts`: autentikasi WebSocket lewat `?token=` (hapus `TODO(auth)`), dengan test. Ini PR scope `backend-core`, minta review dev-a atau dev-b. Modul `match` dan `devices` memakainya.
- Ajukan `contracts/calibration.schema.json` (lihat prompt calibration).
- Tulis memo `docs/decisions/video-segment-format.md`: HLS (m3u8) atau potongan MediaRecorder, dengan rencana uji di ponsel. Usul proposal: MediaRecorder dulu.

## Saling menunggu

Kamu menunggu:
- dev-b: `getMatch`, `getMatchSettings`, `getBracketMatch` untuk scoring dan devices.
- dev-a: worker `jobs` mengonsumsi antrean `video_segments` yang kamu buat; koordinasikan kolom baru (`duration_ms`, `sport`).
- dev-d: `ingestPlayActivity` untuk event `play_activity`.

Kamu memberi:
- dev-d dan dev-a: kontrak kalibrasi dan antrean segmen.
- dev-b: komponen `ScorerPicker`, `ManualActionPanel`, `FoulPanel`, `SuggestionQueue`.
- Semua detektor: geometri lapangan dan homografi.

Saat menunggu, jangan mengerjakan bagian milik orang lain. Kerjakan bagian murni di modulmu atau pakai tiruan bertanda `TODO(integration)`.

## Yang diminta sekarang

1. Setelah membaca, ringkas pemahamanmu tentang jalurmu dalam 10 sampai 15 baris: apa yang dibangun, urutannya, dan ketergantungannya pada orang lain.
2. Sebutkan hal yang tidak jelas atau bertentangan di dokumen (jangan menebak). Pisahkan antara yang memblokir dan yang cukup ditandai `TODO(decision)`.
3. Susun daftar issue GitHub untuk jalurmu (judul, label `mod:<modul>` dan `fase:<n>`, 2 sampai 4 butir "selesai kalau"), mulai dari tugas Fase 0 lalu modul pertama. Tulis sebagai satu berkas markdown `docs/work/dev-c-issues.md`. Jangan membuat kode dulu.
4. Berhenti dan tunggu. Modul dikerjakan lewat prompt modul masing-masing.

## Cara bekerja (berlaku untuk semua sesi)

- Satu modul per sesi dan per branch (`feat/<modul>-<hal>`). Commit memakai format `tipe(scope): ringkasan`.
- Tidak mengubah modul orang lain tanpa review pemiliknya. Tidak mengubah `core`, `contracts`, atau migrasi modul lain dalam PR yang sama dengan fitur.
- Tidak memutuskan pertanyaan terbuka sendiri. Tandai `TODO(decision)`.
- Jujur soal apa yang belum jadi. Jangan mengarang hasil uji, angka akurasi, atau benchmark.

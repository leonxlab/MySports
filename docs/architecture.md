# Arsitektur

Ringkasan dari `docs/proposal.md` bagian Arsitektur. Kalau dokumen ini dan proposal berbeda, proposal yang benar (lalu perbaiki dokumen ini).

```
Web (Next.js, Vercel) ──┐
App iOS/Android (nanti) ─┼──► Backend API (Fastify, Heroku) ──► Supabase (Postgres, Auth, Storage)
                         │        REST + WebSocket                      ▲        ▲
                         │                                              │        │
Kamera (browser) ── upload segmen lewat signed URL ─────────────────────┘        │
                                                                                 │
                                     yolo-service (GPU sewa) ── ambil antrean ───┘
                                              │
                                              └── kirim event ──► Backend API (/devices/events)
```

## Pembagian tanggung jawab

| Bagian | Tugas | Tidak boleh |
| --- | --- | --- |
| frontend | Tampilan, kirim aksi pengguna | Aturan bisnis, akses tabel langsung |
| backend | Semua aturan: role, bracket, skor, Level, fee, pembayaran | Memproses video, mengimpor kode YOLO |
| yolo-service | Deteksi kejadian dari video | Menghitung skor, menyimpan video, bicara ke frontend |
| supabase | Data, file, antrean pekerjaan, auth | Logika aplikasi (selain fungsi antrean) |

## Alur video dan deteksi

1. Kamera Home dan Away merekam dan memecah video menjadi segmen (maksimal 50 MB). Format segmen masih terbuka (pertanyaan #13 di proposal; usulan: potongan MediaRecorder dulu).
2. Kamera minta signed URL ke `POST /devices/sessions/:id/segments/sign`, lalu mengunggah **langsung ke Supabase Storage**. Tidak lewat Heroku karena router Heroku memutus request di 30 detik.
3. Kamera memanggil `.../segments/:segmentId/uploaded`. Baris `video_segments` berstatus `queued`.
4. Worker YOLO memanggil `claim_next_segment()`, mengunduh segmen, mendeteksi, lalu mengirim batch event ke `POST /devices/events` (header `x-service-key`, kontrak di `contracts/`).
5. Backend menyimpan event ke `score_events` berstatus `suggested` (kunci `event_id`, aman dikirim ulang) dan menyiarkannya lewat WebSocket ke controller Coach.
6. Coach mengonfirmasi atau mengoreksi di controller. Backend menerapkan aturan skor cabang dan memperbarui statistik.
7. Event `play_activity` masuk ke modul `level` untuk XP.
8. Worker menghapus segmen dari Storage. Hanya skor, statistik, dan menit main yang tertinggal.

Koneksi kamera putus: segmen yang belum terkirim ditahan di device dengan label status dan dikirim saat tersambung. Selama itu Coach tetap bisa input skor manual lewat controller. Cara memadukan skor manual dengan hasil AI yang menyusul belum diputuskan (pertanyaan #4).

## Pairing device

Satu sesi maksimal tiga device: kamera home, kamera away, controller. Coach membuat sesi (`POST /devices/sessions`) dan mendapat kode sesi yang juga dirender sebagai QR. Device lain memasukkan kode lewat `POST /devices/sessions/join`.

## Modul

Daftar modul, fase, dan ketergantungan: `MODULES.md`.

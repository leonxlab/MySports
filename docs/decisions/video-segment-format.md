# Memo keputusan: format segmen video kamera

| | |
| --- | --- |
| Status | Usulan, menunggu persetujuan tim. `TODO(decision)` |
| Penulis | Aldo (dev-c), modul `devices` |
| Menyentuh | `devices` (kamera, upload), `jobs` (worker, Leon), semua detektor |
| Terkait | Proposal keputusan #6, pertanyaan terbuka #4 dan #13, `docs/architecture.md` |

## Masalah

Dokumen saling bertentangan:

- Proposal keputusan #6 dan bagian "AI Detection dan Device Pairing": segmen berformat m3u (HLS), maksimal 50 MB.
- Proposal pertanyaan terbuka #13 dan `docs/architecture.md`: format masih terbuka, usulan potongan MediaRecorder dulu karena langsung tersedia di browser.

Format menentukan cara kamera merekam, cara worker membuka file, dan cara menghitung offset waktu event (`timestamp_ms`). Perlu satu keputusan sebelum layar kamera dan worker difinalkan.

## Pilihan

### A. Potongan MediaRecorder (usulan)

Kamera merekam dengan `MediaRecorder` di browser. Setiap segmen adalah satu file utuh.

- Container: WebM (VP8/VP9) di Chrome dan Android, MP4 (H.264) di Safari iOS. Kamera memilih lewat `MediaRecorder.isTypeSupported` dan mengirim `mime_type` bersama segmen.
- Penting: potongan dari `start(timeslice)` **tidak bisa diputar sendiri**. Hanya potongan pertama yang membawa header container. Karena itu satu segmen = satu siklus `start()` sampai `stop()`, lalu recorder baru langsung dimulai. Ada celah pendek di antara segmen (besarnya belum diukur).
- Panjang segmen dibatasi waktu (usul 30 sampai 60 detik) dan ukuran (di bawah 50 MB). Bitrate diatur lewat `videoBitsPerSecond`.
- Offset waktu: kamera mencatat `started_at_ms` (relatif awal match) dan `duration_ms` per segmen. Kolom ini sudah diusulkan untuk migrasi `video_segments` (lihat `prompts/INTEGRATION.md`).
- Worker: OpenCV dengan backend FFmpeg membuka WebM dan MP4. Durasi WebM dari MediaRecorder sering tidak tercatat di header, jadi worker menghitung posisi dari nomor frame dan fps, bukan dari metadata durasi.

Kelebihan: tanpa library tambahan di HP, beban CPU kecil, langsung jalan di browser modern.
Kekurangan: dua container berbeda, celah antar segmen, fps nyata bisa berubah-ubah (variable frame rate).

### B. HLS (m3u8 + potongan TS/fMP4)

- Browser tidak menulis HLS secara bawaan. Perlu muxing di HP (misalnya ffmpeg.wasm) dari keluaran MediaRecorder atau `WebCodecs`.
- ffmpeg.wasm berukuran puluhan MB dan berat di CPU HP yang juga sedang merekam 1080p. Risiko panas dan baterai (lihat syarat device di proposal).
- Playlist m3u8 tidak dibutuhkan worker: worker memproses segmen satu per satu dari antrean, bukan memutar stream.

Kelebihan: format seragam, potongan berurutan tanpa celah, cocok bila nanti ada siaran langsung.
Kekurangan: beban di HP, ukuran unduhan aplikasi, kerumitan tinggi untuk manfaat yang belum dipakai.

## Usulan

Pakai **A (potongan MediaRecorder)** untuk Fase 3, dengan satu segmen = satu siklus recorder. Simpan `mime_type`, `started_at_ms`, dan `duration_ms` per segmen. Tinjau ulang HLS bila siaran langsung atau highlight VIP masuk cakupan.

Keputusan #6 di proposal perlu diubah lewat PR ke `docs/proposal.md` bila tim setuju.

## Rencana uji di ponsel (belum dijalankan)

Hasil belum ada. Jangan dipakai sebagai angka sebelum diukur.

| Uji | Cara | Dicatat |
| --- | --- | --- |
| Dukungan format | `MediaRecorder.isTypeSupported` untuk `video/webm;codecs=vp9`, `vp8`, `video/mp4` | Format yang didukung tiap HP |
| Celah antar segmen | Rekam jam digital 10 menit dengan segmen 30 detik, bandingkan waktu di frame | Celah per pergantian (ms) |
| Ukuran segmen | Rekam 1080p 30 fps selama 30 dan 60 detik pada beberapa bitrate | MB per segmen |
| Stabilitas | Rekam 30 menit tersambung charger | fps rata-rata dan terendah, suhu, baterai, error recorder |
| Dibaca worker | Buka tiap file dengan OpenCV di laptop RTX | Jumlah frame terbaca, fps terbaca |
| Offline | Matikan jaringan 5 menit di tengah rekaman | Segmen tertahan di IndexedDB terkirim berurutan setelah pulih |

Perangkat uji minimal: satu Android kelas menengah (Chrome) dan satu iPhone (Safari). Tulis hasilnya di `docs/benchmarks.md`.

## Pertanyaan yang tetap terbuka

- Batas antrean offline di device: menit atau MB (pertanyaan #4).
- Celah antar segmen: apakah bisa diterima untuk deteksi bola, atau perlu dua recorder bergantian yang tumpang tindih.
- Panjang segmen final: dari hasil uji ukuran dan celah.

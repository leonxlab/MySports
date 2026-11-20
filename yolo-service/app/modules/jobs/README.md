# Jobs (worker)

Alur (rules.md bagian 7): ambil segmen dari antrean `video_segments` (fungsi SQL
`claim_next_segment`) → unduh dari bucket `segments` → deteksi → kirim event ke backend → hapus
segmen dari Storage → tandai `done`. Gagal sementara dikembalikan ke antrean tanpa menghapus file;
gagal setelah `MAX_ATTEMPTS` ditandai `failed` dan file dihapus.

`SegmentWorker` menerima Queue, Storage, dan BackendClient yang bisa diganti dengan tiruan saat tes.
Unduhan dan pengiriman event dicoba ulang dengan backoff, file sementara dihapus setelah diproses,
dan shutdown SIGTERM menunggu pekerjaan aktif selesai. Segmen macet dikembalikan ke antrean setelah
30 menit. Antrean mencegah segmen berikutnya pada device diproses sebelum urutan sebelumnya selesai.

Endpoint worker `GET /metrics` pada port 8001 menampilkan kedalaman antrean, jumlah selesai/gagal,
dan waktu proses rata-rata. Docker Compose menerapkan restart policy, healthcheck, serta rotasi log.

### Skenario uji integrasi antrean lokal

Setelah `supabase db reset`, masukkan dua segmen berurutan pada device yang sama dan satu segmen
pada device lain. Jalankan dua worker bersamaan; verifikasi tidak ada `id` yang diklaim dua kali,
segmen kedua device pertama tetap queued sampai segmen pertamanya done/failed, lalu keduanya selesai.
Skenario ini belum dijalankan karena Supabase CLI/Docker tidak tersedia di sesi ini.

### Integrasi dan pengukuran tertunda

- TODO(integration): migrasi devices milik dev-c belum menyediakan `sport` untuk sesi tanpa match
  atau `start_offset_ms`; worker memakai fallback basket dan offset nol untuk sementara.
- Migrasi urutan claim dan pemulihan macet yang baru ditambahkan perlu direview dev-c sebagai pemilik
  antrean devices sebelum digabung.
- TODO(decision): 30 menit adalah batas sementara untuk claim macet; sesuaikan dengan durasi proses
  nyata agar worker lambat tidak diambil alih.
- TODO(decision): penyedia GPU dan jadwal nyala-mati belum diputuskan; worker tidak terikat vendor.
- Pengujian GPU/benchmark belum dilakukan karena tidak ada klip uji atau akses laptop RTX di sesi ini.

Jalankan: `python -m app.worker`

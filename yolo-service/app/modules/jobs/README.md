# Jobs (worker)

Alur (rules.md bagian 7): ambil segmen dari antrean `video_segments` (fungsi SQL `claim_next_segment`) → unduh dari bucket `segments` → deteksi → kirim event ke backend → **hapus segmen dari Storage** → tandai `done`. Gagal setelah `MAX_ATTEMPTS` → `failed` dan segmen tetap dihapus.

Jalankan: `python -m app.worker`

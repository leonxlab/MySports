# Detektor basketball

Pemilik: dev-c (Aldo). Bola masuk ring. Pembeda 2 dan 3 poin tidak diputuskan AI (pertanyaan terbuka #10: Coach memilih saat konfirmasi).

Event: `basket_made`. AI hanya mengusulkan kejadian, Coach mengonfirmasi lewat controller, aturan poin ada di backend.

## Cara kerja

1. `detector.py` memuat model (lazy), membaca segmen dengan OpenCV pada `SAMPLE_FPS`, inferensi per batch, dan mengambil posisi bola paling yakin per frame (`calibration/ball.py`). Posisi diskalakan ke frame acuan kalibrasi.
2. `shots.py` (murni, dites tanpa GPU) mengubah urutan posisi bola menjadi tembakan masuk, per ring yang dikalibrasi kamera ini.
3. Event dibuat dengan `make_event_id(segment_id, "basket_made", timestamp_ms, index)`, `timestamp_ms = start_offset_ms + posisi di segmen`.

Frame hanya di memori. Tidak ada frame, URL video, atau data pemain yang ditulis ke disk atau log.

## Aturan "bola masuk"

Semua dalam piksel frame acuan, dengan bibir depan ring dari kalibrasi Coach:

- Bola terlihat di atas ring (lebih tinggi dari `margin` = 15% lebar ring) di dalam jendela horizontal ring.
- Lalu terlihat di bawah ring paling lambat 600 ms kemudian.
- Titik potong lintasan dengan garis ring (interpolasi linear) jatuh di dalam bibir ring (toleransi 15% lebar ring).
- Gerakan dari bawah ke atas diabaikan; peredaman 1,5 detik setelah satu tembakan masuk.

`TODO(decision)`: semua angka di `ShotParams` adalah nilai awal, disetel dari klip uji.

Kasus sulit:
- Bola menggelinding di bibir ring lalu keluar: tidak pernah menembus ke bawah, tidak dihitung (dites).
- Bola tertutup pemain tepat saat masuk: celah pengamatan lebih dari 600 ms, tembakan terlewat. Coach input manual.
- Kamera dari samping: bola di depan ring bisa tampak "di bawah ring". Usulan: kamera di belakang garis, menghadap ring.
- **Tembakan yang melintasi batas dua segmen** (bola di atas ring di akhir segmen N, di bawah ring di awal segmen N+1) terlewat, karena tiap segmen diproses terpisah. Usulan penanganan: worker memberi beberapa ratus milidetik terakhir segmen sebelumnya sebagai konteks, atau kamera membuat segmen yang sedikit tumpang tindih. Belum diimplementasi, perlu dibahas dengan pemilik `jobs` (Leon).

## Bobot model

- `models/basketball.pt` (fine-tune, kelas 0 = bola) bila ada. Belum ada.
- Sementara: `yolo11n.pt` pretrained COCO, kelas 32 `sports ball`. Akurasi untuk bola basket di lapangan belum diukur.
- `TODO(decision)`: lisensi Ultralytics YOLO adalah AGPL-3.0 (sudah dipakai di `requirements.txt`). Dampaknya untuk layanan ini perlu diputuskan tim.

## Repo referensi

Dicek lewat GitHub API pada 2026-11-12:

| Repo | Lisensi | Keputusan |
| --- | --- | --- |
| `nvan21/Basketball-Shot-Detection` | tidak ada file lisensi | Kode tidak dipakai. Logika dibuat sendiri |
| `petermartens98/Finetuned-YOLO-and-Supervision-Basketball-Video-Tracker` | tidak ada file lisensi | Kode dan bobot tidak dipakai |

Tanpa lisensi, kode repo tersebut tidak boleh disalin (rules.md bagian 7). Bobot dan hasil pada klip uji belum dievaluasi.

## Evaluasi

`scripts/evaluate_events.py` menghitung presisi, recall, dan tembakan ganda dari keluaran `run_detector` terhadap label waktu manual. Belum ada klip uji di `tests/fixtures/` (butuh klip yang diizinkan tanpa wajah yang dapat dikenali).

## Checklist

- [x] Cek lisensi repo referensi (tidak ada lisensi, tidak dipakai)
- [x] `process()` menghasilkan event sesuai kontrak
- [x] Mesin status dites dengan lintasan sintetis (`tests/test_basketball_shots.py`)
- [ ] `pytest` dan `ruff` dijalankan (Python tidak tersedia di sesi penulisan)
- [ ] Klip uji berlabel dan hasil presisi/recall
- [ ] Bobot fine-tune di bucket `models`, versi di `models/VERSIONS.md`
- [ ] Benchmark FPS, VRAM, detik proses per menit video di `docs/benchmarks.md`

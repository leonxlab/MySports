# Detektor futsal

Pemilik: dev-c (Aldo). Bola masuk gawang (gol).

Event: `goal`. AI hanya mengusulkan kejadian, Coach mengonfirmasi lewat controller, aturan poin (1 gol = 1 poin) ada di backend. Jenis tendangan dan pencetak diinput Coach.

## Cara kerja

1. `detector.py` memakai pembaca posisi bola bersama (`calibration/ball.py`) pada `SAMPLE_FPS`, diskalakan ke frame acuan kalibrasi.
2. `goals.py` (murni, dites tanpa GPU) mengubah urutan posisi bola menjadi gol per gawang yang dikalibrasi kamera ini.
3. Event dibuat dengan `make_event_id(segment_id, "goal", timestamp_ms, index)`.

## Aturan "gol"

- Gawang "siap" setelah bola terlihat di luar mulut gawang (diperlebar 10% lebar gawang).
- Gol bila bola terlihat di dalam mulut gawang (diperkecil 5% lebar gawang) minimal 2 pengamatan berturut-turut, jeda tiap pengamatan paling lama 400 ms.
- Setelah gol, gawang siap lagi hanya bila bola terlihat di luar dan 3 detik sudah lewat. Bola yang diam di jaring tidak dihitung ulang.

`TODO(decision)`: angka di `GoalParams` adalah nilai awal, disetel dari klip uji.

Kasus sulit:
- Bola membentur tiang atau mistar dari luar: tidak masuk area dalam yang diperkecil, tidak dihitung (dites).
- Bola tertutup kiper saat melewati garis: bisa terlewat bila kurang dari 2 pengamatan di dalam. Coach input manual.
- Bola di belakang jaring atau melambung di atas mistar bisa "terproyeksi" di dalam poligon mulut gawang (keterbatasan 2D). Usulan: kamera di belakang gawang, cukup tinggi, menghadap lapangan.
- Gol yang melintasi batas dua segmen bisa terlewat (sama dengan basket, lihat README basketball).

## Tim pencetak (`TODO(decision)`)

Kontrak `goal` hanya punya `payload.team_color`, dan warna baju belum dideteksi. Usulan aturan dari sisi kamera:
- Kamera Home merekam sisi home, jadi gawang yang terlihat adalah gawang tim home. Gol ke gawang itu = poin untuk **away**.
- Kamera Away sebaliknya: gol = poin untuk **home**.

Aturan ini belum dipakai. Sementara backend menyimpan usulan tanpa tim dan Coach memilih tim saat konfirmasi. Kalau disetujui, cukup diterapkan di `scoring` (`teamFromSuggestion` memakai `event.camera`), tanpa mengubah kontrak.

## Bobot model

- `models/futsal.pt` (fine-tune, kelas 0 = bola) bila ada. Belum ada.
- Sementara: `yolo11n.pt` pretrained COCO, kelas 32 `sports ball`. Akurasi belum diukur.
- `TODO(decision)`: lisensi Ultralytics YOLO (AGPL-3.0), sama dengan detektor basket.

## Referensi

Dicek pada 2026-11-12:

| Sumber | Lisensi | Keputusan |
| --- | --- | --- |
| `andreus94/AI-tracker` | tidak ada file lisensi (GitHub API) | Kode tidak dipakai |
| Roboflow Universe `futsal-analysis` | belum dicek (butuh login Roboflow) | Belum dipakai |

## Checklist

- [x] Cek lisensi repo referensi (tidak ada lisensi, tidak dipakai); dataset Roboflow belum dicek
- [x] `process()` menghasilkan event sesuai kontrak
- [x] Mesin status dites dengan lintasan sintetis (`tests/test_futsal_goals.py`)
- [ ] `pytest` dan `ruff` dijalankan (Python tidak tersedia di sesi penulisan)
- [ ] Klip uji berlabel dan hasil presisi/recall (`scripts/evaluate_events.py`)
- [ ] Bobot fine-tune, versi di `models/VERSIONS.md`, benchmark di `docs/benchmarks.md`

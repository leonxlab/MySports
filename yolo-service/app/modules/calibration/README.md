# Kalibrasi lapangan

Pemilik: dev-c (Aldo). Dipakai semua detektor.

Posisi ring, gawang, dan garis ditandai sekali oleh Coach saat setup (klik titik, mirip klik 4 sudut di repo badminton). Targetnya tidak bergerak, jadi model cukup fokus ke bola. Datanya disimpan backend di `device_sessions.calibration` dan dibawa ke detektor lewat `SegmentContext.calibration`.

## Kontrak

Bentuk data: [`contracts/calibration.schema.json`](../../../../contracts/calibration.schema.json). Cermin pydantic di `contract.py`, cermin zod di `backend/src/modules/devices/schema.ts`. Ringkasnya:

- `version` (1), `sport`, `layout` (`full_court`/`half_court` basket, `singles`/`doubles` badminton dan tennis, `standard` padel dan futsal).
- `cameras.home` dan/atau `cameras.away`: `frame` (resolusi acuan), `court_corners` (4 titik), `targets` (ring 2 titik, gawang 4 titik), `marked_at`.
- Titik dalam piksel frame acuan. Detektor menskalakan bila resolusi segmen berbeda (`frame_size`).

## Utilitas (`points.py`)

| Fungsi | Kegunaan |
| --- | --- |
| `parse_calibration(raw)` | Validasi data dari backend, hasilnya `Calibration` |
| `court_geometry(sport, layout)` | Dimensi standar dan garis bernama (`near_baseline`, `far_baseline`, `left_sideline`, `right_sideline`, `center`) |
| `CourtMapper.from_calibration(cal, camera)` | Homografi piksel ke meter untuk satu kamera |
| `CourtMapper.to_court`, `is_inside`, `distance_to_line` | Koordinat lapangan, uji di dalam lapangan, jarak ke garis |
| `CourtMapper.in_target_area`, `point_in_target` | Bola di area ring atau mulut gawang |

Semua murni numpy. Homografi memakai DLT dari 4 titik (setara `cv2.getPerspectiveTransform`), jadi test jalan tanpa opencv dan tanpa GPU.

Aturan toleransi garis: bola yang menyentuh garis dihitung **masuk**. `is_inside` menerima titik sampai `DEFAULT_LINE_TOLERANCE_M` (5 cm) di luar garis untuk menyerap galat penandaan dan deteksi. `TODO(decision)`: angka toleransi ditetapkan dari uji lapangan.

## Alur penandaan untuk UI (modul devices)

Coach menandai titik di frame diam dari tiap kamera, berurutan. Usulan sementara, `TODO(decision)`: titik wajib per cabang belum diputuskan tim.

| Cabang | Titik yang diminta, berurutan |
| --- | --- |
| Basket | 4 sudut bidang lapangan (dekat kiri, dekat kanan, jauh kanan, jauh kiri), lalu ring: ujung kiri dan kanan bibir depan ring. Full court: tiap kamera menandai ring yang terlihat olehnya |
| Futsal | 4 sudut lapangan, lalu mulut gawang: tiang kiri bawah, tiang kanan bawah, mistar kanan atas, mistar kiri atas |
| Badminton, tennis, padel | 4 sudut lapangan sesuai layout (tunggal atau ganda). Tanpa target |

"Kiri" dan "kanan" dilihat dari kamera. Untuk `half_court`, sudut yang ditandai adalah bidang setengah lapangan.

UI perlu:
- Menampilkan nomor dan nama titik berikutnya, dan tombol ulangi titik terakhir.
- Mengirim `frame` sesuai resolusi frame tempat titik diklik.
- Menolak kirim sebelum semua titik lengkap (backend juga menolak lewat zod).

## Keputusan yang belum final

- `TODO(decision)`: titik wajib per cabang (usulan di atas).
- `TODO(decision)`: kamera bergeser di tengah sesi. Sementara: Coach mengulang kalibrasi secara manual; belum ada deteksi pergeseran otomatis.
- `TODO(decision)`: posisi kamera (di belakang garis atau di samping lapangan) memengaruhi titik mana yang terlihat. Dimensi lapangan non-standar (futsal sewaan) belum didukung.

## Status

- [x] Kontrak JSON, zod, pydantic, dan test kesamaan
- [x] `points.py`: parse, geometri per cabang, homografi, uji titik, garis, target
- [ ] `pytest` dan `ruff` dijalankan di mesin dengan Python 3.11 (belum dijalankan di sesi penulisan karena Python tidak terpasang)

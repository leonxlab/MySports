# contracts

Bentuk data yang dipakai lebih dari satu layanan.

| File | Pengirim → penerima | Cermin di kode |
| --- | --- | --- |
| `detection-event.schema.json` | yolo-service → backend (`POST /api/v1/devices/events`) | `backend/src/modules/devices/schema.ts` (zod) dan `yolo-service/app/core/events.py` (pydantic) |
| `calibration.schema.json` | controller Coach → backend (`POST /api/v1/devices/sessions/:id/calibration`) → yolo-service (`SegmentContext.calibration`) | `backend/src/modules/devices/schema.ts` (zod) dan `yolo-service/app/modules/calibration/contract.py` (pydantic) |

Kalibrasi: titik dalam piksel frame acuan, per kamera (`home`, `away`). Cermin di kode menambah satu cek yang tidak bisa ditulis di JSON Schema: setiap titik harus berada di dalam `frame` (`x <= width`, `y <= height`).

Cara mengubah:

1. PR hanya berisi perubahan di `contracts/` (scope `contracts`), disetujui pemilik semua sisi yang terdampak (lihat rules.md bagian 3).
2. Setelah merge, backend dan yolo-service menyesuaikan di PR masing-masing.
3. Test di kedua sisi memeriksa bahwa daftar tipe event cocok dengan file ini.

Jenis event: `basket_made`, `goal`, `ball_landed` (bola mendarat di dalam atau di luar garis), `play_activity` (menit main untuk Level). Backend menyimpan event dengan kunci `event_id`, jadi aman dikirim ulang.

# contracts

Bentuk data yang dipakai lebih dari satu layanan. Satu-satunya kontrak sekarang:

| File | Pengirim → penerima | Cermin di kode |
| --- | --- | --- |
| `detection-event.schema.json` | yolo-service → backend (`POST /api/v1/devices/events`) | `backend/src/modules/devices/schema.ts` (zod) dan `yolo-service/app/core/events.py` (pydantic) |

Cara mengubah:

1. PR hanya berisi perubahan di `contracts/` (scope `contracts`), disetujui pemilik semua sisi yang terdampak (lihat rules.md bagian 3).
2. Setelah merge, backend dan yolo-service menyesuaikan di PR masing-masing.
3. Test di kedua sisi memeriksa bahwa daftar tipe event cocok dengan file ini.

Jenis event: `basket_made`, `goal`, `ball_landed` (bola mendarat di dalam atau di luar garis), `play_activity` (menit main untuk Level). Backend menyimpan event dengan kunci `event_id`, jadi aman dikirim ulang.

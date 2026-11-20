# Modul devices: Device dan deteksi AI

Pairing sampai 3 device per sesi (kamera home, kamera away, controller) lewat QR atau kode sesi. Kamera mengunggah segmen video langsung ke Supabase Storage lewat signed URL, yolo-service mengambil dari antrean dan mengirim event ke endpoint /events.

| | |
| --- | --- |
| Pemilik | dev-c (Skor, device, dan AI olahraga tim) |
| Fase | 3 |
| Prefix API | `/api/v1/devices` |
| Bergantung pada | match, scoring |
| Tabel | `device_sessions`, `session_devices`, `video_segments` |

## Endpoint

Semua endpoint masih `501 NOT_IMPLEMENTED`. Ubah tabel ini bersamaan dengan kode.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| POST | `/sessions` | Buat sesi pairing (kode sesi dan QR) | coach |
| POST | `/sessions/join` | Pasang device dengan kode: {code, role} | login |
| GET | `/sessions/:id` | Status sesi dan device | login |
| POST | `/sessions/:id/capability` | Laporkan kemampuan device (WebGPU, FPS) | login |
| POST | `/sessions/:id/calibration` | Simpan kalibrasi ring, gawang, atau garis | coach |
| POST | `/sessions/:id/segments/sign` | Minta signed URL upload segmen (maks 50 MB) | login |
| POST | `/sessions/:id/segments/:segmentId/uploaded` | Tandai segmen siap diproses (masuk antrean) | login |
| POST | `/events` | Terima batch kejadian dari yolo-service | x-service-key |
| WS | `/sessions/:id/live` | Status device dan skor langsung | publik |

## Checklist

- [ ] Migrasi: `supabase/migrations/*_devices.sql` (sudah ada kerangkanya, periksa)
- [ ] `schema.ts` untuk input
- [ ] `service.ts` dan test
- [ ] `routes.ts` (hapus `todo(...)` satu per satu)
- [ ] Frontend: `frontend/src/modules/devices`
- [ ] README ini diperbarui, status di `MODULES.md` diubah

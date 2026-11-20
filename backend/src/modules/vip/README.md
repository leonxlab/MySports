# Modul vip: VIP (coming soon)

VIP hanya menyediakan penanda antarmuka. Backend tidak punya endpoint atau tabel. Tombol Langganan VIP dan Generate Highlight selalu nonaktif; badge hanya tampil jika suatu saat pemilik halaman memiliki status VIP. Jangan tambah endpoint, tabel, atau alur bayar sebelum keputusan produk dibuat.

| | |
| --- | --- |
| Pemilik | dev-a (Identitas, komunitas, dan admin) |
| Fase | 4 |
| Prefix API | `/api/v1/vip` |
| Bergantung pada | tidak ada |
| Tabel | tidak ada |

## Endpoint

Tidak ada endpoint VIP. `GET /api/v1/vip/status` tetap 404 dengan sengaja.

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| - | - | Tidak ada endpoint | - |

## Checklist

- [x] Tidak membuat tabel, migrasi, endpoint, atau alur pembayaran
- [x] Tombol Coming soon nonaktif dan badge tidak ditampilkan tanpa status VIP
- [x] Integrasi komponen ke profil dan halaman hasil match
- [x] README dan status di `MODULES.md` diperbarui

## Keputusan produk yang tertunda

- TODO(decision): Fitur apa saja yang termasuk dalam paket VIP?
- TODO(decision): Apakah VIP berbayar, berapa harganya, dan bagaimana mekanisme langganannya?
- TODO(decision): Jika highlight dipilih, berapa lama klip disimpan dan bagaimana persetujuan pemain dikelola?

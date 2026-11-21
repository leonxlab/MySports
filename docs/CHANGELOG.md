# Perubahan

## 2026-11-20 — Rebrand ke Peluit

- Nama aplikasi ditetapkan: **Peluit** (sebelumnya MySports / Open Play). Penyebutan "open play" sebagai nama fitur tetap.
- UI frontend (judul halaman, login, feed) dan README/proposal dirapikan ke nama baru.
- Namespace event di yolo-service berubah `openplay:` → `peluit:` (hanya memengaruhi format `event_id` baru; backend idempoten lewat `event_id` sehingga aman).
- Menyiapkan tempat branding: lihat `docs/branding.md` (logo & banner menyusul).
- Menambah `docs/environment.md`: daftar env per layanan + cara app utama dan yolo-service (host terpisah) saling terintegrasi.

## 2026-11-20 — Rapikan sisa rebrand + perkuat integrasi (hasil audit)

- Sisa rename: `docs/setup-local.md` (cd peluit-app), judul FastAPI di `yolo-service/app/main.py` dan `app/modules/jobs/metrics.py`, README bagian "masih terbuka" (nama aplikasi dikeluarkan dari daftar terbuka), `docs/work/dev-a-issues.md` baris nama aplikasi, tabel keputusan menggantung di `prompts/INTEGRATION.md`.
- Keamanan: verifikasi `x-service-key` di backend kini memakai `crypto.timingSafeEqual` (constant-time).
- Integrasi: endpoint baru `GET /healthz` di backend (butuh `x-service-key`) untuk smoke test antar host dari GPU; checklist go-live di `docs/deploy.md`.
- Dokumen baru: `docs/decisions/payment-gateway.md` (ADR gateway pembayaran, status belum diputuskan), `CONTRIBUTING.md`, catatan kontrak `calibration.schema.json` yang dijanjikan di `contracts/README.md`.
- Prompts devices/jobs/calibration kini merujuk `docs/environment.md` untuk variabel lintas host.

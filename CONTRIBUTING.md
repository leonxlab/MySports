# Kontribusi

Aturan kerja lengkap ada di [`rules.md`](rules.md) (git, kepemilikan modul, batas antar folder, format commit). Setup lokal ada di [`docs/setup-local.md`](setup-local.md).

Ringkasnya:

1. Satu modul, satu pemilik — daftarnya di [`MODULES.md`](MODULES.md).
2. Branch baru per pekerjaan (`feat/<modul>-<hal>`), tidak pernah commit langsung ke `main`.
3. Jalankan test di folder terkait sebelum buka PR: `npm test` (backend), `npm run typecheck && npm run build` (frontend), `pytest` (yolo-service).
4. Kontrak lintas layanan diubah lewat [`contracts/`](contracts) dulu, disetujui semua sisi terdampak.
5. Perubahan aturan wajib dilakukan di `rules.md` **dan** salinannya `prompts/rules.md` dalam PR yang sama.

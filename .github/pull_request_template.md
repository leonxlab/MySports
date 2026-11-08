## Modul
<!-- contoh: bracket (backend + frontend) -->

## Yang berubah
<!-- 2-5 kalimat. Apa dan kenapa. -->

## Issue
Closes #

## Checklist
- [ ] Branch sudah di-rebase ke `main`
- [ ] Hanya menyentuh modul sendiri (atau pemilik modul lain sudah setuju, tulis namanya di bawah)
- [ ] Endpoint baru/berubah sudah tercatat di `backend/src/modules/<modul>/README.md`
- [ ] Kontrak lintas layanan berubah? PR `contracts/` sudah masuk lebih dulu
- [ ] Migrasi baru: file baru, RLS aktif, tidak mengedit migrasi lama
- [ ] Test ditambah atau diubah, `npm test` / `pytest` lolos
- [ ] Tidak ada secret, `.env`, model YOLO, atau video di commit
- [ ] Tampilan berubah? Screenshot terlampir

## Catatan untuk reviewer

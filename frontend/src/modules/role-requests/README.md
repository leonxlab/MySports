# Frontend modul role-requests

Backend: `backend/src/modules/role-requests/README.md`. Hanya tampilan, tanpa aturan bisnis.

Semua halaman memakai `api.ts` modul, memerlukan state sesi, dan menampilkan loading/error. Bukti foto/video diunggah langsung ke bucket `media` lewat signed URL dari accounts.

- `/apply/coach`: Ajukan Coach dengan bukti teks, URL, foto, dan video
- `/apply/owner`: Ajukan Owner Lapangan
- `/apply/status`: Status pengajuan milik sendiri
- `/admin/approvals/roles`: Daftar, filter, setujui, atau tolak pengajuan sebagai admin

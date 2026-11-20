# Frontend modul vip

Backend: `backend/src/modules/vip/README.md`. Hanya penanda tampilan, tanpa aturan bisnis atau API.

Komponen:

- `VipBadge`: hanya dirender bila halaman pemilik profil memiliki status VIP.
- `VipSubscribeButton`: tombol nonaktif berlabel Coming soon, dipasang pada profil sendiri.
- `GenerateHighlightButton`: tombol nonaktif berlabel Coming soon, dipasang pada halaman hasil match.

Belum ada API untuk mengetahui status VIP. Integrasi profil mengirim `isVip={false}` sampai modul
accounts menyediakan status tersebut; halaman hasil match masih berupa placeholder scoring.

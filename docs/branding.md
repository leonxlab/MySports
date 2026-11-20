# Branding: Peluit

Tempat aset visual aplikasi Peluit. Logo dan banner **menyusul** — struktur dan tempatnya sudah disiapkan sekarang.

## Frontend (web)

| Aset | File | Status |
| --- | --- | --- |
| Favicon | `frontend/src/app/icon.png` | Belum ada — letakkan PNG 32×32 (atau `icon.svg`) di folder ini, Next.js App Router memakainya otomatis |
| Logo header | `frontend/public/brand/logo.svg` (opsional `logo-light.svg`, `logo-dark.svg`) | Belum ada |
| Banner / hero | `frontend/public/brand/banner.webp` | Belum ada |
| OG image (share link) | `frontend/src/app/opengraph-image.png` (1200×630) atau `opengraph-image.tsx` | Belum ada |

Cara pakai di kode:

```tsx
import Image from "next/image";
<Image src="/brand/logo.svg" alt="Peluit" width={120} height={32} />
```

Nama aplikasi di UI diambil dari `metadata` di `frontend/src/app/layout.tsx` (sudah "Peluit").

## YOLO service

Tidak memakai aset branding; hanya nama di `pyproject.toml` dan README.

## Pedoman minimum

- Format logo: SVG utama, PNG fallback dengan latar transparan.
- Banner: rasio 3:1 untuk header web, 1200×630 untuk OG.
- Jangan commit file >1 MB ke repo; optimasi dulu (svgo / squoosh).

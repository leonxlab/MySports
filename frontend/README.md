# frontend

Web Open Play. Next.js (App Router) + TypeScript, deploy ke Vercel.

```bash
cp .env.example .env.local
npm install
npm run dev        # :3000
npm run typecheck
npm run build
```

## Struktur

```
src/
  app/                 route Next.js. Tipis: tiap page.tsx memanggil komponen modul
  components/          komponen bersama (sementara hanya ModuleStub)
  lib/                 milik bersama: api-client, supabase (auth saja), env
  modules/<modul>/     api.ts, types.ts, components/, README.md
```

## Aturan singkat

- Semua panggilan ke backend lewat `modules/<modul>/api.ts` (yang memakai `lib/api-client.ts`).
- Tidak ada aturan bisnis di sini. Menyembunyikan tombol sesuai role hanya soal tampilan.
- Supabase client dipakai untuk login dan upload lewat signed URL, bukan untuk membaca tabel.
- Halaman admin tinggal di modul pemiliknya (mis. `admin/fees` di modul `payments`).
- Modul `vip`: hanya `VipBadge`, `VipSubscribeButton`, `GenerateHighlightButton`, semuanya nonaktif "Coming soon".

Mengerjakan satu layar: ganti `ModuleStub` di `src/app/<route>/page.tsx` dengan komponen dari `src/modules/<modul>/components`.

Belum dipilih: library UI/styling. Putuskan berdua sebelum membangun layar pertama, lalu catat di `docs/proposal.md`.

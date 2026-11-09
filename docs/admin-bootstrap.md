# Menunjuk admin pertama

Penunjukan admin dilakukan secara internal oleh pemilik proyek melalui SQL di Supabase. Tidak ada endpoint publik untuk memberikan role `admin`, dan role ini tidak boleh diberikan melalui `accounts.grantRole`.

## Prasyarat

- Akun yang akan ditunjuk sudah mendaftar dan memiliki baris di `public.profiles`.
- Operator memiliki akses tepercaya ke SQL Editor proyek Supabase.
- Gunakan UUID akun yang diverifikasi langsung dari tabel Auth/profil; jangan menaruh service-role key atau kredensial dalam dokumen, issue, atau log.

## Menambahkan role

Ganti UUID placeholder dengan ID akun yang telah diverifikasi, lalu jalankan di SQL Editor:

```sql
begin;

insert into public.user_roles (user_id, role, granted_by)
select profile.id, 'admin', null
from public.profiles as profile
where profile.id = '00000000-0000-0000-0000-000000000000'::uuid
on conflict (user_id, role) do nothing;

commit;
```

Jika tidak ada profil yang cocok, query tidak menambahkan role. Verifikasi hasilnya:

```sql
select profile.id, profile.display_name, user_role.role
from public.profiles as profile
join public.user_roles as user_role on user_role.user_id = profile.id
where profile.id = '00000000-0000-0000-0000-000000000000'::uuid
  and user_role.role = 'admin';
```

Pastikan hasil menampilkan tepat akun yang dimaksud. Setelah itu, minta pemilik akun login ulang bila sesi yang sedang aktif belum mencerminkan perubahan role, lalu verifikasi akses melalui endpoint admin yang sesuai.

## Mencabut akses admin

Pencabutan juga merupakan tindakan internal. Verifikasi UUID target dan pastikan masih ada operator admin lain sebelum menjalankan:

```sql
delete from public.user_roles
where user_id = '00000000-0000-0000-0000-000000000000'::uuid
  and role = 'admin';
```

Jangan menghapus semua admin aktif tanpa prosedur pemulihan yang disepakati tim.

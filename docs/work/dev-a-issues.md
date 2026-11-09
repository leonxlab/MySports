# Rencana issue jalur Leon

## Ringkasan jalur

1. Jalur Leon mencakup identitas, komunitas, feed, admin, dan dua modul YOLO mandiri.
2. `accounts` menjadi fondasi karena semua modul memerlukan sesi pengguna dan role.
3. Bootstrap profil, API akun dasar, `createAccountsApi`, dan `SessionProvider` sudah tersedia di `main`.
4. Pekerjaan `accounts` yang tersisa mencakup edit profil, pengalaman olahraga, galeri, signed upload, dan halaman profil.
5. `role-requests` menggunakan `accounts.grantRole`; persetujuan lapangan tetap milik modul `venues`.
6. `community` menyediakan thread dan moderasi, serta membutuhkan ringkasan profil dari `accounts`.
7. `feed` menyediakan klasifikasi dan pencatatan sinyal, serta menggabungkan sumber dari `community` dan `open-play`.
8. Pemeringkat feed harus murni, deterministik, dan menjelaskan skor; konten baru memakai lokasi dan kebaruan.
9. `admin` hanya merangkum antrean dan membaca audit log; aksi admin lainnya tetap berada di modul pemilik fitur.
10. `vip` dibatasi pada tiga penanda antarmuka nonaktif sampai isi paket dan kebijakannya diputuskan.
11. `jobs` adalah worker fase 3 yang mengambil, memproses, mengirim event, dan menghapus segmen secara aman.
12. `anti_cheat` dikerjakan paling akhir setelah bentuk kontrak tanda disepakati dengan pemilik `devices` dan `level`.

## Hal yang belum jelas atau bertentangan

### Penghalang integrasi

- Belum ada penghalang untuk menyiapkan issue Fase 0 atau melanjutkan profil `accounts`.
- `feed` belum dapat tersambung penuh sampai `community` dan `open-play` menyediakan API sumber konten yang disepakati; pemeringkat dan klasifikasi tetap bisa dikembangkan terpisah.
- `admin` perlu fungsi hitung dari `role-requests`, `venues`, `community`, dan `level`; gunakan integrasi bertahap dan tandai `TODO(integration)` sampai fungsi tersedia.
- `jobs` memerlukan kolom metadata segmen dan pemulihan antrean yang dikoordinasikan dengan pemilik `devices`.
- `anti_cheat` tidak boleh mengirim tanda ke backend sebelum kontrak terpisah disetujui dev-c (`devices`) dan dev-d (`level`).

### Keputusan yang perlu ditandai `TODO(decision)`

- Proposal menetapkan HLS/m3u8 pada keputusan #6, tetapi pertanyaan #13 masih membuka pilihan HLS atau potongan MediaRecorder. Bentuk segmen harus diputuskan sebelum integrasi kamera dan worker difinalkan.
- Kebijakan simpan/reset sinyal feed belum ditentukan; bobot pemeringkatan awal juga perlu diperlakukan sebagai asumsi yang dapat disetel.
- Kebijakan pencabutan role Coach/Owner dan masa retensi audit log belum ditentukan.
- Isi, harga, mekanisme langganan VIP, persetujuan pemain, dan retensi klip VIP belum ditentukan; jangan membuat endpoint, tabel, atau pembayaran VIP.
- Retensi klip/hash anti-cheat, ambang awal, dan bentuk kontrak tanda kecurigaan memerlukan keputusan serta pengukuran.
- Nama aplikasi dan library UI belum diputuskan, tetapi tidak menghalangi issue Fase 0 atau modul pertama.

## Daftar issue

### 1. Mendokumentasikan penunjukan admin pertama

- **Judul:** Document initial admin assignment in Supabase
- **Label:** `mod:admin`, `fase:0`, `docs`
- **Selesai kalau:**
  - `docs/admin-bootstrap.md` menjelaskan cara menunjuk akun admin pertama melalui SQL di Supabase.
  - Dokumentasi menyatakan bahwa penunjukan admin adalah proses internal dan tidak tersedia sebagai endpoint publik.
  - Langkah verifikasi memastikan role admin terbaca backend tanpa mengungkap role admin di profil publik.

### 2. Melengkapi profil dan halaman akun

- **Judul:** Complete account profile management
- **Label:** `mod:accounts`, `fase:1`, `backend`, `frontend`
- **Selesai kalau:**
  - Endpoint update profil, pengalaman per cabang, galeri, penghapusan item milik sendiri, dan signed upload tervalidasi serta tidak lagi berupa stub.
  - Profil publik tidak membocorkan role admin; role hanya ditulis melalui API accounts.
  - Halaman profil saya, profil publik, dan edit profil memakai API modul serta menangani loading dan error.
  - Test mencakup validasi galeri, otorisasi pemilik, bootstrap idempoten, dan bentuk API accounts lintas modul.

### 3. Membangun pengajuan dan persetujuan role

- **Judul:** Implement coach and venue-owner role requests
- **Label:** `mod:role-requests`, `fase:1`, `backend`, `frontend`
- **Selesai kalau:**
  - User dapat mengajukan Coach dengan bukti atau Owner Lapangan, melihat status, dan tidak dapat membuat pengajuan pending ganda untuk role yang sama.
  - Admin dapat meninjau, menyetujui melalui `accounts.grantRole`, atau menolak dengan alasan secara atomik.
  - Halaman pengajuan, status, dan persetujuan menampilkan state loading/error dan membatasi aksi admin di server.
  - Test mencakup penolakan duplikat, approve/reject, approve berulang, dan akses non-admin.

### 4. Membangun komunitas dan moderasi

- **Judul:** Implement community threads and moderation
- **Label:** `mod:community`, `fase:1`, `backend`, `frontend`
- **Selesai kalau:**
  - Thread dan balasan dapat dibaca publik dengan paginasi, konten tersembunyi tidak tampil, dan input/media divalidasi.
  - Pengguna login dapat membuat thread, membalas, meminta signed upload, dan melaporkan konten; admin dapat menindak laporan.
  - Rate limit dan larangan laporan ganda diterapkan di backend; isi ditampilkan sebagai teks biasa.
  - Test mencakup akses publik, konten tersembunyi, laporan duplikat, dan batas media.

### 5. Membangun feed global dan personal

- **Judul:** Implement personalized home and explore feeds
- **Label:** `mod:feed`, `fase:1`, `backend`, `frontend`
- **Selesai kalau:**
  - Fungsi pemeringkat murni dan deterministik memberi skor yang dapat dijelaskan, dengan cold start berdasarkan jarak dan kebaruan.
  - Feed home dan explore mendukung filter serta cursor pagination dan mencatat sinyal pengguna secara tervalidasi.
  - Integrasi konten memakai API `community`/`open-play` yang tersedia; bagian yang menunggu integrasi ditandai jelas.
  - Test mencakup pengaruh sinyal, cold start, filter, dan determinisme.

### 6. Membangun dasbor admin dan audit log

- **Judul:** Implement admin overview and audit log
- **Label:** `mod:admin`, `fase:1`, `backend`, `frontend`
- **Selesai kalau:**
  - Endpoint overview merangkum antrean melalui API modul pemilik dan endpoint audit log mendukung filter serta cursor pagination.
  - Halaman admin dan audit hanya menampilkan data untuk admin; keamanan tetap ditegakkan backend.
  - Test membuktikan audit untuk aksi admin yang sesuai, bukan untuk GET, user biasa, atau respons error.
  - `docs/admin-bootstrap.md` tersedia dan semua integrasi yang belum tersedia ditandai `TODO(integration)`.

### 7. Menyelesaikan penanda VIP tanpa fitur langganan

- **Judul:** Complete VIP coming-soon interface markers
- **Label:** `mod:vip`, `fase:4`, `frontend`
- **Selesai kalau:**
  - Badge, tombol langganan, dan tombol highlight aksesibel serta nonaktif dengan keterangan Coming soon.
  - Klik tombol tidak memulai aksi, request, atau alur pembayaran.
  - Tidak ada endpoint, tabel, atau aturan status VIP yang ditambahkan.
  - Komponen dipasang hanya pada halaman yang disepakati, dengan review pemilik halaman hasil match.

### 8. Menguatkan worker pemrosesan segmen

- **Judul:** Harden YOLO segment worker lifecycle
- **Label:** `mod:jobs`, `fase:3`, `yolo`
- **Selesai kalau:**
  - Worker memakai antrean, storage, dan backend client yang dapat diganti tiruan dalam test.
  - Retry, pemulihan pekerjaan macet, shutdown halus, urutan segmen, pembersihan file, dan batas disk ditangani tanpa membocorkan data sensitif ke log.
  - Segmen dihapus hanya setelah sukses atau kegagalan permanen; kegagalan sementara tetap dapat dicoba ulang.
  - `ruff` dan `pytest` lolos; uji GPU/klip riil dilaporkan hanya bila tersedia.

### 9. Merancang sinyal anti-cheat untuk review manual

- **Judul:** Add privacy-safe anti-cheat suspicion signals
- **Label:** `mod:anti_cheat`, `fase:3`, `yolo`
- **Selesai kalau:**
  - Pemeriksaan murni menghasilkan skor 0–1 dan alasan yang dapat dibaca tanpa menyimpan frame atau klip.
  - Test sintetis mencakup pengulangan, derau, tiap sinyal, dan perubahan ambang.
  - Kontrak terpisah telah disetujui dev-c dan dev-d sebelum worker mengirim tanda ke backend.
  - Benchmark, hasil uji yang tersedia, lisensi, dan batasan/keputusan privasi didokumentasikan tanpa mengarang metrik.

# Proposal Aplikasi Open Play, Skor & Statistik Olahraga

Nov 7, 2026 (diperbarui 8 Nov 2026) · @Jonathan

## Ringkasan Produk

Aplikasi ini menyatukan pemain, coach, dan pemilik lapangan untuk join open play, menghitung skor otomatis dengan AI, dan melacak statistik di lima cabang olahraga.

| Aspek | Isi |
| --- | --- |
| Tujuan | Join open play, menghitung skor, dan menampilkan statistik |
| Cabang olahraga | Basket, Padel, Badminton, Futsal, Tennis |
| Pengguna | User (pemain), Coach, Owner Lapangan, Admin |
| Platform | Web app sekarang; iOS dan Android menyusul dengan API yang sama |
| Pembeda utama | Skor, statistik, dan jam main dihitung kamera AI (YOLO), tidak hanya dicatat manual |
| Fitur VIP | Paket fitur premium (highlight pertandingan otomatis hanya salah satu kandidat) dan badge VIP. Coming soon: baru berupa badge dan tombol nonaktif, belum ada langganan; infrastruktur sedang disiapkan |

Masalah yang diselesaikan:

| Masalah | Solusi di aplikasi |
| --- | --- |
| Open play dan lapangan dicari lewat grup chat yang tersebar | Pencarian open play dan sewa lapangan berdasarkan jarak, lengkap dengan pembayaran dan konfirmasi |
| Pembagian pemain ke lapangan dilakukan manual dan sering tidak merata | Bracket otomatis dari jumlah pemain, jumlah lapangan, dan durasi main |
| Skor dan statistik pemain amatir jarang tercatat | Skor dan statistik dihitung AI (YOLO), dilengkapi input manual coach |
| Sulit menilai pengalaman sesama pemain | Level 0 sampai 300 dari jam main yang diverifikasi AI |
| Mencari alat sewa merepotkan | Rekomendasi sewa alat dari coach atau user terdekat |

## Role dan Hak Akses

Ada empat role. Semua akun mulai sebagai User, lalu bisa mengajukan diri menjadi Coach atau Owner Lapangan, dan pengajuan itu disetujui Admin.

| Role | Siapa | Cara mendapatkan | Hak utama |
| --- | --- | --- | --- |
| User | Pemain | Otomatis saat mendaftar | Cari dan join open play, sewa lapangan dan alat, lihat statistik, posting di komunitas |
| Coach | Pengelola open play | Mengajukan dari akun User, dengan verifikasi pengalaman dan prestasi (teks, gambar, video, atau URL) | Booking lapangan, cari member, buat bracket, kontrol match, input poin peserta |
| Owner Lapangan | Pemilik atau pengelola lapangan | Mengajukan dari akun User, lapangan harus disetujui | Update ketersediaan dan harga lapangan |
| Admin | Tim platform | Ditunjuk internal | Akses ke semua fitur dan bisa melewati batasan role; menyetujui lapangan, pengajuan Coach, dan pengajuan Owner Lapangan; mengatur model dan persentase biaya layanan |

Admin tidak punya label atau badge khusus: pengguna lain melihatnya sebagai user biasa. Satu akun boleh memegang beberapa role sekaligus.

## Profil dan Level

Profil menampilkan identitas pemain beserta Level 0 sampai 300 yang dihitung otomatis dari jam main yang diverifikasi AI.

| Field profil | Isi |
| --- | --- |
| Nama | Nama tampilan pemain |
| Usia | Usia pemain |
| Pengalaman bermain | Lama dan riwayat bermain per cabang olahraga |
| Role | User, Coach, dan atau Owner Lapangan |
| Level | 0 sampai 300, dihitung otomatis |
| Foto | Foto profil |
| Galeri | Foto, video, dan quotes untuk menampilkan pengalaman |
| Badge VIP | Penanda VIP di profil. Coming soon: belum ada pengguna yang memilikinya karena langganan belum dibuka |

### Aturan perhitungan Level

Level mengukur jam terbang yang terverifikasi, bukan skor atau kemenangan. Level berlaku untuk semua cabang olahraga sekaligus (satu Level global), sehingga menunjukkan seberapa aktif pemain berolahraga memakai aplikasi ini.

| Aturan | Ketentuan |
| --- | --- |
| Yang dihitung | Hanya menit saat YOLO mendeteksi aktivitas main nyata, seperti dribble, lari, tembakan, atau interaksi dengan bola. Kamera menyala tanpa gerakan main tidak dihitung |
| Open Play terdaftar (ada bracket dan pemain lain) | 2 XP per menit terverifikasi |
| Main sendiri (hanya satu pemain terdeteksi) | 1 XP per menit terverifikasi |
| Batas harian | Maksimal 180 menit terverifikasi per hari yang dihitung XP |
| Anti-cheat | Rekaman yang diputar ulang atau pola gerakan identik berulang ditandai untuk review manual |

### Kebutuhan XP per level

Kebutuhan XP naik tidak konstan: selisih antar level bertambah 200 XP setiap level mulai Level 4. Contoh: Level 4 ke 5 butuh 400 XP, Level 5 ke 6 butuh 600 XP. Level 0 berarti belum ada sesi terverifikasi.

```latex
XP_{naik}(n) = 200 \times (n - 3), \quad n \ge 4
```

Level 1 dimulai di 0 XP, Level 2 butuh 50 XP, dan Level 3 butuh 100 XP tambahan.

| Level | XP untuk naik ke level ini | XP kumulatif | Jam main (±1,5 XP per menit) | Tercepat (360 XP per hari) |
| --- | --- | --- | --- | --- |
| 2 | 50 | 50 | ~0,6 jam | 1 hari |
| 3 | 100 | 150 | ~1,7 jam | 1 hari |
| 4 | 200 | 350 | ~3,9 jam | 1 hari |
| 5 | 400 | 750 | ~8 jam | 3 hari |
| 6 | 600 | 1.350 | ~15 jam | 4 hari |
| 10 | 1.400 | 5.750 | ~64 jam | 16 hari |
| 20 | 3.400 | 30.750 | ~342 jam | 86 hari |
| 30 | 5.400 | 75.750 | ~842 jam | 7 bulan |
| 50 | 9.400 | 225.750 | ~2.508 jam | 1,7 tahun |
| 100 | 19.400 | 950.750 | ~10.564 jam | 7,2 tahun |
| 150 | 29.400 | 2.175.750 | ~24.175 jam | 16,6 tahun |
| 200 | 39.400 | 3.900.750 | ~43.342 jam | 29,7 tahun |
| 250 | 49.400 | 6.125.750 | ~68.064 jam | 46,6 tahun |
| 300 | 59.400 | 8.850.750 | ~98.342 jam | 67,4 tahun |

Kolom jam memakai rata-rata 1,5 XP per menit (campuran Open Play dan main sendiri). Kolom Tercepat mengasumsikan 180 menit Open Play setiap hari, yaitu 360 XP per hari. Dengan kurva ini Level 300 praktis tidak terjangkau; kurva dipakai apa adanya.

## Olahraga yang Didukung

Lima cabang olahraga didukung dengan alur yang sama (open play, bracket, skor, statistik), tetapi aturan skor dan statistiknya berbeda per cabang.

| Olahraga | Mode main | Format | Satuan skor | Yang dihitung AI (YOLO) | Input manual Coach |
| --- | --- | --- | --- | --- | --- |
| Basket | Tim | Full court dan half court, home dan away | Poin 2 atau 3, ditentukan jarak tembakan | Tembakan masuk, jaraknya, dan tim pencetak (dari warna baju tim) | Pemain yang mencetak skor, pelanggaran |
| Badminton | Tunggal dan ganda | Lapangan dan pemain sesuai bracket | Poin per rally | Kok masuk, jenis pukulan (smash, lob, dll) | Pukulan yang tidak terdeteksi, pelanggaran |
| Tennis | Tunggal dan ganda | Lapangan dan pemain sesuai bracket | Poin | Poin | Pukulan yang tidak terdeteksi, pelanggaran |
| Padel | Tunggal dan ganda | Lapangan dan pemain sesuai bracket | Poin | Poin | Pukulan yang tidak terdeteksi, pelanggaran |
| Futsal | Tim | Lapangan dan tim sesuai bracket | Poin (gol) | Poin | Pencetak gol, jenis tendangan, pelanggaran |

Aturan skor memakai nilai bawaan dari aplikasi untuk tiap cabang. Coach atau User bisa mengganti nilai itu lewat edit match sesuai aturan mereka.

## Fitur per Role

### User

| Fitur | Detail |
| --- | --- |
| Cari open play | Berdasarkan jarak dari lokasi user |
| Join open play | Daftar dan bayar untuk mengamankan slot |
| Sewa lapangan | Pilih lapangan, jam, dan harga dari Owner Lapangan |
| Sewa alat | Rekomendasi alat dari coach atau user yang menyewakan, berdasarkan jarak sesuai lapangan |
| Hitung skor dengan AI | Pairing device untuk skor otomatis |
| Lihat statistik | Poin per game dan statistik per cabang olahraga |
| Community Discussion | Thread khusus tiap olahraga; bagikan pencapaian, skor, pengalaman, video, dan foto |
| Profil | Pengalaman, foto, video, dan Level |
| Ajukan Coach atau Owner Lapangan | Coach melalui verifikasi pengalaman dan prestasi (teks, gambar, video, atau URL); Owner Lapangan melalui persetujuan lapangan |
| Edit match | Mengganti nilai bawaan aturan match sesuai aturan sendiri |
| VIP (coming soon) | Tombol Langganan VIP di profil dan tombol Generate Highlight di halaman hasil match. Keduanya tampil nonaktif dengan label Coming soon |

### Coach

| Fitur | Detail |
| --- | --- |
| Cari member | Mencari pemain untuk open play |
| Booking lapangan | Pilih lapangan, jam, dan lihat harga |
| Sewa raket atau alat | Dari coach atau dari lapangan; rekomendasi diarahkan ke alat milik coach lebih dulu |
| Lihat statistik | Statistik yang dikelola YOLO |
| Informasi lengkap member | Nama, umur, pengalaman main, Level, serta foto, video, atau quotes |
| Bracket otomatis | Dibuat dari jumlah pemain terkonfirmasi, jumlah lapangan, dan durasi |
| Setting match | Mode tunggal atau ganda, waktu, jumlah pemain, time out, dan hydration break per cabang |
| Setting slot | Kuota, jam, dan harga slot open play |
| Control menu match | Timer, pilih pencetak skor, input aksi yang tidak terdeteksi AI, pelanggaran |
| Input poin peserta | Mengisi atau mengoreksi poin tiap peserta |

### Owner Lapangan

| Fitur | Detail |
| --- | --- |
| Update ketersediaan | Jadwal lapangan yang kosong atau terpakai |
| Atur harga | Harga sewa lapangan |

### Admin

| Fitur | Detail |
| --- | --- |
| Setujui lapangan | Menyetujui lapangan yang didaftarkan Owner Lapangan |
| Setujui Coach | Memeriksa verifikasi pengalaman user yang mengajukan jadi Coach |
| Setujui Owner Lapangan | Memeriksa pengajuan user yang ingin jadi Owner Lapangan |
| Atur biaya layanan | Memilih model (potongan persen saat withdraw atau fee dibebankan ke pembayar) dan menentukan persentasenya |
| Akses semua fitur | Bisa melewati batasan role di semua fitur, dan tampil sebagai user biasa |

## Pembayaran dan Biaya Layanan

Semua pembayaran masuk ke aplikasi lebih dulu, lalu aplikasi meneruskannya ke tujuan setelah dipotong biaya layanan.

| Langkah | Yang terjadi |
| --- | --- |
| 1. Bayar | User membayar open play, sewa lapangan, atau (nanti) sewa alat ke aplikasi |
| 2. Ditampung | Aplikasi menampung dana lewat payment gateway |
| 3. Diteruskan | Setelah transaksi selesai, dana diteruskan ke tujuan (Coach atau Owner Lapangan) dikurangi biaya layanan |
| 4. Tarik dana | Penerima menarik saldo yang sudah masuk (withdraw) |

Model biaya layanan dipilih dan diatur oleh Admin lewat panel Admin, sehingga bisa diganti tanpa mengubah aplikasi. Dua model yang didukung:

| Model | Cara kerja |
| --- | --- |
| Potongan persen saat withdraw | Penerima menarik dana, lalu aplikasi memotong persentase dari jumlah yang ditarik |
| Fee dibebankan ke pembayar | Fee ditambahkan ke harga yang dibayar user |

Besaran persentase juga ditentukan Admin. Payment gateway biasanya memotong biaya sendiri, jadi perhitungan fee perlu memasukkan itu.

## Halaman Utama dan Personalisasi

Halaman utama punya dua jalur: "Let me choose for you" yang disusun dari kebiasaan user, dan menu global yang menampilkan semua cabang olahraga tanpa personalisasi.

### Let me choose for you

| Sinyal kebiasaan | Contoh data | Dipakai untuk |
| --- | --- | --- |
| Apa yang dicari | Kata kunci pencarian user | Open play, lapangan, dan thread yang relevan |
| Open play yang diikuti | Riwayat join open play | Cabang olahraga dan lokasi yang sering dipilih |
| Topik yang dibahas | Thread yang dibaca, dibalas, atau diposting di komunitas | Konten komunitas yang sesuai minat |
| Lokasi | Posisi user | Open play dan sewa alat terdekat |

### Klasifikasi konten

Setiap konten yang dipublikasikan ke halaman utama diberi klasifikasi, lalu dicocokkan dengan kebiasaan user di atas sehingga yang tampil sesuai preferensinya.

| Dimensi klasifikasi | Contoh nilai |
| --- | --- |
| Cabang olahraga | Basket, Padel, Badminton, Futsal, Tennis |
| Jenis konten | Open play, lapangan, sewa alat, thread, pencapaian, skor |
| Format | Teks, foto, video |
| Lokasi | Area atau kota konten |
| Level yang relevan | Rentang Level pemain yang cocok |

Klasifikasi dibuat otomatis oleh sistem berdasarkan apa yang biasa dimainkan dan dicari user, dan user bisa memfilter tampilan halaman utama.

## Bracket Otomatis

Bracket membagi pemain yang sudah terkonfirmasi dan membayar ke lapangan yang disewa, sehingga selisih jumlah main antar pemain paling banyak satu match.

### Aturan pembagian

| Langkah | Aturan |
| --- | --- |
| 1. Peserta | Hanya pemain yang sudah join dan membayar yang masuk bracket |
| 2. Kapasitas per ronde | Jumlah lapangan × jumlah pemain per lapangan |
| 3. Pemain istirahat | Jumlah peserta dikurangi kapasitas, bergantian tiap ronde |
| 4. Jumlah ronde | Durasi total dibagi (durasi match + jeda), dibulatkan ke bawah |
| 5. Prioritas main | Pemain dengan jumlah main paling sedikit masuk lebih dulu |
| 6. Pasangan dan lawan | Dirotasi supaya tidak bertemu pasangan yang sama berulang |
| 7. Koreksi | Coach bisa mengubah susunan secara manual sebelum atau saat bracket berjalan |

### Pemain per lapangan menurut mode

Badminton, tennis, dan padel bisa dimainkan tunggal atau ganda. Coach memilih mode di setting match, dan bracket menghitung kapasitas lapangan dari pilihan itu.

| Cabang | Tunggal | Ganda |
| --- | --- | --- |
| Badminton | 2 pemain per lapangan | 4 pemain per lapangan |
| Tennis | 2 pemain per lapangan | 4 pemain per lapangan |
| Padel | 2 pemain per lapangan | 4 pemain per lapangan |

Basket dan futsal tidak punya mode ini; yang dirotasi adalah tim. Basket bisa dimainkan full court atau half court; jumlah pemain per sisi untuk half court bebas dan diatur Coach di setting match, dengan tim dikenali dari warna baju.

### Contoh badminton: 3 lapangan, 16 pemain (ganda)

Tiap ronde 12 pemain main dan 4 istirahat. Dalam 4 ronde, setiap pemain main 3 kali dan istirahat 1 kali.

| Ronde | Lapangan 1 | Lapangan 2 | Lapangan 3 | Istirahat |
| --- | --- | --- | --- | --- |
| 1 | P1+P2 vs P5+P6 | P3+P4 vs P7+P8 | P9+P10 vs P11+P12 | P13 sampai P16 |
| 2 | P1+P13 vs P5+P14 | P2+P15 vs P6+P16 | P3+P7 vs P4+P8 | P9 sampai P12 |
| 3 | P1+P9 vs P10+P13 | P2+P11 vs P12+P14 | P3+P15 vs P4+P16 | P5 sampai P8 |
| 4 | P5+P13 vs P9+P14 | P6+P10 vs P11+P15 | P7+P12 vs P8+P16 | P1 sampai P4 |

Jika durasi cukup untuk lebih dari 4 ronde, siklus diulang dengan pasangan baru.

### Contoh per cabang dan mode

| Cabang | Mode | Lapangan | Peserta | Main per ronde | Istirahat per ronde | Ronde per siklus | Main per pemain |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Badminton | Ganda | 3 | 16 | 12 | 4 | 4 | 3 |
| Badminton | Tunggal | 2 | 6 | 4 | 2 | 3 | 2 |
| Tennis | Tunggal | 3 | 8 | 6 | 2 | 4 | 3 |
| Tennis | Ganda | 1 | 6 | 4 | 2 | 3 | 2 |
| Padel | Ganda | 2 | 10 | 8 | 2 | 5 | 4 |
| Padel | Tunggal | 1 | 4 | 2 | 2 | 2 | 1 |
| Basket full court (3 tim × 5) | Tim | 1 | 15 | 10 | 5 | 3 | 2 |
| Futsal (5 tim × 5) | Tim | 2 | 25 | 20 | 5 | 5 | 4 |

Untuk basket dan futsal, yang dirotasi adalah tim: pada basket dengan 15 pemain, tiga match saling bertemu (T1-T2, T1-T3, T2-T3) dan tiap tim istirahat sekali. Jika peserta basket tepat 10 orang, semua main di satu lapangan 5 lawan 5 dan tim diacak ulang tiap ronde.

## Setting Match dan Control Menu

Coach mengatur match dan slot sebelum open play dimulai, lalu menjalankan match lewat control menu di device controller.

### Setting match (per cabang olahraga)

| Parameter | Fungsi |
| --- | --- |
| Mode main | Tunggal atau ganda untuk badminton, tennis, dan padel; menentukan jumlah pemain per lapangan |
| Waktu | Durasi match atau ronde |
| Jumlah pemain | Pemain per sisi atau per lapangan |
| Time out | Jumlah dan lama time out |
| Hydration break | Jeda minum, kapan dan berapa lama |
| Jeda antar ronde | Waktu pergantian pemain dan lapangan; dipakai bracket untuk menghitung jumlah ronde |

Tiap cabang punya nilai bawaan dari aplikasi. Coach atau User bisa mengedit match dan mengganti nilai bawaan sesuai aturan mereka.

### Setting slot

| Parameter | Fungsi |
| --- | --- |
| Lapangan dan jam | Lapangan yang dibooking dan jam open play |
| Kuota peserta | Jumlah pemain maksimal |
| Harga per slot | Biaya yang dibayar peserta |
| Status slot | Terbuka atau penuh |

### Control menu saat bracket berjalan

| Kontrol | Fungsi |
| --- | --- |
| Timer | Mulai, pause, dan lanjut match |
| Pencetak skor | Coach memilih pemain yang mencetak skor dari daftar bracket |
| Aksi yang tidak terdeteksi AI | Input jenis tendangan, shoot, atau pukulan |
| Pelanggaran | Mencatat pelanggaran pemain |
| Time out dan hydration break | Menjalankan jeda sesuai setting match |
| Lihat bracket | Melihat ronde berjalan dan ronde berikutnya |

## AI Detection dan Device Pairing

Satu sesi pertandingan memakai maksimal 3 device: 2 kamera untuk sisi home dan away, dan 1 controller yang mengatur jalannya match.

| Device | Jumlah | Tugas |
| --- | --- | --- |
| Kamera Home | 1 | Merekam sisi home; YOLO mendeteksi aktivitas main, skor, dan jenis pukulan |
| Kamera Away | 1 | Merekam sisi away dengan fungsi yang sama |
| Controller | 1 | Dipegang Coach untuk memilih siapa yang mencetak skor, melihat bracket, pause, dan kontrol lain di control menu |

Aktivitas yang tidak bisa dideteksi AI, seperti jenis tendangan, shoot, pukulan, dan pelanggaran, diinput Coach lewat controller.

Video dari kamera dipecah menjadi beberapa bagian berformat m3u (HLS), maksimal 50 MB per bagian, lalu diteruskan ke server. Video tidak disimpan permanen di device: bagian yang belum terkirim hanya ditahan sementara (lihat Antrean saat koneksi terputus) dan dihapus setelah terkirim. Pairing device lewat QR atau kode sesi.

Diagram (versi teks): dua kamera mendeteksi, satu controller mengatur jalannya match.

```
Kamera Home (merekam sisi home) ──┐
                                  ├──► Deteksi YOLO ──► Aplikasi
Kamera Away (merekam sisi away) ──┘    - aktivitas main nyata      - poin per game
                                       - skor dan jenis pukulan    - statistik pemain
                                       - jarak tembakan (basket)   - jam main untuk Level
                                                                        ▲
                                              pilih skor, pause,        │
                                              lihat bracket             │
                                                          Controller (Coach)
```

Catatan: maksimal 3 device per sesi (2 kamera dan 1 controller). Pairing lewat QR atau kode sesi.

Kedua kamera mengirim hasil deteksi YOLO ke aplikasi, sedangkan controller Coach menambahkan pilihan pencetak skor dan input manual.

### Penyimpanan video di server

Video hanya dipakai selama deteksi YOLO berjalan untuk scoring dan statistik realtime. Setelah sebuah bagian video selesai diproses, video dihapus. Yang disimpan hanya hasilnya: skor, statistik, dan menit main. Persetujuan pemain sebelum direkam tetap diperlukan (lihat Risiko dan Mitigasi). Fitur VIP seperti highlight (coming soon) membutuhkan klip tersimpan, jadi kebijakan retensinya harus diputuskan sebelum fitur itu dibangun.

### Antrean saat koneksi terputus

Bagian video yang belum terkirim tidak dibuang.

| Langkah | Yang terjadi |
| --- | --- |
| 1. Koneksi putus | Bagian video yang belum terkirim ditahan sementara di device kamera |
| 2. Label status | Layar menampilkan label, misalnya: "Jaringan device terputus. Analisa akan dilanjutkan otomatis saat terhubung ke internet." |
| 3. Koneksi pulih | Bagian video dikirim berurutan ke server, YOLO memproses, lalu skor dan statistik game diperbarui |
| 4. Bersih-bersih | Bagian yang sudah terkirim dihapus dari device |
| Selama putus | Coach tetap bisa memasukkan skor manual lewat controller. Cara memadukan skor manual dengan hasil AI yang menyusul masih perlu diputuskan |

## Scoring dan Statistik

Poin per game dihitung YOLO, dan Coach bisa menginput atau mengoreksi poin tiap peserta bila AI tidak menangkapnya.

### Cakupan deteksi AI tahap awal

AI difokuskan pada satu hal: melacak bola dan mengenali kejadian bola terhadap target yang diam. Penghitungan skor (aturan poin, game, set) dikodekan nanti di back end berdasarkan kejadian tersebut, sehingga AI tidak menghitung skor sendiri.

| Cabang | Kejadian yang dideteksi AI | Catatan |
| --- | --- | --- |
| Basket | Bola masuk ring | Pembeda 2 dan 3 poin belum tercakup oleh kejadian ini (lihat Pertanyaan Terbuka) |
| Futsal | Bola masuk gawang | Gol dihitung dari kejadian ini |
| Badminton | Kok jatuh di dalam atau di luar garis | Poin dihitung dari kejadian ditambah aturan rally |
| Tennis dan padel | Belum ditentukan | Usulan: bola mendarat di dalam atau di luar garis, seperti badminton |

Usulan: posisi ring, gawang, dan garis ditandai sekali oleh Coach saat setup (kalibrasi, seperti klik 4 sudut pada repo badminton), karena targetnya tidak bergerak. Dengan begitu model cukup fokus pada bola.

Level dan jam main tetap butuh deteksi aktivitas main nyata (orang dan bola), jadi deteksinya tidak terbatas pada ring, gawang, atau garis. Model YOLO standar sudah mengenal kelas orang dan bola.

### Sumber data statistik

| Statistik | Sumber |
| --- | --- |
| Poin per game | YOLO |
| Poin tiap peserta | Input Coach (tambahan atau koreksi) |
| Jam main terverifikasi | YOLO, dipakai untuk Level |
| Riwayat open play | Sistem aplikasi |

### Aturan per cabang

| Cabang | Cara menghitung | Statistik |
| --- | --- | --- |
| Basket | Tembakan masuk dihitung 2 atau 3 poin berdasarkan jarak tembakan. Tim pencetak dikenali AI dari warna baju tim. Coach memilih pemain yang mencetak skor. Saat home menyerang, daftar yang tampil adalah pemain home; saat away menyerang, daftar yang tampil adalah pemain away. Daftar pemain diambil dari jadwal bracket | Poin per game, jumlah tembakan 2 poin dan 3 poin |
| Badminton | Poin dihitung saat kok masuk | Poin per game, jumlah smash, lob, dan jenis pukulan lain |
| Tennis | Hitung poin | Poin per game |
| Padel | Hitung poin | Poin per game |
| Futsal | Hitung poin (gol) | Poin per game |

## VIP: Fitur Premium (Coming Soon)

Status: belum diterapkan, dan infrastrukturnya sedang disiapkan. VIP direncanakan sebagai paket fitur premium. Isinya masih dipikirkan, dan highlight pertandingan otomatis hanyalah salah satu kandidat. Yang ada sekarang hanya penanda di antarmuka.

| Elemen | Perilaku sekarang | Rencana nanti |
| --- | --- | --- |
| Badge VIP | Elemen tampilan di profil. Belum ada pengguna yang memilikinya | Muncul di profil pelanggan VIP |
| Tombol Langganan VIP | Tampil dengan label Coming soon, nonaktif, tanpa pembayaran | Membuka alur langganan |
| Tombol Generate Highlight | Ada di halaman hasil match, nonaktif, berlabel Coming soon | Kandidat fitur VIP; keputusan akhir mengikuti isi paket |
| Fitur VIP lainnya | Belum ditentukan | Masih dipikirkan |
| Harga, paket, dan pembayaran | Belum ada | Ditentukan nanti lewat payment gateway yang sama |

Catatan:
- Tidak ada endpoint langganan atau fitur VIP yang dibangun sekarang. Tombol hanya menampilkan pesan Coming soon.
- Fitur VIP yang butuh video tersimpan (misal highlight) bertentangan dengan kebijakan menghapus video. Jika deteksi dipindah ke device (lihat Strategi komputasi tanpa budget), video tidak sampai ke server sama sekali, sehingga fitur seperti itu butuh jalur penyimpanan sendiri. Putuskan sebelum fitur dibangun.

## Arsitektur: Front End dan Back End API

Aplikasi dipisah menjadi dua bagian: front end yang menampilkan layar, dan back end berupa API yang menjalankan semua aksi. Dengan begitu app iOS dan Android nanti cukup memanggil API yang sama dengan web, tanpa menulis ulang logika bisnis.

Diagram (versi teks): satu API melayani web sekarang dan iOS serta Android nanti.

```
Klien                          Back end API                       Layanan data

Web front end (sekarang)  ──┐                                ┌──►  Database (akun, match, statistik)
App iOS (menyusul)        ──┼──►  Back end API (REST dan  ───┼──►  Penyimpanan media (foto dan video)
App Android (menyusul)    ──┘     WebSocket)                 └──◄► Layanan AI (YOLO, deteksi dari kamera)

Isi Back end API: akun, role, dan profil · open play, slot, dan booking · bracket dan match ·
skor, statistik, dan Level · komunitas dan feed · lapangan dan sewa alat
```

Semua klien memanggil API yang sama; tidak ada aturan bisnis di klien.

Front end hanya menampilkan data dan mengirim aksi pengguna; aturan bracket, skor, Level, dan hak akses hidup di back end.

### Prinsip

| Prinsip | Artinya |
| --- | --- |
| Pisah front end dan back end | Front end hanya menampilkan data dan mengirim aksi; aturan bisnis ada di back end |
| API lebih dulu | Setiap fitur dibuat sebagai endpoint API lebih dulu; web hanyalah salah satu klien |
| Satu API untuk semua klien | Web, iOS, dan Android memanggil endpoint yang sama |
| Hak akses dicek di server | Role User, Coach, Owner Lapangan, dan Admin dicek di back end pada setiap permintaan |
| Update langsung | Timer, skor live, dan pairing device memakai koneksi real-time (WebSocket) |
| Versi API | Endpoint diberi versi supaya app lama tetap jalan ketika API berubah |

Baris Update langsung dan Versi API adalah usulan teknis; teknologi yang dipakai ada di bagian Tumpukan teknologi di bawah.

### Kelompok API

Tiap kelompok menjadi satu modul di back end. Nama dan rincian endpoint masih usulan.

| Modul | Aksi utama | Dipakai oleh |
| --- | --- | --- |
| Akun dan profil | Daftar, login, ubah profil, galeri, lihat Level | Semua role |
| Pengajuan role | Ajukan jadi Coach atau Owner Lapangan, setujui atau tolak | User, Admin |
| Lapangan | Daftar lapangan, update ketersediaan dan harga, persetujuan lapangan | Owner Lapangan, Admin, User |
| Open play dan slot | Buat open play, setting slot, cari berdasarkan jarak, join dan bayar | Coach, User |
| Booking dan pembayaran | Sewa lapangan, status pembayaran, saldo, penarikan (withdraw), dan pengaturan biaya layanan | User, Coach, Admin |
| Sewa alat | Daftar alat, rekomendasi berdasarkan jarak, sewa | User, Coach |
| Bracket dan match | Buat bracket, setting match, mulai, pause, timer | Coach |
| Skor dan statistik | Kirim skor, input manual Coach, ambil statistik per game | Coach, User, AI |
| Device dan AI | Buat sesi pairing, pasang device, kirim hasil deteksi | Coach, device |
| Level | Hitung jam main terverifikasi, ambil Level | Sistem, User |
| Komunitas dan feed | Thread, posting, unggah foto dan video, feed Let me choose for you | User |
| VIP | Belum dibangun, infrastruktur sedang disiapkan. Antarmuka hanya menampilkan badge dan tombol Coming soon | - |

API dibangun sejak Fase 1, jadi app mobile nanti hanya menambah klien baru. Kebutuhan yang baru muncul di mobile, seperti notifikasi push, ditambahkan sebagai modul baru tanpa mengubah API yang ada.

### Tumpukan teknologi (usulan)

Yang kamu pilih: Supabase dan Heroku, ditambah Vercel bila kurang. Pembagian tugas di bawah adalah usulan.

| Bagian | Pilihan | Tugas |
| --- | --- | --- |
| Database dan penyimpanan file | Supabase | Data aplikasi, serta foto dan potongan video |
| Back end API | Heroku | Menjalankan REST API dan WebSocket |
| Front end web | Next.js (React + TypeScript), di-hosting di Vercel | Tampilan web |
| App mobile | React Native (Expo) | Memanggil API yang sama dengan web; berbagi bahasa TypeScript dan klien API dengan web |
| Layanan AI (YOLO) | Python (FastAPI) di server GPU sewa terpisah (folder yolo-service); testing di laptop RTX | Menjalankan model YOLO |

Tiga batasan teknis yang perlu dicek sebelum stack dikunci (per 8 Nov 2026):

| Hal | Dampak | Usulan |
| --- | --- | --- |
| Supabase paket gratis membatasi ukuran file 50 MB, paket Pro jauh lebih besar ([Supabase file limits](https://supabase.com/docs/guides/storage/uploads/file-limits)) | Sejalan dengan batas 50 MB per bagian video, tetapi paket gratis hanya cocok untuk pengembangan | Pilih paket sesuai kebutuhan sebelum peluncuran |
| Router Heroku memutus permintaan yang tidak dijawab dalam 30 detik dan batas ini tidak bisa diubah ([Heroku Request Timeout](https://devcenter.heroku.com/articles/request-timeout)) | Upload bagian video 50 MB lewat Heroku berisiko gagal | Upload bagian video langsung ke penyimpanan Supabase, dan jalankan pemrosesan berat di background worker |
| Daftar dyno Heroku yang saya temukan hanya berbasis CPU (terbesar 14 GB RAM) dan tidak mencantumkan GPU ([perbandingan dyno](https://getdeploying.com/coreweave-vs-heroku)) | Deteksi YOLO pada video bisa lambat atau mahal | Ukur kebutuhan komputasi YOLO dulu; bila kurang, jalankan layanan AI di server terpisah |

### Strategi komputasi tanpa budget (usulan, per 8 Nov 2026)

Pembaruan 8 Nov 2026: keputusan akhir memakai GPU sewa terpisah (lihat keputusan 20), dengan testing di laptop RTX. Bagian ini dipertahankan sebagai alternatif bila budget tidak tersedia.

Kondisi: tidak ada laptop untuk dijadikan server dan tidak ada anggaran sewa. Heroku tidak menyediakan GPU dan kreditnya kecil, jadi YOLO di server tidak bisa gratis. Jalur utama yang diusulkan adalah menjalankan deteksi di device kamera (browser atau app), bukan di server.

| Opsi | Cara kerja | Biaya | Catatan |
| --- | --- | --- | --- |
| Deteksi di device kamera (usulan utama) | Model YOLO nano diekspor ke ONNX dan dijalankan di browser lewat ONNX Runtime Web (WebGPU, atau WASM sebagai cadangan). Ke server hanya dikirim kejadian kecil, misal "bola masuk ring pada detik ke-312" | Nol untuk server; memakai HP yang sudah dipakai sebagai kamera | Demo publik melaporkan YOLO11 nano sekitar 60 FPS dengan WebGPU dan sekitar 4 sampai 5 FPS di CPU; satu pengembang melaporkan YOLOv8n resolusi kecil sekitar 25 sampai 28 FPS di iPhone modern lewat WASM. Itu angka dari demo orang lain, bukan HP target kita, jadi ukur dulu |
| Latih model di Google Colab atau Kaggle | Dipakai di browser, tanpa laptop kuat, untuk melatih deteksi bola, ring, gawang | Gratis dengan kuota (kuota bisa berubah, cek dulu) | Untuk melatih, bukan untuk melayani match |
| Kredit GitHub Student Pack | Selain Heroku, paket mahasiswa memuat kredit Azure sekitar $100 | Gratis, terbatas | Belum saya pastikan apakah bisa dipakai untuk VM GPU; cek kuotanya |
| Server CPU gratis (Oracle, Hugging Face Spaces) | Hanya cadangan | Gratis | Terlalu lambat untuk video realtime; Oracle butuh kartu; angka free tier berubah-ubah |
| Sewa GPU per jam | Hanya saat match berjalan | Berbayar | Baru bila kelak ada pemasukan, misal dari biaya layanan |

Konsekuensi bila deteksi dipindah ke device (perlu persetujuanmu, karena mengubah keputusan 6 dan 16):
- Video tidak perlu diunggah: tidak ada bagian HLS 50 MB dan tidak ada penyimpanan video di server. Yang antre saat koneksi putus hanya kejadian kecil, jadi antrean offline jauh lebih ringan.
- Server tidak melihat video, sehingga hasil deteksi bisa dipalsukan dari device yang dimodifikasi. Anti-cheat Level jadi lebih sulit.
- Risiko teknis: HP panas dan baterai habis saat match 1 sampai 3 jam, dukungan WebGPU berbeda antar browser, dan resolusi kecil menyulitkan bola kecil dan cepat seperti kok.
- Langkah pertama sebelum melatih apa pun: ukur FPS model nano di HP target.

#### Format model: ONNX atau LiteRT (TFLite)

TFLite kini bernama LiteRT dan memakai format file .tflite yang sama. Formatnya sendiri tidak otomatis lebih ringan daripada ONNX. Perbedaannya ada pada tempat model berjalan.

| Aspek | ONNX Runtime Web (browser) | LiteRT / TFLite (app native) |
| --- | --- | --- |
| Berjalan di | Browser HP, tanpa instal | App Android atau iOS yang harus diinstal |
| Cocok dengan rencana | Web sekarang, tanpa biaya toko aplikasi | Fase 4 (app mobile) |
| Syarat GPU | WebGPU, atau WASM yang lebih lambat | GPU delegate native, tidak bergantung pada WebGPU browser |
| Distribusi | Cukup URL | Android bisa lewat APK langsung; iOS umumnya butuh akun developer berbayar (cek biayanya) |
| Beban dan suhu | Ada lapisan browser (perkiraan: lebih berat) | Umumnya lebih efisien (perkiraan, belum diukur) |

Usulan: latih satu kali di Colab, ekspor ke ONNX untuk browser dan ke LiteRT untuk app native dari bobot yang sama, lalu ukur keduanya di HP target. Dengan begitu keputusan format bisa ditunda tanpa kerja ulang. Catatan: ekspor LiteRT dari Ultralytics saat ini didukung di Linux x86_64 dan macOS, dan kuantisasi INT8 tidak otomatis lebih cepat di GPU (lihat benchmark Ultralytics).

Sumber: [Ultralytics: ekspor YOLO ke LiteRT](https://www.ultralytics.com/blog/export-ultralytics-yolo-with-litert-for-edge-and-browser-deployment), [Ultralytics: benchmark TFLite dan LiteRT di Android](https://docs.ultralytics.com/pt/integrations/tflite).

#### Syarat minimal device kamera (usulan awal, perlu diukur)

Tidak ada angka minimal resmi untuk kasus kita. Angka final harus berasal dari uji di HP target. Syarat awal:

| Aspek | Syarat awal | Dasar |
| --- | --- | --- |
| Android | Android 12 ke atas, Chrome 121 ke atas, GPU Qualcomm atau ARM | Syarat dukungan WebGPU di Android ([web.dev](https://web.dev/blog/webgpu-supported-major-browsers)) |
| iPhone dan iPad | iOS 26 atau lebih baru agar WebGPU aktif di Safari. Versi lebih lama hanya bisa WASM (lebih lambat) | web.dev, dan laporan FPS WASM di atas |
| Chipset dan RAM | Kelas menengah ke atas, rilis 2021 ke atas, RAM 6 GB ke atas | Perkiraan, belum diuji |
| Kamera | Minimal 1080p 30 fps, dipasang di tripod atau dudukan tetap | Perkiraan |
| Daya dan suhu | Tersambung charger atau power bank selama match, tidak terjemur matahari | Perkiraan, inferensi lama membuat HP panas |
| Internet | Hanya untuk mengirim kejadian kecil; boleh putus dan antre | Desain deteksi di device |
| Penyimpanan | Bukan kendala; model nano sekitar 10 MB | Contoh model YOLO11 nano hasil ekspor ONNX |

Uji penerimaan (usulan):
1. Jalankan demo YOLO ONNX Runtime Web (repo contoh di atas) di HP kandidat dengan model nano.
2. Catat FPS rata-rata dan terendah selama 30 menit, suhu HP, dan penurunan baterai.
3. Target awal: sekitar 15 FPS atau lebih, stabil selama 30 menit tanpa melambat karena panas, untuk basket dan futsal. Badminton mungkin butuh FPS lebih tinggi karena kok cepat; angkanya ditentukan dari uji. Target ini asumsi saya, bukan standar.
4. Saat pairing, app mengecek kemampuan device (ada WebGPU atau tidak, benchmark singkat). Jika di bawah target, app memberi peringatan dan Coach memakai input manual.

Sumber: [YOLO nano di browser (WebGPU, ONNX Runtime Web)](https://vuihoc-web.pages.dev/blog/train-object-detection-realtime-web/), [YOLO di browser dengan ONNX dan WebAssembly](https://pyimagesearch.com/2025/07/28/run-yolo-model-in-the-browser-with-onnx-webassembly-and-next-js/), [repo contoh YOLO ONNX Runtime Web](https://github.com/nomi30701/yolo-object-detection-onnxruntime-web), [Heroku untuk mahasiswa](https://heroku.com/github-students), [Heroku tidak menawarkan GPU](https://northflank.com/blog/northflank-vs-heroku).

### Alur video dan deteksi (usulan)

Alur ini berlaku bila deteksi dijalankan di server. Jika memakai deteksi di device (lihat Strategi komputasi tanpa budget), langkah 1 sampai 3 diganti: device menjalankan YOLO sendiri dan hanya mengirim kejadian ke back end API.

1. Kamera Home dan Away memecah rekaman menjadi bagian berformat m3u (HLS), maksimal 50 MB per bagian.
2. Setiap bagian dikirim ke server. Jika koneksi putus, bagian ditahan sementara di device dan dikirim otomatis saat terhubung kembali, lalu dihapus dari device.
3. Layanan AI (YOLO) memproses bagian video dan menghasilkan deteksi skor, jenis pukulan, dan jam main.
4. Hasil deteksi masuk ke back end API, yang memperbarui poin per game dan statistik.
5. Controller Coach menerima skor secara langsung lewat WebSocket dan menambahkan input manual.

## Referensi Repo dan Model YOLO

Repo yang sudah dikumpulkan. Isinya berdasarkan README masing-masing, belum dijalankan atau diuji. Kesimpulan penting: tidak satu pun repo yang langsung menghasilkan skor pertandingan. Semuanya berupa komponen (deteksi pemain, bola, gawang, lapangan, atau lintasan), sehingga logika skor dibangun sendiri.

| Cabang | Repo | Yang dilakukan | Yang belum ada atau catatan |
| --- | --- | --- | --- |
| Basket | [petermartens98/Finetuned-YOLO-and-Supervision-Basketball-Video-Tracker](https://github.com/petermartens98/Finetuned-YOLO-and-Supervision-Basketball-Video-Tracker) | YOLOv5 untuk pemain dan bola, ByteTrack, tim dari warna baju, penguasaan bola | Tidak menghitung tembakan atau skor. Dilatih untuk video siaran NBA |
| Basket | [nvan21/Basketball-Shot-Detection](https://github.com/nvan21/Basketball-Shot-Detection) | YOLOv8 untuk bola dan ring, lintasan bola, memprediksi apakah tembakan masuk dari lintasan | README menyebut belum bisa melihat apakah bola benar-benar masuk dan video 2D bisa menyesatkan. Tidak ada pembedaan 2 dan 3 poin |
| Badminton | [jiazimo0308/Yolo-and-TrackNet-Badminton-Analysis](https://github.com/jiazimo0308/Yolo-and-TrackNet-Badminton-Analysis) | Pelacakan pemain (YOLOv8), pose, kecepatan dan jarak lari, deteksi kok dengan TrackNet dan YOLO11, peta mini lapangan | Tidak menghitung poin atau jenis pukulan. Penulis menyebut deteksi kok belum ideal. Kalibrasi lapangan manual (klik 4 sudut). README utama berbahasa Mandarin. Lisensi tidak terlihat |
| Padel | [andresgilvicente/padel-ai-system](https://github.com/andresgilvicente/padel-ai-system) | Pelacak bola (warna, gerak, dan filter Kalman, bukan YOLO), YOLOv8-Pose untuk pemain, validasi servis valid atau fault, deteksi pantulan, satu kamera ponsel | Tidak menghitung poin pertandingan. Proyek kuliah. Lisensi tidak terlihat |
| Futsal | [andreus94/AI-tracker](https://github.com/andreus94/AI-tracker) | YOLO11 untuk pemain dan bola, penguasaan bola per tim, FastAPI dan MinIO, Dockerfile dengan GPU | Gol, assist, dan pelanggaran baru berupa rencana pengembangan |
| Futsal | [Roboflow Universe: futsal-analysis](https://universe.roboflow.com/arnathorn/futsal-analysis) | Model YOLOv11 dengan kelas ball, referee, goal, goalkeeper, dan player | Titik awal untuk bola dan gawang. Logika gol dibuat sendiri. Lisensi dataset perlu dicek |
| Futsal | [Portofolio SPORTSCORE (mehdihch)](https://mehdihch.github.io/Portfolio/projects/1-futsal-analysis-sportscore) | YOLOv11x, DeepSORT, homography, presisi deteksi bola 90,1% | Tulisan portofolio, ketersediaan kode belum diketahui |
| Tennis | [rishn/adobe-gensolve-finale](https://github.com/rishn/adobe-gensolve-finale) | YOLO dan keypoint lapangan untuk analisis pemain dan bola, bertopik score-tracking | Proyek kecil tanpa bintang, kualitas skor belum teruji |
| Tennis dan badminton | [TrackNet (arXiv 1907.03698)](https://arxiv.org/abs/1907.03698) | Jaringan heatmap untuk melacak bola kecil dan cepat | Komponen lacak bola, bukan penghitung skor |
| Tennis | [Oushesh/tennis-count](https://github.com/Oushesh/tennis-count) | Catatan langkah dan referensi: lacak bola, deteksi pantulan, deteksi lapangan | Bukan kode jadi |

Pendekatan yang diusulkan untuk skor: AI mengusulkan kejadian (misal bola masuk gawang, bola mendarat di luar garis), lalu Coach mengonfirmasi lewat controller. Input manual penuh tetap tersedia sebagai cadangan. Futsal dan tennis paling berisiko karena belum ada dasar penghitung skor, sedangkan basket, badminton, dan padel sudah punya komponen awal.

## Roadmap Pengembangan

Usulan urutan empat fase: AI detection baru masuk di Fase 3, setelah open play berjalan penuh secara manual, supaya platform sudah bisa dipakai sebelum bagian paling berat dibangun. Back end API dibangun sejak Fase 1, sehingga web dan app mobile memakai API yang sama.

Diagram (versi teks): empat fase berurutan; tiap gate jadi syarat masuk fase berikutnya (usulan, belum ada tanggal).

| Fase | Isi | Gate untuk lanjut ke fase berikutnya |
| --- | --- | --- |
| Fase 1: Fondasi platform | Akun dan profil, role dan verifikasi, cari open play, sewa lapangan, pembayaran, komunitas, halaman utama, penanda VIP (badge dan tombol Coming soon) | Gate 1: open play pertama berjalan dengan pembayaran |
| Fase 2: Match manual | Bracket otomatis, setting match, setting slot, control menu, input skor manual, statistik dasar | Gate 2: Coach menjalankan open play penuh secara manual |
| Fase 3: AI detection | Pairing 3 device, YOLO di 5 cabang, antrean saat koneksi terputus, Level dan jam main, anti-cheat | Gate 3: akurasi skor lolos uji di lapangan |
| Fase 4: Ekspansi | App iOS dan Android, sewa alat, personalisasi. Fitur VIP menyusul setelahnya (belum dijadwalkan) | - |

Level baru tampil di profil sejak Fase 3 karena bergantung pada deteksi AI. AI dipasang untuk kelima cabang sejak Fase 3. Repo yang sudah dikumpulkan ada di bagian Referensi Repo dan Model YOLO. Tidak satu pun sudah menghasilkan skor siap pakai, jadi logika skor dibangun sendiri di atas komponen deteksi tersebut.

## Risiko dan Mitigasi

Risiko terbesar ada di AI detection, karena skor dan Level bergantung pada akurasinya.

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Akurasi YOLO turun karena cahaya, sudut kamera, atau lapangan ramai | Skor atau statistik salah | Panduan posisi kamera, koreksi Coach lewat controller, dan mode input manual penuh sebagai cadangan |
| Kecurangan Level (video diputar ulang, gerakan palsu) | Level tidak mencerminkan jam main asli | Deteksi pola tidak natural, batas 180 menit per hari, review manual |
| Koneksi 3 device terputus saat match | Skor tertunda atau hilang | Potongan video dikirim bertahap; saat putus, bagian yang belum terkirim ditahan sementara di device dengan label status dan dikirim otomatis saat terhubung; skor yang sudah dihitung tersimpan di server; Coach tetap bisa input manual; pairing ulang cepat dengan QR atau kode sesi |
| Pengajuan Coach atau Owner Lapangan palsu | Kepercayaan platform turun | Verifikasi pengalaman dan persetujuan lapangan oleh Admin |
| Privasi pemain yang direkam kamera | Keluhan dan risiko hukum | Persetujuan pemain sebelum direkam, video tidak disimpan permanen di device, dan video di server dihapus setelah diproses (kecuali klip untuk fitur VIP nanti, kebijakannya menyusul) |
| Konten komunitas yang tidak pantas | Citra komunitas rusak | Moderasi, laporan konten, dan klasifikasi konten |
| Cakupan terlalu besar (5 cabang, AI, booking, komunitas) | Pengembangan molor | Roadmap bertahap; repo YOLO yang sudah dikumpulkan dipakai sebagai titik awal (bukan solusi jadi) untuk kelima cabang |
| Dana pemain ditampung lalu diteruskan oleh aplikasi | Risiko hukum dan sengketa pembayaran | Memakai payment gateway berlisensi dan memeriksa aspek legalnya sebelum peluncuran |
| Admin tampil sebagai user biasa tanpa label | Penyalahgunaan akses sulit dilacak | Semua tindakan Admin dicatat di log internal (usulan) |
| YOLO memproses video di server dengan sumber daya terbatas | Deteksi lambat atau biaya membengkak | Ukur kebutuhan komputasi lebih dulu, lalu pilih hosting layanan AI sesuai hasilnya (lihat Strategi komputasi tanpa budget) |
| Tidak ada repo yang langsung menghasilkan skor (gol futsal, poin tennis, tembakan masuk basket) | Fase 3 lebih lama dari perkiraan | Mulai dari komponen deteksi bola, lapangan, gawang, atau ring; skor semi-otomatis (AI mengusulkan, Coach mengonfirmasi) dengan input manual penuh sebagai cadangan |
| Fitur VIP seperti highlight membutuhkan video yang disimpan | Bertentangan dengan kebijakan hapus video dan menambah risiko privasi | Putuskan isi paket VIP, retensi klip, dan persetujuan pemain sebelum fitur dibangun; sekarang hanya penanda antarmuka |
| Kredit Heroku mahasiswa habis setelah 24 bulan dan tidak bisa diperpanjang | Biaya hosting API naik mendadak | Siapkan anggaran hosting sebelum bulan ke-24; API terpisah dari database sehingga mudah dipindah |
| Deteksi di device: HP panas, baterai habis, atau FPS rendah selama match 1 sampai 3 jam; dukungan WebGPU berbeda per browser | Deteksi terlewat atau berhenti | Ukur FPS di HP target sebelum membangun; pakai model nano; turunkan FPS otomatis saat panas; input manual Coach sebagai cadangan |
| Deteksi di device: server tidak melihat video, sehingga hasil bisa dipalsukan dari device yang dimodifikasi | Level dan statistik bisa dicurangi | Konfirmasi Coach lewat controller, batas harian, deteksi pola tidak natural; verifikasi sisi server bila kelak ada budget |

## Pertanyaan Terbuka

Jawabanmu sudah masuk ke dokumen ini. Tabel pertama mencatat keputusan, tabel kedua berisi hal yang masih terbuka.

### Sudah diputuskan

| No | Topik | Keputusan |
| --- | --- | --- |
| 1 | Nama aplikasi dan role pengelola | Nama aplikasi belum ditentukan. Role pengelola bernama Admin: bisa melewati semua batasan fitur (termasuk verifikasi) dan dilihat user lain sebagai user biasa tanpa label khusus |
| 2 | Satu akun banyak role | Boleh |
| 3 | Alur pembayaran | Masuk ke aplikasi, lalu diteruskan ke tujuan dengan potongan. Model (persentase saat withdraw atau fee dibebankan ke pembayar) dan besaran persentasenya dipilih dan diatur oleh Admin lewat panel Admin |
| 4 | Kurva Level | Dipakai apa adanya |
| 5 | Level per cabang | Satu Level global untuk semua cabang, mencerminkan seberapa aktif user berolahraga memakai aplikasi |
| 6 | Penanganan video | Diteruskan ke server; dipecah menjadi bagian berformat m3u (HLS) maksimal 50 MB. Video hanya dipakai selama deteksi lalu dihapus (yang disimpan hanya skor, statistik, dan menit main). Jika koneksi putus, bagian yang belum terkirim ditahan sementara di device dengan label status dan dikirim otomatis saat terhubung, lalu dihapus dari device |
| 7 | Aturan skor | Aplikasi menyediakan nilai bawaan; Coach atau User bisa mengedit match dan menggantinya sesuai aturan mereka |
| 8 | Format basket | Full court dan half court; tim pencetak dikenali dari warna baju tim. Jumlah pemain per sisi fleksibel dan diatur Coach di setting match |
| 9 | Verifikasi Coach | Pengalaman dan prestasi, berupa teks, gambar, video, atau URL |
| 10 | Klasifikasi konten | Otomatis dari apa yang biasa dimainkan dan dicari user, dan bisa difilter |
| 11 | Sewa alat | Dipikirkan nanti |
| 12 | Cabang untuk AI | Kelima cabang; repo yang dikumpulkan ada di bagian Referensi Repo dan Model YOLO |
| 13 | Pairing device | QR dan kode sesi |
| 14 | Teknologi | Supabase dan Heroku, ditambah Vercel bila kurang |
| 15 | App mobile | Cross-platform, memanggil API yang sama |
| 16 | Lokasi YOLO | Di server |
| 17 | Framework | Front end web Next.js (React + TypeScript) di Vercel; mobile React Native (Expo); layanan YOLO Python (FastAPI) |
| 18 | VIP | Paket fitur premium; isinya masih dipikirkan (highlight salah satu kandidat) dan infrastruktur sedang disiapkan. Coming soon: hanya badge dan tombol nonaktif, belum ada langganan |
| 19 | Nama aplikasi | Ditunda |
| 20 | Hosting dan testing | Back end API di Heroku, database dan file di Supabase, YOLO di server GPU sewa terpisah (folder yolo-service). Testing YOLO memakai laptop RTX. Kamera mengunggah segmen video ke Supabase, YOLO mengambil pekerjaan dari antrean dan mengirim kejadian ke back end |

### Masih terbuka

| No | Pertanyaan | Asumsi sementara |
| --- | --- | --- |
| 1 | Apa nama aplikasi? | Ditunda |
| 2 | Padel tunggal memakai lapangan dan aturan skor yang sama dengan ganda? | Sama dengan ganda |
| 3 | Penyedia GPU hosting mana yang dipakai, dan bagaimana jadwal nyala-matinya? | Belum dipilih; YOLO tetap di server (keputusan 16) dan hanya dinyalakan saat ada match |
| 4 | Berapa batas antrean di device saat koneksi putus (menit atau MB), dan bagaimana skor manual Coach dipadukan dengan hasil AI yang menyusul? | Belum ditentukan |
| 5 | Apakah klip pendek untuk review anti-cheat disimpan, dan berapa lama? | Belum ditentukan; saat ini video dihapus setelah diproses |
| 6 | Fitur apa saja di paket VIP, dan bila ada yang butuh klip tersimpan (misal highlight), bagaimana retensi video dan persetujuan pemain? | Masih dipikirkan; infrastruktur sedang disiapkan |
| 7 | Lisensi, akurasi, dan kecepatan tiap repo YOLO | Belum diuji |
| 8 | Perlu log tindakan Admin, karena Admin tampil sebagai user biasa? | Ya, dicatat di log internal (usulan) |
| 9 | Harga, paket, dan mekanisme langganan VIP | Ditentukan nanti; tombol sementara nonaktif |
| 10 | Bagaimana membedakan basket 2 dan 3 poin bila AI hanya mendeteksi bola masuk ring? | Usulan: Coach memilih 2 atau 3 saat konfirmasi; atau lewat posisi penembak nanti |
| 11 | Kejadian apa yang dideteksi AI untuk tennis dan padel? | Usulan: bola mendarat di dalam atau di luar garis, seperti badminton |
| 12 | Berapa FPS minimal per cabang agar deteksi cukup akurat, dan HP apa yang memenuhi? | Ditentukan dari uji di HP target |
| 13 | Format segmen video dari kamera: HLS (m3u8) atau potongan MediaRecorder (webm atau mp4)? | Usulan: potongan MediaRecorder dulu karena langsung tersedia di browser; HLS butuh muxing tambahan |

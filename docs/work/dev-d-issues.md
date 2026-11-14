# Rencana issue jalur Eugene

Jalur dev-d: AI olahraga raket (badminton, tennis, padel), Level, menit main (`play_activity`), dan fondasi UI. Dibuat dari `prompts/Eugene/00-kickoff.md` setelah membaca `rules.md`, `README.md`, `MODULES.md`, `prompts/INTEGRATION.md`, seluruh `docs/proposal.md`, `docs/architecture.md`, `docs/setup-local.md`, dan README serta kerangka kode modul jalur ini. Belum ada kode yang ditulis.

## Ringkasan jalur

1. Jalur ini punya satu modul aplikasi (`level`, backend + frontend) dan empat modul YOLO (`badminton`, `tennis`, `padel`, `play_activity`). Bobot 13, belum ada yang dimulai.
2. Fase 0-2 diisi fondasi UI karena detektor baru jalan di Fase 3: memo `docs/decisions/ui-stack.md` dulu, kerangka tampilan setelah tim setuju.
3. Pekerjaan Fase 0 lain: baseline benchmark YOLO di laptop RTX (nano, small, medium), audit lisensi repo referensi, dan klip uji bersama.
4. Detektor raket dikerjakan berurutan: `badminton` membangun paket bersama `_racket` (pelacak bola, titik pendaratan, uji in/out lewat kalibrasi), lalu `tennis`, lalu `padel` yang paling tidak pasti karena dinding kaca dan kamera tunggal.
5. Ketiganya hanya mengeluarkan kejadian `ball_landed` (`in_bounds`, `side`). Skor, rally, game, dan set tetap di backend (`scoring/rules/`).
6. `play_activity` mengukur menit main nyata per segmen (`active_seconds`, `players_detected`) dengan COCO ringan di fps rendah, dengan aturan berbeda per cabang.
7. `level` membangun penerimaan data, batas 180 menit per hari, ledger XP, dan layar review anti-cheat di sekitar rumus yang sudah dites. Rumus dan tarif tidak diubah.
8. Yang saya terima: kontrak kalibrasi dan geometri lapangan (dev-c), `devices` yang memanggil `level.ingestPlayActivity` (dev-c), dan worker `jobs` (dev-a, sudah berstatus jalan).
9. Yang saya beri: `getLevelSummary`, `LevelBadge`, `LevelProgress` (ke dev-a dan dev-c), kerangka UI dan baseline benchmark (ke semua), dan paket `_racket` (ke semua detektor raket).
10. Penyedia merge kerangka tipe `createLevelApi` lebih dulu supaya `devices`, `accounts`, `feed`, dan `admin` bisa menulis kode di atasnya.
11. Perubahan di `frontend/src/components/`, `yolo-service/app/core/`, `contracts/`, dan migrasi bersifat bersama. Butuh persetujuan minimal dua orang dan masuk sebagai PR terpisah.
12. Hal yang butuh GPU, klip berizin, atau akses GitHub tidak bisa dipalsukan. Di sesi tanpa itu, hasilnya ditulis sebagai belum diukur.

## Hal yang belum jelas atau bertentangan

### Penghalang (butuh manusia atau jalur lain)

- **Benchmark dan evaluasi butuh perangkat dan data yang tidak ada di sesi AI.** Baseline FPS dan VRAM (issue 3) butuh laptop RTX. Evaluasi detektor (issue 9, 11, 13, 20) butuh klip berlabel, berizin, tanpa wajah yang dapat dikenali. Selama belum ada, angka akurasi dan benchmark ditulis "belum diukur".
- **Kontrak kalibrasi belum ada.** `prompts/INTEGRATION.md` menjanjikan `contracts/calibration.schema.json` dari dev-c, tetapi folder `contracts/` baru berisi `detection-event.schema.json`. `CourtCalibration` di `yolo-service/app/modules/calibration/points.py` masih kerangka (`corners`, `targets`), dan `SegmentContext.calibration` berupa `dict` tanpa bentuk. Uji in/out ke koordinat lapangan nyata menunggu ini. Logika murni tetap bisa dikerjakan dengan tiruan `TODO(integration): menunggu calibration`.
- **Mode tunggal/ganda tidak sampai ke detektor.** Badminton, tennis, dan padel butuh mode (garis berbeda). `SegmentContext` tidak punya field mode, dan `build_context` di `worker.py` tidak membacanya dari `matches`. Perlu PR kecil scope `yolo-core` (perubahan di `app/core`, minimal dua persetujuan), dan dev-a perlu tahu karena worker ikut berubah.
- **Pemanggil `ingestPlayActivity` belum ada dan tanda tangannya belum ditulis.** `INTEGRATION.md` hanya menulis `ingestPlayActivity(...)`. Sebagai penyedia, saya merge kerangka tipenya lebih dulu (issue 14) dan memberi tahu dev-c.
- **Tanda anti-cheat belum punya jalur ke backend.** `anti_cheat` (dev-a) belum mengirim apa pun, dan kontrak baru harus berupa PR terpisah yang ditinjau dev-c dan saya. `anti_cheat_flags.user_id` wajib diisi, padahal anti-cheat di YOLO tidak mengenal pengguna. Issue 17 hanya bisa selesai penuh setelah kontrak itu ada.

### Ditandai `TODO(decision)` (tidak memblokir, pakai asumsi sementara)

- **Atribusi menit ke pemain.** Asumsi: semua peserta bracket yang sedang main pada rentang waktu itu (open play) dan pemilik kamera (main sendiri), lewat satu fungsi kebijakan yang mudah diganti.
- **Menit ganda dari dua kamera.** Kamera home dan away masing-masing menghasilkan `play_activity` per segmen, dan kunci idempotensi `(segment_id, user_id)` tidak mencegah menit yang sama dihitung dua kali. Asumsi sementara: satu pemain dihitung sekali per rentang waktu. Perlu keputusan tim.
- **Event `ball_landed` ganda dari dua kamera.** Pendaratan yang sama bisa terlihat dari kedua kamera dan tidak ada aturan penggabungan di kontrak. Makna `side` (sisi tempat bola mendarat atau sisi kamera) juga tidak dijelaskan. Asumsi: `side` = sisi lapangan tempat bola mendarat, dan penggabungan antar kamera bukan tugas detektor.
- **Zona waktu batas hari.** Asumsi: `Asia/Jakarta` sebagai konstanta.
- **Koreksi anti-cheat dan jatah harian.** Entri ledger negatif saat kecurangan dikonfirmasi: apakah menit yang dibatalkan membuka kembali jatah 180 menit hari itu? Asumsi: tidak. Selain itu `user_xp.has_verified_session` bernilai benar bila ada baris ledger apa pun, jadi pemain yang semua XP-nya dibatalkan tetap Level 1, bukan 0.
- **Kejadian AI tennis dan padel** (nomor 11): asumsi `ball_landed`. **Pantulan dinding padel** masuk cakupan awal atau tidak: asumsi tidak. **Padel tunggal** memakai lapangan dan aturan yang sama dengan ganda (nomor 2).
- **FPS minimal per cabang** (nomor 12): diukur, bukan ditebak. **Toleransi kok di garis**: konstanta yang bisa disetel. **FPS sampel `play_activity`**: asumsi rendah (sekitar 5 fps), diukur biayanya.
- **Definisi "pemain terdeteksi"** untuk `play_activity`: asumsi jumlah maksimum orang bersamaan dalam segmen, bukan jumlah track unik. Alasan: track unik menggelembung saat ID pecah. Perlu diverifikasi pada klip.
- **`timestamp_ms` untuk `play_activity`.** Kontrak mendefinisikannya sebagai waktu kejadian di dalam match, tetapi event ini mencakup satu segmen penuh. Asumsi: awal segmen (`start_offset_ms`).
- **Format segmen video** (HLS atau MediaRecorder, nomor 13): detektor tidak boleh mengandalkan kontainer tertentu. Perkiraan saya, bukan fakta dari repo: rekaman MediaRecorder umumnya berfps variabel, jadi `timestamp_ms` sebaiknya dibaca dari penanda waktu frame, bukan indeks frame dibagi fps. Perlu dicek pada klip nyata.
- **`/internal/play-activity`.** README backend `level` menyebutnya redundan karena jalurnya lewat `devices`. Asumsi: dihapus lewat PR bersama pembaruan README.
- **Library UI dan styling.** Memo di issue 1 hanya rekomendasi. Frontend saat ini tanpa library apa pun (28 file memakai `style={{ ... }}`, tidak satu pun memakai `className`).
- **Nama label untuk tugas lintas modul.** Tidak ada modul bernama UI kit atau benchmark. Asumsi: `mod:ui-kit` dan `mod:yolo-core`, mengikuti baris "UI kit" di `INTEGRATION.md` dan scope commit `yolo-core`.

### Temuan lain di repo (bukan pertanyaan, tetapi memengaruhi rencana)

- `yolo-service/models/VERSIONS.md` disebut `rules.md` dan semua prompt, tetapi belum ada. `yolo-service/tests/fixtures/` hanya berisi `.gitkeep`. `app/modules/_racket/` belum ada.
- `scripts/run_detector.py` membuat `SegmentContext` tanpa kalibrasi dan tanpa mode, jadi detektor raket belum bisa diuji pada klip lokal. Butuh opsi untuk kalibrasi dan mode (bagian dari issue 6). `scripts/` tidak punya pemilik khusus di CODEOWNERS (dipegang keempat orang).
- `app/modules/__init__.py` (`load_all`) hanya mengimpor lima detektor. `play_activity` dipanggil worker lewat `measure_activity`, jadi tidak lewat registry.
- Tabel `xp_ledger` belum punya kolom jenis entri, penunjuk ke `anti_cheat_flags`, atau kunci unik untuk koreksi. Migrasi baru diperlukan (issue 15 dan 17), dan file migrasi lama tidak diedit.
- `device_sessions` belum punya `sport`, `consent_at`, dan `start_offset_ms` belum ada di `video_segments`. `worker.py` sudah menandainya `TODO(integration)`. Migrasi itu milik dev-c.
- Komponen di `frontend/src/components/` butuh persetujuan keempat pemilik jalur (CODEOWNERS), dan halaman milik orang lain tidak boleh saya ubah. Pemakaian kerangka UI oleh halaman mereka harus mereka sendiri yang memasang, atau lewat PR kecil dengan review pemiliknya.
- Bobot 13 tidak menghitung kerangka UI, benchmark, audit lisensi, dan klip uji. Pekerjaan jalur ini lebih besar dari angkanya.

## Daftar issue

### Fase 0

#### 1. Memo UI stack

- **Judul:** Write UI stack decision memo
- **Label:** `mod:ui-kit`, `fase:0`, `frontend`, `docs`
- **Selesai kalau:**
  - `docs/decisions/ui-stack.md` membandingkan opsi styling dan komponen untuk Next.js, dan menyatakan apakah pilihan itu aman dipakai ulang di React Native (Expo) nanti.
  - Memo hanya berisi rekomendasi, alasan, dan biaya (ukuran dependensi, tingkat belajar), tanpa dependensi baru di `package.json`.
  - Memo menyebut cara halaman yang sudah memakai `style={{ ... }}` bermigrasi tanpa menulis ulang semuanya.
  - Pemilik tiga jalur lain sudah menyetujui atau memberi komentar di PR.

#### 2. Kerangka tampilan dan komponen dasar

- **Judul:** Build shared UI foundation (layout, role-aware nav, base components)
- **Label:** `mod:ui-kit`, `fase:1`, `frontend`
- **Menunggu:** issue 1 disetujui tim.
- **Selesai kalau:**
  - Layout aplikasi dan navigasi sadar role ada di `frontend/src/components/`, dan item navigasi mengikuti role dari `useMe`. Menyembunyikan item hanyalah tampilan, bukan keamanan.
  - Komponen dasar tersedia: tombol, input, kartu, tabel, serta state loading dan error.
  - Tidak ada aturan bisnis di komponen dan semua panggilan API tetap lewat `api.ts` modul.
  - `npm run typecheck` dan `npm run build` lolos, dan halaman milik orang lain tidak diubah dalam PR ini.

#### 3. Baseline benchmark YOLO di laptop RTX

- **Judul:** Measure YOLO nano, small and medium baseline on RTX laptop
- **Label:** `mod:yolo-core`, `fase:0`, `yolo`, `docs`
- **Menunggu:** laptop RTX dan klip uji (issue 5).
- **Selesai kalau:**
  - Lingkungan YOLO jalan sesuai `docs/setup-local.md` dan `torch.cuda.is_available()` terbukti benar.
  - `docs/benchmarks.md` terisi FPS dan VRAM puncak untuk model nano, small, dan medium pada klip uji, dengan tanggal, mesin, dan resolusi atau fps klip.
  - Angka tidak diisi dari perkiraan, dan baris yang belum diukur tertulis "belum diukur".
  - Catatan singkat menyatakan paket GPU sewa mana yang masih memenuhi angka tersebut (pertanyaan terbuka nomor 3), tanpa memilih penyedia.

#### 4. Audit lisensi repo referensi

- **Judul:** Audit licenses of YOLO reference repos and TrackNet
- **Label:** `mod:yolo-core`, `fase:0`, `docs`
- **Selesai kalau:**
  - `docs/decisions/yolo-reference-repos.md` mencakup basket (2 repo), badminton (1), padel (1), futsal (1 plus dataset Roboflow), tennis (2), dan makalah TrackNet.
  - Tiap baris mencatat lisensi, tanggal commit terakhir, ketersediaan bobot, dan boleh atau tidaknya dipakai ulang.
  - Hal yang tidak bisa dipastikan dari sesi ini (misalnya akses GitHub) ditulis sebagai daftar pertanyaan untuk dicek manusia, bukan ditebak.
  - Repo tanpa lisensi yang terlihat ditandai "jangan salin kode".

#### 5. Klip uji bersama

- **Judul:** Collect shared test clips and document provenance
- **Label:** `mod:yolo-core`, `fase:0`, `yolo`, `docs`
- **Selesai kalau:**
  - `yolo-service/tests/fixtures/README.md` mencatat sumber, izin, dan ukuran tiap klip. Tidak ada wajah yang dapat dikenali dan tiap klip hanya beberapa MB.
  - Ada klip untuk tiap cabang raket dan klip aktivitas: permainan, kamera menyala tanpa permainan, orang berjalan saja, dan bola diam.
  - Tidak ada klip yang di-commit tanpa izin tertulis di README tersebut.

### Badminton (Fase 3)

#### 6. Mode lapangan di konteks segmen

- **Judul:** Pass court mode to detectors via SegmentContext
- **Label:** `mod:yolo-core`, `fase:3`, `yolo`
- **Menunggu:** review dua orang (perubahan `app/core`) dan kejelasan bentuk kalibrasi dari dev-c.
- **Selesai kalau:**
  - `SegmentContext` punya field mode (tunggal/ganda) dengan nilai bawaan yang tidak merusak detektor basket dan futsal.
  - `build_context` mengisinya dari setting match, atau memakai tiruan bertanda `TODO(integration)` bila datanya belum tersedia.
  - `scripts/run_detector.py` menerima opsi mode dan berkas kalibrasi sehingga detektor raket bisa diuji pada klip lokal.
  - `ruff check .` dan `pytest -q` lolos, dan test yang sudah ada tidak diubah.

#### 7. Paket bersama `_racket`

- **Judul:** Add shared `_racket` ball tracking and landing detection
- **Label:** `mod:badminton`, `fase:3`, `yolo`
- **Selesai kalau:**
  - `yolo-service/app/modules/_racket/` punya satu antarmuka pelacak bola dan satu fungsi murni yang menentukan titik pendaratan dari lintasan, tanpa `torch` atau `ultralytics` di tingkat modul.
  - Tes lintasan sintetis lolos tanpa GPU: pendaratan di dalam, di luar, tepat di garis, dan lintasan tanpa pendaratan.
  - README paket memuat contoh pemakaian yang cukup untuk tennis dan padel.
  - Pemetaan titik ke koordinat lapangan memakai antarmuka kalibrasi tiruan bertanda `TODO(integration): menunggu calibration`.

#### 8. Geometri dan uji in/out badminton

- **Judul:** Implement badminton court geometry and in/out test
- **Label:** `mod:badminton`, `fase:3`, `yolo`
- **Selesai kalau:**
  - Garis tunggal dan ganda (lebar lapangan dan garis servis) ditulis sebagai konfigurasi dan dites pada titik sintetis di dalam, di luar, dan di garis.
  - Toleransi kok di garis adalah konstanta bernama dengan `TODO(decision)` dan dites di kedua sisinya.
  - Homografi dari 4 sudut memetakan titik piksel ke koordinat lapangan dan dites dengan sudut sintetis.

#### 9. Detektor badminton end-to-end

- **Judul:** Wire badminton detector with evaluation script and benchmark
- **Label:** `mod:badminton`, `fase:3`, `yolo`
- **Menunggu:** klip uji (issue 5), bobot, dan hasil audit lisensi (issue 4).
- **Selesai kalau:**
  - `process()` mengembalikan `BallLanded` dengan `make_event_id` (tanpa `uuid4`), dan `timestamp_ms` memperhitungkan `start_offset_ms`.
  - Skrip evaluasi melaporkan presisi/recall pendaratan dan kesalahan in/out pada klip berlabel, atau README menyatakan terus terang bahwa klip belum ada.
  - Pengaruh 30 fps dibanding 60 fps pada kok diukur dan dilaporkan, atau ditulis "belum diukur".
  - README modul memuat lisensi repo referensi, `models/VERSIONS.md` dibuat dan diisi tanpa berkas bobot di git, dan `MODULES.md` diperbarui.

### Tennis (Fase 3)

#### 10. Geometri tennis di atas `_racket`

- **Judul:** Add tennis court geometry on shared racket package
- **Label:** `mod:tennis`, `fase:3`, `yolo`
- **Menunggu:** `_racket` stabil (issue 7 dan 8).
- **Selesai kalau:**
  - Garis tunggal dan ganda (lorong ganda) dites pada pendaratan sintetis. Kotak servis di luar cakupan.
  - Jika `_racket` perlu diubah, perubahannya kecil dan tes badminton tetap lolos tanpa diubah.

#### 11. Detektor tennis end-to-end

- **Judul:** Wire tennis detector with evaluation and license notes
- **Label:** `mod:tennis`, `fase:3`, `yolo`
- **Selesai kalau:**
  - `process()` menghasilkan `BallLanded` dengan `event_id` deterministik. Asumsi kejadian `ball_landed` tertulis `TODO(decision)` (nomor 11).
  - Evaluasi klip dan benchmark dilaporkan, atau ditulis belum diukur beserta alasannya.
  - Lisensi `rishn/adobe-gensolve-finale` dan `Oushesh/tennis-count` tercatat di README modul.

### Padel (Fase 3)

#### 12. Pendaratan lantai padel dan pengecualian dinding

- **Judul:** Detect padel floor landing and exclude wall bounces
- **Label:** `mod:padel`, `fase:3`, `yolo`
- **Menunggu:** `_racket` stabil.
- **Selesai kalau:**
  - Pendaratan di lantai pada geometri padel dites secara sintetis, dan pantulan dinding tidak dihitung sebagai pendaratan lantai.
  - Tes badminton dan tennis tetap lolos setelah perubahan `_racket`.
  - Bila pantulan dinding dianggap perlu, hanya usulan kontrak (misalnya `ball_bounce`) yang ditulis sebagai dokumen untuk PR kontrak terpisah. Tidak ada event baru yang ditambahkan.

#### 13. Detektor padel end-to-end

- **Judul:** Wire padel detector with evaluation and viewpoint limitations
- **Label:** `mod:padel`, `fase:3`, `yolo`
- **Selesai kalau:**
  - `process()` menghasilkan `BallLanded` dengan `event_id` deterministik, dan asumsi tunggal = ganda tertulis `TODO(decision)`.
  - README modul mendokumentasikan keterbatasan kamera tunggal dari satu sisi (kedalaman ambigu).
  - Lisensi `andresgilvicente/padel-ai-system` tercatat dan tidak ada kode yang disalin tanpa lisensi yang jelas.
  - Evaluasi klip dan benchmark dilaporkan, atau ditulis belum diukur.

### Level (Fase 3, backend + frontend)

#### 14. Kerangka tipe `createLevelApi`

- **Judul:** Merge createLevelApi type skeleton for cross-module callers
- **Label:** `mod:level`, `fase:3`, `backend`
- **Selesai kalau:**
  - `ingestPlayActivity`, `getLevelSummary(userId)`, dan `countOpenFlags()` punya tanda tangan dan tipe hasil, dan boleh melempar `NotImplemented`.
  - `prompts/INTEGRATION.md` memuat tanda tangan `ingestPlayActivity` yang pasti, dan dev-c, dev-a, dan Leon sudah diberi tahu.
  - Test rumus yang sudah ada tetap lolos tanpa diubah.

#### 15. Penerimaan menit main, batas harian, dan ledger XP

- **Judul:** Implement play-activity ingest, daily cap and XP ledger
- **Label:** `mod:level`, `fase:3`, `backend`, `db`
- **Selesai kalau:**
  - Ingest dua kali untuk `(segment_id, user_id)` yang sama tidak menggandakan menit atau XP.
  - Batas 180 menit per hari bekerja lintas segmen dan sesi dengan batas hari dalam `Asia/Jakarta`, open play 2 XP dan solo 1 XP per menit.
  - Atribusi menit ke pemain ada di satu fungsi kebijakan bertanda `TODO(decision)`.
  - Migrasi BARU (bila perlu) menambah kolom ledger untuk jenis entri dengan RLS aktif, tanpa mengedit migrasi lama, dan `/internal/play-activity` dihapus atau diputuskan lewat PR.

#### 16. Endpoint Level, ringkasan, dan komponen tampilan

- **Judul:** Serve level reads and add LevelProgress component
- **Label:** `mod:level`, `fase:3`, `backend`, `frontend`
- **Selesai kalau:**
  - `GET /level/me`, `GET /level/users/:userId`, dan `getLevelSummary` mengembalikan level, XP, dan XP menuju level berikutnya, dan tabel endpoint di README sesuai kode.
  - `LevelProgress` (bilah menuju level berikutnya) ada di samping `LevelBadge`, dengan state loading dan error, dan tanpa perhitungan Level di klien.
  - Test mencakup Level 0 (belum ada sesi terverifikasi), ambang naik level, dan batas Level 300.

#### 17. Review anti-cheat dan koreksi XP

- **Judul:** Implement anti-cheat flag review and ledger corrections
- **Label:** `mod:level`, `fase:3`, `backend`, `frontend`
- **Menunggu:** PR kontrak tanda anti-cheat dari Leon, ditinjau dev-c dan saya.
- **Selesai kalau:**
  - `GET /level/flags` dan `POST /level/flags/:id/resolve` hanya untuk admin, dan aksi admin tercatat di audit log lewat hook yang sudah ada.
  - Konfirmasi kecurangan menambah entri koreksi di ledger dan menurunkan Level dengan benar, sedangkan menolak tanda tidak mengubah XP.
  - `/admin/flags` menampilkan alasan dan skor serta tombol konfirmasi atau tolak, dengan state loading dan error.
  - `countOpenFlags()` berfungsi untuk dasbor admin, dan klip atau hash tidak disimpan (default retensi nol).

### play_activity (Fase 3)

#### 18. Definisi "aktif" sebagai fungsi murni

- **Judul:** Define active-play rule as a pure function with synthetic tests
- **Label:** `mod:play_activity`, `fase:3`, `yolo`
- **Selesai kalau:**
  - Fungsi murni menerima urutan deteksi (orang bergerak, jarak orang ke bola, bola bergerak) dan menghasilkan detik aktif, dengan jendela dan ambang yang bisa disetel.
  - Tes sintetis mencakup aktif, diam, berjalan saja, dan bola diam, dan perubahan jendela atau ambang mengubah hasil sesuai harapan.
  - `active_seconds` tidak pernah melebihi durasi segmen.
  - Definisi "pemain terdeteksi" dan aturan per cabang tertulis di README dengan `TODO(decision)`.

#### 19. `measure_activity` dengan model COCO

- **Judul:** Implement measure_activity with low-fps COCO detection
- **Label:** `mod:play_activity`, `fase:3`, `yolo`
- **Selesai kalau:**
  - `measure_activity(video_path, ctx)` mengembalikan `PlayActivity` atau `None` dengan `make_event_id` deterministik, dan `torch`/`ultralytics` diimpor di dalam fungsi.
  - Sampel fps rendah bisa dikonfigurasi dan biayanya diukur, atau ditulis belum diukur.
  - Tidak ada frame, video, atau identitas pemain di log, dan area lapangan dari kalibrasi bersifat opsional.

#### 20. Evaluasi menit main pada klip

- **Judul:** Evaluate measured minutes on gameplay, idle, walking and static-ball clips
- **Label:** `mod:play_activity`, `fase:3`, `yolo`, `docs`
- **Menunggu:** klip uji (issue 5), GPU untuk pengukuran biaya.
- **Selesai kalau:**
  - Hasil pada klip permainan, kamera menyala tanpa permainan, orang berjalan, dan bola diam dilaporkan di PR dan README modul.
  - Ada penilaian jujur apakah menit terukur wajar per cabang, atau penjelasan mengapa belum bisa dinilai.
  - Koordinasi dengan dev-a soal fitur gerak yang bisa dipakai bersama `anti_cheat` dicatat, tanpa menggabungkan modul.
  - Benchmark masuk `docs/benchmarks.md` dan `MODULES.md` diperbarui.

## Urutan yang disarankan

1 → 4 → 5 → 3 (Fase 0, paralel bila mungkin), lalu 2 setelah memo disetujui. Berikutnya 14 lebih awal karena ia menjadi kerangka bagi `devices`. Setelah itu 6 → 7 → 8 → 9, lalu 10 → 11, lalu 12 → 13, lalu 15 → 16 → 17, dan 18 → 19 → 20 berjalan bersamaan dengan Level.

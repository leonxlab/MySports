# Anti-cheat Level

`checks.py` memberi skor dan alasan untuk pengulangan frame identik dan jendela gerak terkuantisasi.
Hasil adalah sinyal untuk review manual, bukan keputusan, pemblokiran, atau pengurangan XP.

## Status dan batasan

- Belum mengirim event ke backend. Perubahan kontrak harus menjadi PR terpisah dan ditinjau dev-c
  (devices) serta dev-d (level) sebelum integrasi.
- Deteksi bingkai layar/moire belum diimplementasikan; ambang `0.8` hanya nilai awal untuk tes
  sintetis dan harus dievaluasi pada data berizin sebelum dipakai.
- Klip dan hash hanya berada di memori selama analisis dan tidak disimpan.
- Tidak ada repo atau dataset eksternal yang digunakan; tidak ada lisensi eksternal untuk dicatat.
- Belum ada hasil GPU atau benchmark klip nyata.

TODO(decision): Tim harus menyetujui ambang dan kebijakan penyimpanan sebelum skor ditampilkan
kepada Admin; default tetap tanpa penyimpanan klip atau hash.

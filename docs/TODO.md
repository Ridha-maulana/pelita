# Status Pelita

## Selesai (v0.1.0)
- M0 scaffold, CI (tipe → tes → build → Pages), PWA, token warna terang/gelap (ambar, tanpa ungu)
- M1 domain + 32 tes: waktu WIB, sesi (07–14/14–20/20–04/04–07), hari trading 07:00, P&L, pips, risiko, periode (tanggal close), statistik, drawdown dari puncak ekuitas, 31 baris Advanced Statistics, Trader DNA, backup v4 + migrasi v3, CSV aman rumus
- M2 sebagian: store + simpan dengan peringatan kuota, akun (tambah/ganti nama/hapus), deposit/tarik, cadangan/pulihkan (konfirmasi + cadangan otomatis), CSV, impor Edge Journal
- M3 sebagian: My Journal (cari, filter, tahun>bulan), form catat/ubah/tutup trade, detail, kalender
- M4 sebagian: Performance (hero, grafik pertumbuhan, metrik), Advanced Statistics, DNA (radar)

## v0.2.0
- M7 sebagian: 79 tema (78 + bawaan) terang/gelap, 85 font (Google Fonts), "Warna sendiri", mode, 25 efek permukaan (kartu/tombol/menu bawah), 7 saklar efek, daftar geser 5 per halaman. Tes: kontras teks ≥ 4.5 di semua tema.
- Belum di M7: 34 latar + redup, 6 template beranda, 12 header, 5 menu bawah

## v0.3.0
- M4: grafik kandel/garis (pan, cubit-zoom, ketuk, ketuk 2× → Journal), skala 1H·1S·1D·1W·1M·1Y, Monthly gain (filter bulan), DrillDown Bulan>Minggu>Hari>Sesi>Win/Loss + mode Kunci, Per simbol, Share ke story (gambar 1080×1920, sembunyikan nominal)
- Belum di M4: tab grafik Growth/Balance/Profit/Daily P&L, tile Gain/Abs gain/Daily

## v0.4.0
- M7 lanjut: 34 latar (5 kategori) + redup 0–80% + penjaga nada otomatis, 5 gaya menu bawah, 9 gaya header (Performance). Perbaikan: halaman Performance tidak lagi melompat ke bawah saat dibuka.
- Belum di M7: 6 template beranda (+ header & menu khusus template)

## v0.8.0
- M6 Sinkron online (Firebase): layar Masuk (email/password, Daftar, Lupa password, Lanjut tanpa masuk), kartu Sinkron online di Profil (status, Sinkronkan sekarang, Keluar, konflik cloud/perangkat), Impor dari Edge Journal, mesin sinkron dengan 8 tes. Lihat docs/FIREBASE.md.

## v0.7.2
- Perapian UI/UX (audit ui-ux-pro-max + unslop, tampilan Edge dipertahankan): bawaan pasang pertama kini = tampilan Edge (X terang, Open Sans, Template 5, header Organik hijau, latar Organik hijau); area sentuh tombol kecil diperluas ke >= 44px tanpa mengubah ukuran visual; teks 10px -> 11px; baris jurnal satu tinggi (teks panjang dipotong); kartu "Catat trade pertama / Data contoh" saat akun kosong + grafik kosong lebih pendek; select Periode berchevron seragam; status bar & latar APK terang.

## v0.7.1
- Layar hijau di APK: penjaga mulai di index.html (teks "Memuat Pelita…", lalu pesan galat + tombol Muat ulang bersih bila aplikasi tidak tampil dalam 7 dtk atau skrip gagal dimuat). android-app: errorPath ke halaman offline.

## v0.7.0
- Disamakan dengan Edge Journal berdasarkan ukuran terukur (bukan tebakan): skala font/jarak global (`scale.css`), latar Organik hijau (variabel --ej-cv/--ej-pr hilang -> latar gelap), Template 5 + header "Template 2 · Organik hijau" (Halo, Trader!), grafik kandel bawaan (warna tetap, label sumbu 14.5), My Journal (select + chevron, ikon filter, FAB outline), Tools/Profil (ikon bulat 36, judul 14, keterangan 10).
- Perbaikan APK: kunci debug disimpan sebagai debug.keystore.b64 (file *.keystore tidak ikut ke git, langkah salin gagal). pelita.yml diperbarui.
- Belum diverifikasi vs Edge: kartu Tahun/Bulan/Minggu terbuka, Statistik, DNA, Template 1-4, header lain.

## v0.6.0
- APK: folder android-app (Capacitor, memuat web Pelita dari GitHub Pages), ikon PNG, workflow build-apk.yml (dibuat manual sekali; Run workflow -> Releases).
- Bilah status: meta theme-color + plugin StatusBar mengikuti warna latar aplikasi (tidak ada pita hitam).
- My Journal: kolom cari + status + arah (select), chip All/Open/Closed + "N shown", seperti Edge.

## v0.5.2
- Profil gaya Edge Journal: avatar "Hai, Trader", baris akordeon (Account management, Sinkron online, Cloud backup, Export & share), Tes getar. Garis bawah judul halaman dimatikan secara bawaan.
- Sinkron online: belum ada (M6).

## v0.5.1
- Tampilan dikembalikan ke gaya Edge Journal: tema Mint Finance gelap, font Manrope, satu kartu besar di Performance (Total P&L, jumlah tahun/bulan/minggu/hari/sesi, saldo, grafik, bulan terbaik, 6 statistik, Share/Stats/DNA). Desain "tenang" v0.5.0 dibuang.
- Advanced Statistics, Trader DNA, dan Kalender kini halaman penuh (bukan pop-up bawah), dengan Periode, kalender, Monthly gain berbatang, Performa per bulan, Profitability, P&L per pair. DNA punya "Cara tingkatkan".
- Tools: daftar seperti Edge (Halaman utama, Mode, Tema, Font, Efek, Efek permukaan, Latar, Header, Menu bawah), Risk calculator terbuka di tempat.
- Jurnal: kartu tahun dengan 4 angka. Template beranda 1–5 tetap ada.

## v0.5.0
- Desain ulang seluruh tampilan: gelap biru-hitam dan terang krem hangat, kartu, huruf 400/500, tanpa label huruf besar, efek (gradasi, cahaya, kaca, latar) mati secara bawaan, statistik jadi kartu berwarna dengan bar, grafik satu garis dengan isi, petunjuk gestur di balik tombol info.
- 5 template beranda (Dasbor biru, Organik hijau, Hijau bersih, Kaca lembut, Sederhana) di Tools → Tampilan aplikasi → Template beranda; header dan menu bawah ikut template selama masih "Standar".
- Template adalah susunan baru dengan data yang sama; bukan salinan piksel dari Edge Journal.

## Belum (urutan berikutnya)
1. M4: DrillDown Bulan>Minggu>Hari>Sesi>Win/Loss, grafik kandel + 1H/1S/1D/1W/1M/1Y, Share ke story, performa per bulan
2. M3: lampiran screenshot (IndexedDB) di form, kartu trade lengkap
3. M5: OCR MT5 (teks + grafik) — tesseract.js lewat npm
4. M6: Firebase login + sinkron per-trade + migrasi cloud dari blob lama
5. M7: sistem tampilan penuh (78 tema, 85 font, 6 template, 12 header, 5 menu bawah, 25 permukaan, 7 saklar, 34 latar)
6. M8: Capacitor/APK, e2e penuh, diff paritas, deploy

## Diketahui
- Build penuh Vite belum pernah dijalankan di lingkungan pembuat (registry npm diblokir); kode diuji dengan esbuild + Playwright. Putaran CI pertama mungkin butuh 1–2 perbaikan kecil.
- Pair JPY: P&L dihitung dalam yen; form menyediakan kolom "P&L dari broker" untuk nilai tepat.

## v0.9.0
- Catat dari screenshot MT5 (Pro): tombol + membuka menu Manual / Screenshot. OCR Tesseract.js (butuh internet), baca riwayat posisi (satu atau banyak kartu → daftar impor dengan centang, tiket ganda ditandai) dan grafik posisi open (BUY/SELL, entry, SL, TP, lot). Jam server MT5 → WIB (zona waktu bisa dipilih). Form terisi otomatis dengan catatan "periksa angka".
- Lampiran screenshot di form trade (kecilkan otomatis, simpan di IndexedDB, hapus saat batal/diganti) + pratinjau & perbesar di detail trade. Sinkron lampiran ke cloud belum.

## v0.9.1
- Form catat/ubah/tutup trade dan daftar impor screenshot kini halaman penuh (bukan pop-up), seperti Edge Journal: bilah atas dengan tombol kembali, panel Risiko / Risiko % / Reward / R:R, saran lot 1% risiko, tombol Batal + Simpan di bawah.

## v0.9.2
- Bilah atas APK bersih seperti Edge: konfigurasi Capacitor terang (#f5f5f5, ikon status gelap), bilah status ikut warna halaman dan dikirim ulang beberapa kali (jembatan native kadang belum siap), warna apa pun (bukan hanya hex) terbaca. android-app berubah → APK dibangun ulang otomatis. pelita.yml (opsional) ikut terang.
- Menyesuaikan layar HP: <=359px (header tidak terpotong, Profit Factor/Total Trades turun ke grid 2 kolom, tombol form bertumpuk), lanskap pendek (menu lebih rendah, area aman kiri/kanan), layar lebar (menu, tombol +, halaman penuh mengikuti kolom isi).
- Belum: sidebar penuh >760px, tab grafik, splash terang.

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

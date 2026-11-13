# Pelita — jurnal trading pribadi

Versi baru (dibangun ulang dari nol) pengganti Edge Journal. Vite + React + TypeScript, data tersimpan di perangkat, PWA.

## Cara pakai dari HP (tanpa komputer)
1. Buat repo baru di GitHub bernama `pelita`.
2. Unggah isi zip ini ke repo (Add file → Upload files), commit ke `main`.
3. Settings → Pages → Source: **GitHub Actions**.
4. Tab **Actions** akan menjalankan: cek tipe → tes → build → deploy. Alamat: `https://<username>.github.io/pelita/`.
5. Jika ada langkah merah, kirim tangkapan layarnya ke Claude untuk diperbaiki.

## Perintah (komputer)
```
npm install
npm run dev        # pengembangan
npm test           # tes unit (domain)
npm run build      # cek tipe + build produksi
npx playwright test
```

## Struktur
- `src/domain/` — logika murni dan teruji: waktu WIB & sesi, P&L, pips, statistik, Advanced Statistics (31 baris), Trader DNA, backup/migrasi, CSV.
- `src/data/` — store, penyimpanan (dengan peringatan kuota), lampiran IndexedDB, pengaturan.
- `src/features/` — Performance, My Journal, Tools, Profil, form trade, kalender.
- `src/ui/` — ikon, komponen dasar, grafik SVG.
- `tests/unit` (Vitest), `tests/e2e` (Playwright).

## Migrasi dari Edge Journal
Profil → **Pulihkan dari file** (cadangan Edge Journal v3 diterima) atau **Impor dari Edge Journal** bila datanya ada di browser yang sama (alamat github.io sama). Waktu trade diubah ke format WIB eksplisit, screenshot dipindah ke IndexedDB.

## Status
Lihat `docs/TODO.md`.

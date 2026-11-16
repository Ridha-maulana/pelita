# Sinkron online (Firebase) — Pelita

Pelita memakai proyek Firebase yang sama dengan Edge Journal, jadi **akun yang sama** bisa masuk. Tidak ada yang perlu diatur ulang.

- Login: email + password (Firebase Auth). Layar Masuk muncul di awal; "Lanjut tanpa masuk" tetap bisa.
- Data: dokumen `users/{uid}/chunks/pelita-meta` dan `pelita-0000…`. Aturan Firestore Edge Journal sudah mengizinkan path ini. Data Edge Journal (`users/{uid}` + `c0000…`) tidak diubah.
- Menarik data lama: Profil → Sinkron online → **Impor dari Edge Journal** (hanya membaca; data Pelita lama disimpan sebagai cadangan lokal).
- Konflik (perangkat dan cloud sama-sama berubah): pilih **Pakai data cloud** atau **Pakai data perangkat ini**.
- Lampiran screenshot (IndexedDB) belum ikut tersinkron.
- Domain `ridha-maulana.github.io` harus ada di Firebase → Authentication → Settings → Authorized domains (sudah, karena dipakai Edge Journal).
- SDK dimuat dari gstatic.com saat aplikasi dibuka. Tanpa internet, aplikasi tetap jalan lokal dan sinkron menyusul.

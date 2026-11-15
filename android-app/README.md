# android-app — pembungkus Android (Capacitor)

Hanya dipakai untuk membuat APK. Aplikasi memuat web Pelita dari GitHub Pages repositori ini,
jadi pembaruan web otomatis ikut tanpa membuat APK baru. Alamat web diisi otomatis saat build.

Cara membuat APK: tab Actions → "Build APK" → Run workflow. Hasil: tab Releases.
`debug.keystore.b64` (kunci debug dalam teks, karena `*.keystore` diabaikan git) menjaga tanda tangan tetap sama, jadi APK baru memperbarui APK lama.

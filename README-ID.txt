KREATORHUB — PAKET UJI GEMINI AI SUNGGUHAN

PENTING:
- Paket ini untuk memperbarui situs Netlify yang SUDAH ADA, bukan membuat situs baru.
- index.html mempertahankan meta verifikasi Google Search Console yang ada.
- AI Story Generator memanggil backend Netlify Function; API Key tidak diletakkan di HTML.
- Paket ini belum memiliki login pengguna, database kuota, atau pembayaran. Itu tahap berikutnya setelah AI berhasil diuji.

LANGKAH PENTING DI NETLIFY:
1. Buka proyek Netlify lama: kaleidoscopic-meerkat-cdf041.
2. Untuk deploy paket ini, upload/deploy folder proyek yang berisi index.html, netlify.toml, dan folder netlify/functions. Jangan hanya mengunggah index.html karena fungsi backend juga diperlukan.
3. Setelah deploy, buka Site configuration / Environment variables (nama menu dapat berbeda).
4. Tambahkan GEMINI_API_KEY dengan nilai API Key milik admin dari Google AI Studio. Jangan kirim API Key ke chat atau memasukkannya ke HTML publik.
5. Opsional: tambahkan GEMINI_MODEL dengan nama model yang tersedia pada akun/API project. Default paket ini: gemini-3.6-flash. Jika model tersebut tidak tersedia untuk akunmu, ganti dengan model teks Flash yang tercantum di Google AI Studio.
6. Redeploy setelah menyimpan Environment Variables.
7. Uji AI Story Generator. Kalau muncul error, catat pesan error-nya (jangan pernah kirim API Key).

CATATAN BIAYA:
Kuota gratis dan harga berbeda menurut model serta bisa berubah. Periksa harga/limit resmi sebelum membuka untuk publik. Jangan mengaktifkan billing atau membagikan situs ke publik sebelum pengujian dan pembatasan penggunaan disiapkan.

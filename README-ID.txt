KREATORHUB — PAKET REVISI / AUDIT
Tujuan: dipasang ke proyek Netlify yang SUDAH ADA. Jangan buat situs baru.
URL yang dipertahankan: https://kaleidoscopic-meerkat-cdf041.netlify.app/
Google Search Console verification yang dipertahankan:
KCP7oIVcMGBj-562M0-17TOQTb08VqAHyn9xyszXQQ0

STRUKTUR
- index.html, video-generator.html, story.html, chat.html: halaman situs.
- config.js, auth.js: konfigurasi publik dan pengiriman token sesi.
- netlify/functions/*.mjs: endpoint backend; guard.mjs harus berada di netlify/functions/lib/guard.mjs.
- supabase/schema.sql sampai schema-4.sql: SQL berurutan untuk Supabase.
- netlify.toml: publish root folder, folder functions, redirect /story, /chat, /video-generator, header keamanan.

PERBAIKAN YANG DILAKUKAN PADA PAKET INI
1. Menata semua backend ke lokasi Netlify Functions yang benar, termasuk lib/guard.mjs.
2. Generator ide sekarang meminta Gemini membuat ide baru melalui endpoint ideas; tidak lagi mengklaim 1.000 ide hasil kombinasi template lokal. Butuh GEMINI_API_KEY.
3. Duplikasi ID pesan Chat AI ditolak agar pengiriman ulang ID yang sama tidak membuka pemakaian AI gratis berulang.
4. Jika provider video menyatakan selesai tetapi URL hasil belum tersedia, job tetap dipolling; timeout memicu mekanisme pengembalian kredit.
5. Pembuatan tagihan QRIS dan webhook dinonaktifkan secara default. Keduanya baru merespons aktif bila PAYMENTS_ENABLED=true; jangan nyalakan sebelum adapter, verifikasi tanda tangan, dan alur pembayaran disesuaikan dengan dokumentasi gateway yang dipilih.
6. Policy SQL utama dibuat lebih aman untuk dijalankan ulang dengan drop policy sebelum create policy.

PENTING — INTEGRASI YANG BELUM BISA DIANGGAP SELESAI
- config.js masih berisi nilai kosong untuk SUPABASE_URL, SUPABASE_ANON_KEY, dan TURNSTILE_SITEKEY.
- Belum ada project Supabase yang dikonfigurasi dari file yang diterima. Login, saldo, OTP, bonus HP, chat berbayar, antrean, dan top-up memerlukan konfigurasi Supabase sungguhan.
- Gemini membutuhkan GEMINI_API_KEY pada Environment Variables Netlify. Opsional: GEMINI_MODEL, GEMINI_TTS_MODEL, GEMINI_CHAT_MODEL.
- Adapter Seedance adalah kerangka generik: SEEDANCE_API_BASE, endpoint create/status, field request/response, model yang benar, dan tanda tangan/provider harus dicocokkan dengan dokumentasi API yang benar-benar kamu pakai. Jangan nyalakan VIDEO_GEN_ENABLED=true sebelum disesuaikan dan diuji; harga kredit yang ada masih nilai awal, bukan jaminan margin.
- QRIS belum merupakan integrasi siap pakai. topup.mjs memakai endpoint/field generik, sedangkan pay-webhook.mjs memakai contoh HMAC generik. Wajib disesuaikan dengan gateway pilihan dan diuji sandbox sebelum PAYMENTS_ENABLED=true.
- OTP SMS memerlukan Phone provider dan penyedia SMS yang dikonfigurasi di Supabase. OTP WhatsApp tidak otomatis tersedia melalui Supabase.
- Video unggahan dianalisis melalui Gemini Files API. Penghapusan meminta API menghapus file, tetapi tidak menjamin penghapusan dari seluruh log/retensi pihak ketiga.
- Auto Cut dan ekspor MP4 otomatis belum dibuat/diuji; jangan dipromosikan sebagai fitur aktif.

LANGKAH AMAN SEBELUM DEPLOY
1. Unduh/ekstrak paket ini. Pastikan index.html dan netlify.toml ada di root folder, dan backend ada di netlify/functions/.
2. Sambungkan folder/repository ke proyek Netlify LAMA. Jangan ubah nama situs atau URL.
3. Tambahkan Environment Variables yang memang sudah dikonfigurasi: GEMINI_API_KEY. Jangan masukkan secret key ke config.js atau HTML.
4. Jika menggunakan Supabase, jalankan SQL berurutan: supabase/schema.sql, schema-2.sql, schema-3.sql, schema-4.sql. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di config.js; atur SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di Netlify. Service role hanya di server.
5. Uji deploy preview dulu: halaman beranda, Story AI, generator ide, analisis video kecil, voice-over, login, saldo/kredit, Chat AI, dan generator video. Periksa Netlify Function logs.
6. Jangan aktifkan VIDEO_GEN_ENABLED atau PAYMENTS_ENABLED sebelum endpoint provider disesuaikan dan diuji. Jangan deploy ke produksi sebelum preview lolos.

KREDIT DAN PEMBAYARAN
- Model backend memakai aturan harga di netlify/functions/seedance.mjs. Sinkronkan dengan MODELS di video-generator.html dan harga provider sebelum membuka akses.
- Paket top-up yang disiapkan: Rp5.000 / Rp10.000 / Rp25.000 / Rp50.000; aturan 1 kredit = Rp100.
- Tidak ada bukti dari file ini bahwa pembayaran, OTP, Seedance, Gemini, atau Supabase sudah berhasil diuji end-to-end pada akun sungguhan.

PEMERIKSAAN LOKAL YANG DILAKUKAN
- Semua file backend .mjs lolos pemeriksaan sintaks Node.js setelah penataan dan perubahan.
- Pemeriksaan sintaks tidak membuktikan API provider, kredensial, skema Supabase, pembayaran, atau deploy berhasil. Lakukan uji preview sebelum produksi.

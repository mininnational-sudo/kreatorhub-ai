KREATORHUB — PAKET REVISI VIDEO AI (UNTUK PROYEK NETLIFY LAMA)

ISI PAKET
- index.html: mempertahankan halaman dan direktori yang ada; menambahkan upload + analisis video dan pembuatan audio voice-over.
- netlify/functions/generate.mjs: endpoint teks yang sudah ada.
- netlify/functions/video.mjs: sesi upload resumable, upload potongan, verifikasi, analisis video, dan permintaan penghapusan file Google.
- netlify/functions/voice.mjs: pembuatan audio dari Gemini TTS.
- netlify.toml: konfigurasi fungsi Netlify.

PENTING
- Paket ini dimaksudkan untuk proyek Netlify yang sudah ada, bukan membuat situs baru.
- Meta Google Search Console yang ada dipertahankan di index.html.
- Jangan menaruh GEMINI_API_KEY di HTML atau mengirimkannya lewat chat.
- Upload video dibatasi UI hingga 5 menit dan 100 MiB, format MP4/WebM/MOV. Durasi 5 menit diperiksa dari metadata browser dan bukan validasi media sisi server yang tahan manipulasi.
- Video dikirim ke Google Gemini. Fungsi delete meminta penghapusan melalui API, tetapi ini bukan jaminan penghapusan dari semua log atau kebijakan retensi pihak ketiga.
- Sesi upload menggunakan URL resumable sementara di browser. Jangan membagikan sesi/link upload kepada orang lain; bila proses ditinggal terlalu lama, mulai upload kembali.
- Tidak ada login, pembatasan pemakaian per pengguna, billing, atau database kredit produksi.
- Auto Cut sengaja belum ditambahkan/diaktifkan karena pemotongan presisi dan ekspor MP4 belum diuji. Jangan mengiklankannya sebagai fitur aktif.
- Audio voice-over menggunakan endpoint Gemini TTS. Ketersediaan model/voice bergantung pada akses API; default GEMINI_TTS_MODEL adalah gemini-2.5-flash-preview-tts. Output diubah menjadi WAV dengan asumsi PCM mono 24 kHz 16-bit; harus diuji dengan respons model pada akunmu.

PENGATURAN NETLIFY
1. Pertahankan proyek lama kaleidoscopic-meerkat-cdf041 dan URL yang sudah ada.
2. Deploy folder proyek yang berisi index.html, netlify.toml, dan netlify/functions. Jangan hanya mengunggah index.html.
3. Pastikan Environment Variable GEMINI_API_KEY diatur di Netlify.
4. Opsional: GEMINI_MODEL (default gemini-2.5-flash) dan GEMINI_TTS_MODEL (default gemini-2.5-flash-preview-tts). Pastikan model tersedia di akun Google AI/API sebelum digunakan.
5. Setelah deploy, uji dulu dengan video kecil dan pendek. Periksa log fungsi Netlify jika ada error. Baru kemudian uji file lebih besar.

STATUS PENGUJIAN
- Pemeriksaan sintaks JavaScript untuk ketiga Netlify Functions dan skrip inline HTML lulus.
- Ini belum merupakan uji end-to-end terhadap akun Netlify/Google API pengguna. Upload resumable, analisis video, dan audio TTS tetap harus diuji setelah deploy.
- Jangan deploy sebelum meninjau perubahan dan memahami batasan di atas.

=== TAMBAHAN: AI VIDEO GENERATOR (SEEDANCE) ===
FILE BARU
- video-generator.html: halaman /video-generator (HP dulu): model, Teks/Gambar ke Video, prompt, durasi, rasio, bar biaya + Generate, hasil + unduh.
- netlify/functions/seedance.mjs: adapter API video. Ada tanda "SESUAIKAN": path & nama field HARUS dicocokkan dengan dokumentasi penyedia API.
- netlify.toml: ditambah redirect /video-generator.
- index.html: hanya ditambah tombol Buat Video AI/Cerita AI di hero, link header, dan navigasi bawah (HP). Meta Google dipertahankan.

ENVIRONMENT VARIABLES BARU (Netlify)
- SEEDANCE_API_KEY, SEEDANCE_API_BASE (wajib)
- SEEDANCE_CREATE_PATH, SEEDANCE_STATUS_PATH (opsional; default /videos dan /videos/{id})
- VIDEO_GEN_ENABLED=true  -> TANPA ini generator menolak semua permintaan (aman by default).

BELUM ADA / JANGAN DIJUAL DULU
- Login, saldo kredit, dan pemotongan kredit di server belum ada. Selama VIDEO_GEN_ENABLED=true, SIAPA PUN yang membuka situs bisa memakai API-mu dan memakai uangmu. Aktifkan hanya untuk uji sendiri, lalu matikan lagi.
- Angka kredit di video-generator.html (creditPerSec) adalah angka sementara, belum dihitung dari harga API.
- Seedance 2.5 tampil nonaktif ("Segera hadir").
- Belum diuji end-to-end terhadap API Seedance; hanya pemeriksaan sintaks.

=== UPDATE: TAMPILAN GAYA GOOGLE FLOW ===
- video-generator.html kini: Daftar Project -> isi project (grid, unggah banyak gambar/video) -> viewer (geser kiri/kanan antar item) -> sheet pengaturan + pilih model.
- Generate berjalan paralel: tekan generate, geser ke item lain, generate lagi tanpa menunggu yang sebelumnya selesai.
- Model ada di array MODELS (video-generator.html) dan MODELS (seedance.mjs). Item "Omni 1.1 Flash" mendukung teks/gambar/video; Seedance 2.0 Fast teks/gambar. Sesuaikan dengan kemampuan penyedia API-mu.
- Data project tersimpan HANYA di browser perangkat ini (IndexedDB). Ganti ke Supabase saat login & kredit dibuat.
- Video unggahan belum bisa jadi sumber Video ke Video: butuh penyimpanan online agar penyedia bisa mengambil videonya. Sumber yang bisa: gambar, dan video hasil generate.
- Harga kredit di MODELS adalah angka sementara.

=== UPDATE: LOGIN + KREDIT DI SERVER ===
LANGKAH PASANG
1. Buat project di supabase.com. SQL Editor -> tempel isi supabase/schema.sql -> Run.
2. Authentication -> Providers: Email aktif. (Opsional: matikan "Confirm email" saat uji.)
3. Isi config.js: SUPABASE_URL dan SUPABASE_ANON_KEY (anon key boleh publik).
4. Netlify -> Environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (RAHASIA, jangan ke config.js), SEEDANCE_API_KEY, SEEDANCE_API_BASE, VIDEO_GEN_ENABLED=true.
5. Daftar di situsmu, lalu isi saldo uji lewat SQL (contoh ada di baris akhir schema.sql).
CARA KERJA: server memverifikasi login, memotong kredit atomik SEBELUM memanggil penyedia, dan mengembalikan kredit otomatis jika gagal / lewat 20 menit. Pengguna tidak bisa mengubah saldo dari browser.
HARGA RESMI: PRICE di netlify/functions/seedance.mjs (angka sementara). Harus sama dengan MODELS di video-generator.html.
BELUM ADA: top-up otomatis (pembayaran), penyimpanan file (video unggahan), sinkron project ke database.

=== UPDATE: HALAMAN & FITUR TAMBAHAN ===
- /story (story.html): Story AI. Memakai fungsi generate (Gemini) yang sudah ada. Tiap bagian hasil bisa disalin atau "Pakai di Video AI" (prompt otomatis terisi di project berikutnya yang dibuka).
- /video-generator#/akun: profil, saldo, riwayat kredit (butuh Supabase), keluar/masuk.
- /video-generator#/antrean: daftar semua pekerjaan generate + status + tombol hapus yang gagal.
- Ganti nama project: ikon ✎ di dalam project.
- index.html: tombol Cerita AI & menu bawah -> /story; Akun -> halaman akun. Bagian Story/Analisis/Direktori lama di beranda tetap ada.
STATUS JUJUR: tombol Generate tetap bisa ditekan, tetapi tanpa Supabase + penyedia video hasilnya "Gagal" dengan alasan jelas dan TIDAK memotong kredit (pemeriksaan login/konfigurasi dilakukan sebelum kredit dipotong).

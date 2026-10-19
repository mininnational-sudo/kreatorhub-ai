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


=== PEMBARUAN ADAPTER BYTEPLUS MODELARK ===
- netlify/functions/seedance.mjs kini menggunakan endpoint resmi ModelArk untuk membuat dan memeriksa tugas video.
- Model ID Seedance 2.0 Fast: dreamina-seedance-2-0-fast-260128.
- Environment Variables yang diperlukan: SEEDANCE_API_KEY dan VIDEO_GEN_ENABLED. Jangan buat SEEDANCE_API_BASE; endpoint resmi sudah ditetapkan dalam backend.
- VIDEO_GEN_ENABLED harus tetap tidak diatur atau bernilai false sampai admin siap melakukan uji pribadi. Untuk uji pribadi, set ke true sementara lalu matikan kembali.
- API Key hanya disimpan di Netlify Environment Variables, jangan di HTML dan jangan kirim lewat chat.
- Generator saat ini mengirim Text-to-Video pada resolusi 720p, rasio 16:9 / 9:16 / 1:1, audio aktif dan watermark aktif. Durasi yang dikirim 4–15 detik.
- Image-to-Video belum aktif karena upload gambar perlu penyimpanan asset yang aman dan URL yang dapat diakses penyedia API. Seedance 2.5 tetap ditampilkan sebagai Segera hadir dan belum diaktifkan.
- Estimasi kredit dinonaktifkan (Belum dihitung); angka lama bukan harga resmi. Login, database, saldo kredit dan potongan saldo belum dibuat. Jangan buka untuk publik atau jual kredit sebelum fitur tersebut tersedia.
- Alur resmi: POST /api/v3/contents/generations/tasks untuk membuat tugas, lalu GET /api/v3/contents/generations/tasks/{id} untuk memeriksa status. URL video hasil berlaku terbatas; simpan hasil ke storage sendiri bila diperlukan.
- Status pemeriksaan: kode disesuaikan dengan dokumentasi BytePlus ModelArk, tetapi belum diuji end-to-end karena tidak ada API key/akun pengguna yang tersambung.

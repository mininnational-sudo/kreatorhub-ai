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

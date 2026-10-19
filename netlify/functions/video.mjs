const API = 'https://generativelanguage.googleapis.com';
const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

const MAX_BYTES = 100 * 1024 * 1024;
const CHUNK_MAX = 2 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime'
]);

const reply = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });

function normalizeMime(mimeType, displayName = '') {
  const mime = String(mimeType || '').toLowerCase().trim();

  if (ALLOWED_MIME.has(mime)) return mime;

  const name = String(displayName).toLowerCase();

  if (name.endsWith('.mp4')) return 'video/mp4';
  if (name.endsWith('.webm')) return 'video/webm';
  if (name.endsWith('.mov')) return 'video/quicktime';

  return '';
}

function isGoogleUploadUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === 'https:' &&
      url.hostname === 'generativelanguage.googleapis.com' &&
      url.pathname.startsWith('/upload/')
    );
  } catch {
    return false;
  }
}

async function googleError(response) {
  const text = await response.text();

  try {
    const data = JSON.parse(text);
    return data?.error?.message || text.slice(0, 700);
  } catch {
    return text.slice(0, 700);
  }
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return reply({ error: 'Gunakan metode POST.' }, 405);
  }

  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return reply({
      error: 'GEMINI_API_KEY belum diatur di Netlify.'
    }, 503);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return reply({ error: 'JSON permintaan tidak valid.' }, 400);
  }

  const action = String(body.action || '');

  try {
    // ==========================================
    // 1. MEMULAI SESI UPLOAD GOOGLE GEMINI
    // ==========================================
    if (action === 'create-session') {
      const size = Number(body.size);

      const displayName = String(
        body.displayName || 'video-upload.mp4'
      )
        .replace(/[^\w. -]/g, '_')
        .slice(0, 80);

      const mimeType = normalizeMime(
        body.mimeType,
        displayName
      );

      if (
        !Number.isSafeInteger(size) ||
        size < 1 ||
        size > MAX_BYTES
      ) {
        return reply({
          error: 'Ukuran video harus lebih dari 0 dan maksimal 100 MiB.'
        }, 400);
      }

      if (!mimeType) {
        return reply({
          error: 'Format video tidak didukung. Gunakan MP4, WebM, atau MOV.'
        }, 400);
      }

      const start = await fetch(
        `${API}/upload/v1beta/files`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': key,
            'x-goog-upload-protocol': 'resumable',
            'x-goog-upload-command': 'start',
            'x-goog-upload-header-content-length': String(size),
            'x-goog-upload-header-content-type': mimeType,
            'content-type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify({
            file: {
              display_name: displayName
            }
          })
        }
      );

      if (!start.ok) {
        const detail = await googleError(start);

        console.error(
          'Gemini upload initialization failed:',
          start.status,
          detail
        );

        return reply({
          error: `Google gagal memulai upload (HTTP ${start.status}).`,
          detail
        }, 502);
      }

      const sessionUrl = start.headers.get(
        'x-goog-upload-url'
      );

      if (!sessionUrl || !isGoogleUploadUrl(sessionUrl)) {
        return reply({
          error: 'Google tidak memberikan URL upload yang valid.'
        }, 502);
      }

      return reply({
        sessionUrl,
        chunkSize: CHUNK_MAX,
        maxBytes: MAX_BYTES,
        mimeType,
        displayName
      });
    }

    // ==========================================
    // 2. MENGIRIM POTONGAN VIDEO
    // ==========================================
    if (action === 'upload-chunk') {
      const sessionUrl = String(body.sessionUrl || '');
      const offset = Number(body.offset);
      const encoded = String(body.chunkBase64 || '');

      if (!isGoogleUploadUrl(sessionUrl)) {
        return reply({
          error: 'URL sesi upload tidak valid.'
        }, 400);
      }

      if (!Number.isSafeInteger(offset) || offset < 0) {
        return reply({
          error: 'Offset upload tidak valid.'
        }, 400);
      }

      if (
        !encoded ||
        encoded.length > Math.ceil(CHUNK_MAX * 4 / 3) + 16
      ) {
        return reply({
          error: 'Potongan video terlalu besar atau kosong.'
        }, 413);
      }

      let binary;

      try {
        binary = atob(encoded);
      } catch {
        return reply({
          error: 'Data potongan video tidak valid.'
        }, 400);
      }

      if (
        binary.length < 1 ||
        binary.length > CHUNK_MAX
      ) {
        return reply({
          error: 'Ukuran potongan harus maksimal 2 MiB.'
        }, 413);
      }

      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const isFinal = body.isFinal === true;

      const upstream = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
          'content-length': String(bytes.byteLength),
          'x-goog-upload-offset': String(offset),
          'x-goog-upload-command': isFinal
            ? 'upload, finalize'
            : 'upload'
        },
        body: bytes
      });

      const responseText = await upstream.text();

      if (!upstream.ok) {
        console.error(
          'Gemini chunk upload failed:',
          upstream.status,
          responseText.slice(0, 700)
        );

        return reply({
          error: `Upload Google gagal (HTTP ${upstream.status}).`,
          detail: responseText.slice(0, 700)
        }, 502);
      }

      let file = null;

      try {
        file = responseText
          ? JSON.parse(responseText)
          : null;
      } catch {
        // Respons kosong atau bukan JSON.
      }

      const fileName =
        file?.file?.name ||
        file?.name ||
        null;

      return reply({
        ok: true,
        receivedBytes: bytes.byteLength,
        isFinal,
        fileName,
        file
      });
    }

    // ==========================================
    // 3. MEMERIKSA STATUS FILE
    // ==========================================
    if (action === 'verify') {
      const fileName = String(body.fileName || '');

      if (!/^files\/[A-Za-z0-9_-]+$/.test(fileName)) {
        return reply({
          error: 'Nama file Google tidak valid.'
        }, 400);
      }

      const response = await fetch(
        `${API}/v1beta/${fileName}`,
        {
          headers: {
            'x-goog-api-key': key
          }
        }
      );

      if (!response.ok) {
        const detail = await googleError(response);

        return reply({
          error: `Pemeriksaan file gagal (HTTP ${response.status}).`,
          detail
        }, 502);
      }

      const data = await response.json();

      return reply({
        name: data.name,
        state: data.state,
        uri: data.uri,
        mimeType: data.mimeType,
        sizeBytes: Number(data.sizeBytes || 0)
      });
    }

    // ==========================================
    // 4. ANALISIS VIDEO DENGAN GEMINI
    // ==========================================
    if (action === 'analyze') {
      const fileName = String(body.fileName || '');
      const mode = String(body.mode || 'recap').slice(0, 40);
      const extra = String(body.extra || '')
        .trim()
        .slice(0, 3000);

      if (!/^files\/[A-Za-z0-9_-]+$/.test(fileName)) {
        return reply({
          error: 'Nama file Google tidak valid.'
        }, 400);
      }

      const fileResponse = await fetch(
        `${API}/v1beta/${fileName}`,
        {
          headers: {
            'x-goog-api-key': key
          }
        }
      );

      if (!fileResponse.ok) {
        const detail = await googleError(fileResponse);

        return reply({
          error: 'Gagal mengambil informasi video dari Google.',
          detail
        }, 502);
      }

      const file = await fileResponse.json();

      if (
        file.state !== 'ACTIVE' ||
        !file.uri ||
        !ALLOWED_MIME.has(
          String(file.mimeType || '').toLowerCase()
        )
      ) {
        return reply({
          error: 'Video belum siap dianalisis. Tunggu sebentar lalu coba lagi.'
        }, 409);
      }

      if (Number(file.sizeBytes || 0) > MAX_BYTES) {
        return reply({
          error: 'Ukuran video melebihi 100 MiB.'
        }, 413);
      }

      const model =
        process.env.GEMINI_MODEL ||
        'gemini-2.5-flash';

      const prompt = `
Analisis video yang dilampirkan, bukan hanya nama filenya.

Bahasa keluaran: Indonesia alami.
Mode: ${mode}.

${extra ? `Catatan pengguna: ${extra}` : ''}

Berikan:
1. Ringkasan kejadian yang benar-benar tampak.
2. Urutan adegan dan daftar tokoh.
3. Judul video yang sesuai.
4. Hook pembuka sekitar 3 detik.
5. Recap naratif per adegan yang siap dibacakan.
6. Perkiraan durasi voice-over.
7. Prompt visual tambahan untuk setiap adegan dengan konsistensi karakter.

Jangan mengarang detail yang tidak tampak.
Tandai bagian yang tidak dapat dipastikan.
Untuk recap film berhak cipta, gunakan kata-kata sendiri dan jangan menyalin dialog panjang.
      `.trim();

      const response = await fetch(
        `${API}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'x-goog-api-key': key
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: prompt },
                {
                  file_data: {
                    mime_type: file.mimeType,
                    file_uri: file.uri
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 5000
            }
          })
        }
      );

      if (!response.ok) {
        const detail = await googleError(response);

        console.error(
          'Gemini video analysis failed:',
          response.status,
          detail
        );

        return reply({
          error: `Analisis Gemini gagal (HTTP ${response.status}).`,
          detail
        }, response.status === 429 ? 429 : 502);
      }

      const result = await response.json();

      const text = (
        result?.candidates?.[0]?.content?.parts || []
      )
        .map(part => part.text || '')
        .join('\n')
        .trim();

      if (!text) {
        return reply({
          error: 'Gemini tidak mengembalikan hasil analisis.'
        }, 502);
      }

      return reply({
        text,
        model,
        fileName,
        note: 'Analisis berhasil. Hapus file sementara setelah selesai jika tidak diperlukan lagi.'
      });
    }

    // ==========================================
    // 5. MENGHAPUS FILE SEMENTARA
    // ==========================================
    if (action === 'delete') {
      const fileName = String(body.fileName || '');

      if (!/^files\/[A-Za-z0-9_-]+$/.test(fileName)) {
        return reply({
          error: 'Nama file Google tidak valid.'
        }, 400);
      }

      const response = await fetch(
        `${API}/v1beta/${fileName}`,
        {
          method: 'DELETE',
          headers: {
            'x-goog-api-key': key
          }
        }
      );

      if (response.ok || response.status === 404) {
        return reply({
          ok: true,
          deletionRequestAccepted: true
        });
      }

      const detail = await googleError(response);

      return reply({
        error: `Penghapusan file gagal (HTTP ${response.status}).`,
        detail
      }, 502);
    }

    return reply({
      error: `Aksi tidak dikenal: ${action || '(kosong)'}.`
    }, 400);

  } catch (error) {
    console.error(
      'Video function error:',
      error?.message || String(error)
    );

    return reply({
      error: 'Terjadi gangguan saat memproses video.',
      detail: error?.message || 'Kesalahan tidak diketahui.'
    }, 502);
  }
        }

const API = 'https://generativelanguage.googleapis.com';
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const MAX_BYTES = 100 * 1024 * 1024;
const CHUNK_MAX = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

export default async (request) => {
  if (request.method !== 'POST') return reply({ error: 'Gunakan metode POST.' }, 405);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return reply({ error: 'Backend belum dikonfigurasi: GEMINI_API_KEY belum diatur di Netlify.' }, 503);
  let body;
  try { body = await request.json(); } catch { return reply({ error: 'JSON permintaan tidak valid.' }, 400); }
  const action = String(body.action || '');

  try {
    if (action === 'create-session') {
      const size = Number(body.size);
      const mimeType = String(body.mimeType || '');
      const displayName = String(body.displayName || 'video-upload').replace(/[^\w. -]/g, '_').slice(0, 80);
      if (!Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES) return reply({ error: 'Ukuran video harus maksimal 100 MiB.' }, 400);
      if (!ALLOWED_MIME.has(mimeType)) return reply({ error: 'Format video harus MP4, WebM, atau MOV.' }, 400);
      const start = await fetch(`${API}/upload/v1beta/files?uploadType=resumable`, {
        method: 'POST',
        headers: {
          'x-goog-api-key': key,
          'x-goog-upload-protocol': 'resumable',
          'x-goog-upload-command': 'start',
          'x-goog-upload-header-content-length': String(size),
          'x-goog-upload-header-content-type': mimeType,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ file: { display_name: displayName } })
      });
      if (!start.ok) return reply({ error: `Google gagal memulai upload (HTTP ${start.status}).` }, 502);
      const sessionUrl = start.headers.get('x-goog-upload-url');
      if (!sessionUrl || !isGoogleUploadUrl(sessionUrl)) return reply({ error: 'Google tidak memberikan URL upload yang valid.' }, 502);
      return reply({ sessionUrl, chunkSize: CHUNK_MAX, maxBytes: MAX_BYTES, expiresNote: 'Sesi upload sementara; selesaikan upload tanpa menutup halaman.' });
    }

    if (action === 'upload-chunk') {
      const sessionUrl = String(body.sessionUrl || '');
      const offset = Number(body.offset);
      const encoded = String(body.chunkBase64 || '');
      if (!isGoogleUploadUrl(sessionUrl)) return reply({ error: 'Sesi upload tidak valid.' }, 400);
      if (!Number.isSafeInteger(offset) || offset < 0) return reply({ error: 'Offset upload tidak valid.' }, 400);
      if (!encoded || encoded.length > Math.ceil(CHUNK_MAX * 4 / 3) + 16) return reply({ error: 'Potongan video terlalu besar.' }, 413);
      const binary = atob(encoded);
      if (binary.length < 1 || binary.length > CHUNK_MAX) return reply({ error: 'Ukuran potongan harus maksimal 2 MiB.' }, 413);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const isFinal = body.isFinal === true;
      const upstream = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
          'content-length': String(bytes.byteLength),
          'x-goog-upload-offset': String(offset),
          'x-goog-upload-command': isFinal ? 'upload, finalize' : 'upload'
        },
        body: bytes
      });
      const responseText = await upstream.text();
      if (!upstream.ok) return reply({ error: `Upload Google gagal (HTTP ${upstream.status}).`, detail: responseText.slice(0, 300) }, 502);
      let file = null;
      try { file = responseText ? JSON.parse(responseText) : null; } catch {}
      return reply({ ok: true, receivedBytes: bytes.byteLength, isFinal, fileName: file?.file?.name || file?.name || null, file });
    }

    if (action === 'verify') {
      const fileName = String(body.fileName || '');
      if (!/^files\/[A-Za-z0-9_-]+$/.test(fileName)) return reply({ error: 'Nama file Google tidak valid.' }, 400);
      const response = await fetch(`${API}/v1beta/${fileName}`, { headers: { 'x-goog-api-key': key } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return reply({ error: `Pemeriksaan file gagal (HTTP ${response.status}).` }, 502);
      return reply({ name: data.name, state: data.state, uri: data.uri, mimeType: data.mimeType, sizeBytes: Number(data.sizeBytes || 0) });
    }

    if (action === 'analyze') {
      const fileName = String(body.fileName || '');
      const mode = String(body.mode || 'recap').slice(0, 40);
      const extra = String(body.extra || '').trim().slice(0, 3000);
      if (!/^files\/[A-Za-z0-9_-]+$/.test(fileName)) return reply({ error: 'Nama file Google tidak valid.' }, 400);
      const fileResponse = await fetch(`${API}/v1beta/${fileName}`, { headers: { 'x-goog-api-key': key } });
      const file = await fileResponse.json().catch(() => ({}));
      if (!fileResponse.ok || file.state !== 'ACTIVE' || !file.uri || !ALLOWED_MIME.has(file.mimeType)) return reply({ error: 'Video belum siap dianalisis. Tunggu sebentar lalu coba lagi.' }, 409);
      if (Number(file.sizeBytes || 0) > MAX_BYTES) return reply({ error: 'Ukuran video melebihi 100 MiB.' }, 413);
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const prompt = `Analisis video yang dilampirkan, bukan hanya nama filenya. Bahasa keluaran: Indonesia alami. Mode: ${mode}. ${extra ? `Catatan pengguna: ${extra}` : ''}\n\nBerikan: (1) ringkasan apa yang benar-benar tampak/terjadi, urutan adegan dan tokoh; (2) judul video; (3) hook 3 detik; (4) recap naratif per adegan dengan VO yang siap dibacakan; (5) perkiraan durasi VO; (6) prompt visual tambahan per adegan yang konsisten. Jangan mengarang detail yang tidak tampak; tandai bagian yang tidak dapat dipastikan. Untuk recap film berhak cipta, rangkum dengan kata-kata sendiri dan jangan menyalin dialog panjang.`;
      const response = await fetch(`${API}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }, { file_data: { mime_type: file.mimeType, file_uri: file.uri } }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 5000 } })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return reply({ error: result?.error?.message || `Analisis Gemini gagal (HTTP ${response.status}).` }, response.status === 429 ? 429 : 502);
      const text = (result?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('\n').trim();
      if (!text) return reply({ error: 'Gemini tidak mengembalikan hasil analisis.' }, 502);
      return reply({ text, model, fileName, note: 'Analisis berhasil. Penghapusan file dilakukan melalui aksi delete; hasil ini bukan jaminan penghapusan dari semua log/retensi pihak ketiga.' });
    }

    if (action === 'delete') {
      const fileName = String(body.fileName || '');
      if (!/^files\/[A-Za-z0-9_-]+$/.test(fileName)) return reply({ error: 'Nama file Google tidak valid.' }, 400);
      const response = await fetch(`${API}/v1beta/${fileName}`, { method: 'DELETE', headers: { 'x-goog-api-key': key } });
      if (response.ok || response.status === 404) return reply({ ok: true, deletionRequestAccepted: true });
      return reply({ error: `Penghapusan file gagal (HTTP ${response.status}).` }, 502);
    }
    return reply({ error: 'Aksi tidak dikenal.' }, 400);
  } catch {
    return reply({ error: 'Terjadi gangguan koneksi saat memproses video. Coba lagi.' }, 502);
  }
};

function isGoogleUploadUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'generativelanguage.googleapis.com' && url.pathname.startsWith('/upload/');
  } catch { return false; }
}

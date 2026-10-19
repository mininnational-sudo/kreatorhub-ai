// KreatorHub — BytePlus ModelArk / Dreamina Seedance video generation.
// API key hanya dibaca di Netlify Functions, tidak pernah dikirim ke browser.
const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: HEADERS });
const API_BASE = 'https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks';
const MODEL_IDS = {
  'seedance-2.0-fast': 'dreamina-seedance-2-0-fast-260128'
};
const RATIOS = new Set(['16:9', '9:16', '1:1']);

export default async (request) => {
  if (request.method !== 'POST') return reply({ error: 'Gunakan metode POST.' }, 405);
  if (process.env.VIDEO_GEN_ENABLED !== 'true') {
    return reply({ error: 'Generator masih dikunci untuk keamanan. Aktifkan hanya untuk uji pribadi setelah API key dan batas biaya siap.' }, 503);
  }
  const apiKey = process.env.SEEDANCE_API_KEY;
  if (!apiKey) return reply({ error: 'Backend belum dikonfigurasi. Admin perlu mengisi SEEDANCE_API_KEY di Netlify.' }, 503);

  let body;
  try { body = await request.json(); }
  catch { return reply({ error: 'Data permintaan tidak valid.' }, 400); }

  try {
    if (body.action === 'create') {
      const modelId = MODEL_IDS[String(body.model || '')];
      if (!modelId) return reply({ error: 'Model belum tersedia.' }, 400);
      const prompt = String(body.prompt || '').trim().slice(0, 2000);
      const duration = Number(body.duration);
      const ratio = String(body.ratio || '16:9');
      if (!prompt) return reply({ error: 'Prompt wajib diisi.' }, 400);
      if (!Number.isInteger(duration) || duration < 4 || duration > 15) {
        return reply({ error: 'Seedance 2.0 Fast mendukung durasi 4–15 detik.' }, 400);
      }
      if (!RATIOS.has(ratio)) return reply({ error: 'Rasio video tidak didukung.' }, 400);
      // Versi paket ini mengaktifkan Text-to-Video. Image-to-Video ditahan sampai
      // penyimpanan gambar publik aman dikonfigurasi; data URL browser bukan URL asset resmi.
      if (body.image) {
        return reply({ error: 'Image-to-Video belum diaktifkan. Paket ini memakai Text-to-Video dahulu; upload gambar akan disambungkan setelah penyimpanan asset aman tersedia.' }, 400);
      }

      const upstream = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          content: [{ type: 'text', text: prompt }],
          duration,
          ratio,
          resolution: '720p',
          generate_audio: true,
          watermark: true
        })
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const message = data?.error?.message || data?.message || `BytePlus ModelArk merespons HTTP ${upstream.status}.`;
        return reply({ error: message }, upstream.status === 429 ? 429 : 502);
      }
      const id = data.id || data.task_id || data.data?.id;
      if (!id) return reply({ error: 'API tidak mengembalikan ID tugas video.' }, 502);
      return reply({ id: String(id), status: data.status || 'queued' });
    }

    if (body.action === 'status') {
      const id = String(body.id || '');
      if (!/^[\w-]{4,150}$/.test(id)) return reply({ error: 'ID tugas tidak valid.' }, 400);
      const upstream = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const message = data?.error?.message || data?.message || `Pemeriksaan status gagal (HTTP ${upstream.status}).`;
        return reply({ error: message }, upstream.status === 429 ? 429 : 502);
      }
      const status = String(data.status || '').toLowerCase();
      if (status === 'succeeded') return reply({ state: 'done', url: data.content?.video_url || null });
      if (['failed', 'cancelled', 'canceled'].includes(status)) {
        return reply({ state: 'failed', error: data.error?.message || data.message || 'Pembuatan video gagal.' });
      }
      return reply({ state: 'processing', status: status || 'running' });
    }

    return reply({ error: 'Aksi tidak dikenal.' }, 400);
  } catch (error) {
    console.error('Seedance function error:', error?.message || error);
    return reply({ error: 'Tidak dapat menghubungi BytePlus ModelArk. Periksa konfigurasi dan log Netlify.' }, 502);
  }
};

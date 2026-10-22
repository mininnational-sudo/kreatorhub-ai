import { guard } from './lib/guard.mjs';
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
export default async (request) => {
  if (request.method !== 'POST') return reply({ error: 'Gunakan metode POST.' }, 405);
  const g = await guard(request, 'voice', 15, 3600); if (g instanceof Response) return g;
  const key = process.env.GEMINI_API_KEY;
  if (!key) return reply({ error: 'GEMINI_API_KEY belum diatur di Netlify.' }, 503);
  let body;
  try { body = await request.json(); } catch { return reply({ error: 'Data permintaan tidak valid.' }, 400); }
  const text = String(body.text || '').trim().slice(0, 4000);
  const voiceName = String(body.voiceName || 'Kore').slice(0, 40);
  if (!text) return reply({ error: 'Naskah voice-over kosong.' }, 400);
  const model = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Bacakan dalam Bahasa Indonesia dengan artikulasi jelas, gaya storytelling sinematik dan emosional. Jangan menambahkan kata-kata baru. Naskah:\n${text}` }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } }
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return reply({ error: data?.error?.message || `Gemini TTS gagal (HTTP ${upstream.status}).` }, upstream.status === 429 ? 429 : 502);
    const part = (data?.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.data);
    if (!part) return reply({ error: 'Gemini TTS tidak mengembalikan audio.' }, 502);
    return reply({ audioBase64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000', model, voiceName });
  } catch { return reply({ error: 'Tidak dapat menghubungi layanan suara Gemini.' }, 502); }
};

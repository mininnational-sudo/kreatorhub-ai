// Isi dari Supabase > Project Settings > API. Kunci "anon" memang publik (aman karena RLS).
// JANGAN pernah menaruh service_role key di sini.
// TURNSTILE_SITEKEY: kunci situs Cloudflare Turnstile (gratis). Kosong = captcha mati.
window.KH = { SUPABASE_URL: "", SUPABASE_ANON_KEY: "", TURNSTILE_SITEKEY: "" };

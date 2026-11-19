// Cloudflare Worker: public entry point (run.msidgroup.com) for the LNT registration system.
// Forwards every request to the Supabase Edge Function and restores HTML content types
// (Supabase serves text/html as text/plain on its own domain).
const ORIGIN = 'https://rrgfqxraxnixjoqttots.supabase.co/functions/v1/lnt';
const CSP = "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = (env && env.ORIGIN) || ORIGIN;
    const headers = new Headers(request.headers);
    headers.delete('host');
    const ip = request.headers.get('cf-connecting-ip');
    if (ip) headers.set('x-forwarded-for', ip);
    const init = { method: request.method, headers, redirect: 'manual' };
    if (request.method !== 'GET' && request.method !== 'HEAD') { init.body = request.body; init.duplex = 'half'; }
    let res;
    try {
      res = await fetch(origin + url.pathname + url.search, init);
    } catch (e) {
      return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><p style="font-family:sans-serif;padding:20px">ລະບົບບໍ່ສາມາດເຊື່ອມຕໍ່ໄດ້ຊົ່ວຄາວ. ກະລຸນາລອງໃໝ່ໃນອີກບໍ່ເທົ່າໃດນາທີ.</p>',
        { status: 502, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }
    const out = new Headers(res.headers);
    if (out.get('x-lnt-html') === '1') {
      out.set('content-type', 'text/html; charset=utf-8');
      out.set('content-security-policy', CSP);
    }
    out.delete('x-lnt-html');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
  },
};

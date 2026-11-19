'use strict';
const path = require('path');
const express = require('express');
const { createPool, migrate } = require('./db');
const { AppError } = require('./domain');
const publicApi = require('./public-api');
const adminApi = require('./admin-api');

function loadConfig(env = process.env) {
  const appSecret = env.APP_SECRET || '';
  if (appSecret.length < 32) throw new Error('APP_SECRET must be set (at least 32 random characters). See .env.example');
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL must be set. See .env.example');
  return {
    port: Number(env.PORT || 3000),
    databaseUrl: env.DATABASE_URL,
    appSecret,
    cookieSecure: env.COOKIE_SECURE !== 'false',
    trustProxy: env.TRUST_PROXY || false,
  };
}

function createApp({ pool, config, staticFiles }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', /^\d+$/.test(config.trustProxy) ? Number(config.trustProxy) : config.trustProxy);

  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    });
    if (config.cookieSecure) res.set('Strict-Transport-Security', 'max-age=15552000');
    // Access log: method, path, status, duration only. Never headers, query strings, bodies or tokens.
    const t = Date.now();
    res.on('finish', () => {
      if (process.env.ACCESS_LOG !== 'false') console.log(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${Date.now() - t}ms`);
    });
    next();
  });

  app.get('/healthz', async (req, res) => {
    await pool.query('SELECT 1');
    res.set('Cache-Control', 'no-store').json({ ok: true, time: new Date().toISOString() });
  });

  app.use('/api/public', publicApi({ pool, config }));
  app.use('/api/admin', adminApi({ pool, config }));

  // Public images set by the owner (logo, QR, event photos). Payment proofs are never served here.
  app.get('/assets/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new AppError(404, 'NOT_FOUND', 'ບໍ່ພົບຮູບ');
    const q = await pool.query('SELECT content_type, data FROM assets WHERE id=$1', [id]);
    if (!q.rowCount) throw new AppError(404, 'NOT_FOUND', 'ບໍ່ພົບຮູບ');
    res.set({ 'Content-Type': q.rows[0].content_type, 'Cache-Control': 'public, max-age=3600' }).send(q.rows[0].data);
  });

  if (staticFiles) {
    // Embedded assets (used by the Supabase Edge deployment, which has no file system).
    const routes = { '/': 'index.html', '/register': 'register.html', '/status': 'status.html', '/admin': 'admin.html' };
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const name = routes[req.path] || (req.path.startsWith('/static/') || req.path.startsWith('/fonts/') ? req.path.slice(1) : null);
      const f = name && staticFiles[name];
      if (!f) return next();
      if (f.type.startsWith('text/html')) res.set({ 'Cache-Control': 'no-cache', 'X-LNT-HTML': '1' });
      else res.set('Cache-Control', name.startsWith('fonts/') ? 'public, max-age=2592000, immutable' : 'public, max-age=3600');
      res.set('Content-Type', f.type).send(f.body);
    });
  } else {
    // Self-hosted Lao font: no dependency on Google Fonts or any third-party CDN.
    app.use('/fonts', express.static(path.join(path.dirname(require.resolve('@fontsource/noto-sans-lao/package.json')), 'files'), { maxAge: '30d', immutable: true }));
    const pub = path.join(__dirname, '..', 'public');
    const html = (file) => (req, res) => res.set('Cache-Control', 'no-cache').sendFile(path.join(pub, file));
    app.get('/', html('index.html'));
    app.get('/register', html('register.html'));
    app.get('/status', html('status.html'));
    app.get('/admin', html('admin.html'));
    app.use('/static', express.static(path.join(pub, 'static'), { maxAge: '1h' }));
  }

  app.use('/api', (req, res) => res.status(404).json({ error: 'NOT_FOUND', message: 'ບໍ່ພົບ' }));
  app.use((req, res) => res.status(404).set('Content-Type', 'text/html; charset=utf-8').send('<!doctype html><meta charset="utf-8"><title>404</title><p style="font-family:sans-serif">ບໍ່ພົບໜ້ານີ້. <a href="/">ກັບໜ້າຫຼັກ</a></p>'));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof AppError) {
      return res.status(err.status).json({ error: err.code, message: err.message, ...(err.extra || {}) });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'TOO_LARGE', message: 'ໄຟລ໌ ຫຼື ຂໍ້ມູນໃຫຍ່ເກີນໄປ. ຮູບຫຼັກຖານຕ້ອງບໍ່ເກີນ 5 MB' });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'BAD_JSON', message: 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ' });
    }
    if (err.type === 'request.aborted') return; // client went away (slow connection)
    console.error('unhandled error:', err.code || '', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'ລະບົບມີບັນຫາຊົ່ວຄາວ. ຂໍ້ມູນຂອງທ່ານຍັງຢູ່ໃນແບບຟອມ — ກະລຸນາລອງໃໝ່' });
  });
  return app;
}

async function main() {
  const config = loadConfig();
  const pool = createPool(config.databaseUrl);
  if (process.env.MIGRATE_ON_START !== 'false') await migrate(pool);
  const app = createApp({ pool, config });
  const server = app.listen(config.port, () => console.log(`LNT registration listening on :${config.port}`));
  server.requestTimeout = 120000; // allow slow mobile uploads
  const stop = () => server.close(() => pool.end().then(() => process.exit(0)));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { createApp, loadConfig };

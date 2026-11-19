'use strict';
const { createPool, migrate } = require('../src/db');
const { createApp } = require('../src/server');
const { hashPassword } = require('../src/security');

const DB = process.env.TEST_DATABASE_URL;
if (!DB) throw new Error('Set TEST_DATABASE_URL to a disposable PostgreSQL database (it will be wiped)');
const logs = [];

async function setup() {
  process.env.DISABLE_RATE_LIMIT = 'true';
  const pool = createPool(DB);
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(pool, () => {});
  const config = { appSecret: 'test-secret-'.padEnd(48, 'x'), cookieSecure: false, trustProxy: false };
  // Capture everything the server logs, to verify no secrets are written.
  const origLog = console.log; const origErr = console.error;
  console.log = (...a) => logs.push(a.join(' '));
  console.error = (...a) => logs.push(a.join(' '));
  const app = createApp({ pool, config });
  const server = await new Promise((res) => { const s = app.listen(0, () => res(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [u, role] of [['owner1', 'owner'], ['acct1', 'accountant'], ['staff1', 'staff']]) {
    await pool.query('INSERT INTO staff (username, display_name, password_hash, role) VALUES ($1,$1,$2,$3)', [u, hashPassword('correct-horse-1'), role]);
  }
  return {
    pool, base, logs,
    async close() { console.log = origLog; console.error = origErr; await new Promise((r) => server.close(r)); await pool.end(); },
  };
}

let seq = 0;
const key = () => `testkey-${Date.now()}-${++seq}-${Math.random().toString(36).slice(2)}`;
const member = (o = {}) => ({ fullName: `Runner ${++seq}`, gender: 'male', dob: '1990-05-01', shirtSize: 'M', ...o });
function individual(category, o = {}) {
  const name = o.contactName || `Person ${++seq}`;
  return {
    idempotencyKey: key(), category, contactName: name, contactPhone: '020 5555 1234',
    emergencyName: 'Emergency Contact', emergencyPhone: '020 7777 8888', consent: true,
    members: [{ gender: o.gender || 'male', dob: o.dob || '1990-05-01', shirtSize: 'L' }], ...o,
  };
}
function family(n, o = {}) {
  return {
    idempotencyKey: key(), category: 'family', teamName: `Team ${++seq}`, contactName: 'Team Contact', contactPhone: '020 2222 3333', consent: true,
    members: Array.from({ length: n }, (_, i) => member({ gender: i % 2 ? 'female' : 'male' })), ...o,
  };
}

async function req(base, method, path, { body, headers = {}, raw, cookie } = {}) {
  const h = { ...headers };
  if (cookie) h.Cookie = cookie;
  let b;
  if (raw !== undefined) b = raw;
  else if (body !== undefined) { h['Content-Type'] = 'application/json'; b = JSON.stringify(body); }
  const res = await fetch(base + path, { method, headers: h, body: b });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  return { status: res.status, data, headers: res.headers };
}

async function login(base, username) {
  const res = await fetch(base + '/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'lnt-admin' },
    body: JSON.stringify({ username, password: 'correct-horse-1' }),
  });
  if (res.status !== 200) throw new Error('login failed ' + res.status);
  return res.headers.get('set-cookie').split(';')[0];
}
const adm = (base, cookie) => (method, path, body) => req(base, method, '/api/admin' + path, { body, cookie, headers: { 'X-Requested-With': 'lnt-admin' } });

// Minimal valid image headers
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 1)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 2)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(200, 3)]);

module.exports = { setup, key, member, individual, family, req, login, adm, PNG, JPG, WEBP };

'use strict';
const crypto = require('crypto');
const { REF_ALPHABET, AppError } = require('./domain');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function randomFromAlphabet(n, alphabet = REF_ALPHABET) {
  // Rejection sampling: no modulo bias.
  const out = [];
  const limit = 256 - (256 % alphabet.length);
  while (out.length < n) {
    for (const b of crypto.randomBytes(n * 2)) {
      if (b < limit && out.length < n) out.push(alphabet[b % alphabet.length]);
    }
  }
  return out.join('');
}

const newReference = () => 'LNT26-' + randomFromAlphabet(6);

/** Access code shown to the participant, e.g. 7KQ2-M9XA-P4TR (12 chars, ~59 bits). */
function formatCode(chars) {
  return chars.match(/.{1,4}/g).join('-');
}
/** Deterministic per idempotency key, so a retried request can return the same code without storing it. */
function accessCodeFor(secret, idempotencyKey) {
  const mac = crypto.createHmac('sha256', secret).update('access:' + idempotencyKey).digest();
  const chars = [];
  const limit = 256 - (256 % REF_ALPHABET.length);
  let i = 0;
  let buf = mac;
  while (chars.length < 12) {
    if (i >= buf.length) { buf = crypto.createHmac('sha256', secret).update(buf).digest(); i = 0; }
    const b = buf[i++];
    if (b < limit) chars.push(REF_ALPHABET[b % REF_ALPHABET.length]);
  }
  return formatCode(chars.join(''));
}
const randomAccessCode = () => formatCode(randomFromAlphabet(12));
const normalizeCode = (c) => String(c || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
const hashAccessCode = (code) => sha256('acc:' + normalizeCode(code));

function safeEqualHex(a, b) {
  const x = Buffer.from(String(a), 'hex');
  const y = Buffer.from(String(b), 'hex');
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

// Passwords: scrypt with per-user salt.
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt.toString('base64')}$${key.toString('base64')}`;
}
function verifyPassword(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]);
  const salt = Buffer.from(parts[2], 'base64');
  const expected = Buffer.from(parts[3], 'base64');
  const key = crypto.scryptSync(String(password), salt, expected.length, { N, r: 8, p: 1 });
  return crypto.timingSafeEqual(key, expected);
}
function checkPasswordStrength(pw) {
  if (typeof pw !== 'string' || pw.length < 10) throw new AppError(400, 'WEAK_PASSWORD', 'ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 10 ຕົວອັກສອນ');
  if (pw.length > 200) throw new AppError(400, 'WEAK_PASSWORD', 'ລະຫັດຜ່ານຍາວເກີນໄປ');
}

/** Detect real image type from file bytes (not from the client's Content-Type). */
function sniffImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

/** Simple fixed-window rate limiter (per process). */
function rateLimiter({ windowMs, max, name }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, Math.min(windowMs, 60000));
  if (timer && typeof timer.unref === 'function') timer.unref();
  return (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true') return next();
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset <= now) { h = { count: 0, reset: now + windowMs }; hits.set(key, h); }
    h.count += 1;
    if (h.count > max) {
      res.set('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'ມີການສົ່ງຄຳຂໍຫຼາຍເກີນໄປ. ກະລຸນາລໍຖ້າບໍ່ເທົ່າໃດນາທີ ແລ້ວລອງໃໝ່' });
    }
    next();
  };
}

/** CSV cell with spreadsheet formula-injection protection. */
function csvCell(v) {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function toCsv(header, rows) {
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

module.exports = {
  sha256, newReference, accessCodeFor, randomAccessCode, hashAccessCode, normalizeCode, safeEqualHex,
  hashPassword, verifyPassword, checkPasswordStrength, sniffImage, rateLimiter, csvCell, toCsv,
};

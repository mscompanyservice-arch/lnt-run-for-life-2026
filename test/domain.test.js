'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeFee, ageOn, normalizePhone } = require('../src/domain');
const { csvCell, toCsv, sniffImage, accessCodeFor, hashAccessCode } = require('../src/security');

const FAMILY = { base_fee: 880000, base_members: 3, extra_fee: 299000 };

test('family fee formula: 880000 + max(0, n-3) * 299000', () => {
  const expected = { 3: 880000, 4: 1179000, 5: 1478000, 6: 1777000, 10: 2973000 };
  for (const [n, total] of Object.entries(expected)) assert.equal(computeFee(FAMILY, Number(n)).total, total, `${n} members`);
});

test('individual fees', () => {
  assert.equal(computeFee({ base_fee: 380000, base_members: 1, extra_fee: 0 }, 1).total, 380000);
  assert.equal(computeFee({ base_fee: 330000, base_members: 1, extra_fee: 0 }, 1).total, 330000);
});

test('age is calculated on event date; 45/48-year boundaries', () => {
  assert.equal(ageOn('1978-12-26', '2026-12-26'), 48);
  assert.equal(ageOn('1978-12-27', '2026-12-26'), 47);
  assert.equal(ageOn('1980-02-29', '2026-12-26'), 46);
  assert.equal(ageOn('2026-02-30', '2026-12-26'), null);
});

test('Lao phone normalization', () => {
  assert.equal(normalizePhone('020 5555 1234'), '2055551234');
  assert.equal(normalizePhone('+856 20 5555 1234'), '2055551234');
  assert.equal(normalizePhone('85620 5555 1234'), '2055551234');
  assert.equal(normalizePhone('12'), null);
});

test('CSV formula-injection protection and escaping', () => {
  assert.equal(csvCell('=1+1'), "'=1+1");
  assert.equal(csvCell('+85620'), "'+85620");
  assert.equal(csvCell('-5'), "'-5");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell(380000), '380000');
  const out = toCsv(['ຊື່'], [['ສົມ']]);
  assert.ok(out.startsWith('﻿'), 'UTF-8 BOM for Excel');
  assert.ok(out.includes('\r\n'));
});

test('image sniffing uses file bytes', () => {
  assert.equal(sniffImage(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(10)])), 'image/png');
  assert.equal(sniffImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(10)])), 'image/jpeg');
  assert.equal(sniffImage(Buffer.from('<html><script>alert(1)</script></html>')), null);
});

test('access codes are deterministic per key, distinct across keys', () => {
  const a = accessCodeFor('s'.repeat(40), 'key-1-aaaaaaaaaaaa');
  assert.match(a, /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  assert.equal(a, accessCodeFor('s'.repeat(40), 'key-1-aaaaaaaaaaaa'));
  assert.notEqual(a, accessCodeFor('s'.repeat(40), 'key-2-aaaaaaaaaaaa'));
  assert.equal(hashAccessCode(a), hashAccessCode(a.toLowerCase().replace(/-/g, ' ')));
});

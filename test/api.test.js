'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helpers');

let env; let base; let pool;
const post = (path, body) => H.req(base, 'POST', '/api/public' + path, { body });
const my = (ref, code) => H.req(base, 'GET', '/api/public/my', { headers: { 'X-Reg-Ref': ref, 'X-Reg-Code': code } });
const upload = (ref, code, buf, type = 'image/png') => H.req(base, 'POST', '/api/public/my/proof', { raw: buf, headers: { 'X-Reg-Ref': ref, 'X-Reg-Code': code, 'Content-Type': type } });
async function register(body) {
  const r = await post('/registrations', body);
  assert.ok([200, 201].includes(r.status), `register failed: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
}
async function setSettings(cookie, body) {
  const r = await H.adm(base, cookie)('PUT', '/settings', body);
  assert.equal(r.status, 200, JSON.stringify(r.data));
}

test.before(async () => { env = await H.setup(); base = env.base; pool = env.pool; });
test.after(async () => { await env.close(); });

test('general male and female entries cost 380,000 and are 10 KM', async () => {
  for (const gender of ['male', 'female']) {
    const r = await register(H.individual('general', { gender }));
    assert.equal(r.registration.fee.total, 380000);
    assert.equal(r.registration.distanceKm, 10);
    assert.equal(r.registration.participants[0].gender, gender);
    assert.equal(r.registration.paymentStatus, 'unpaid');
  }
});

test('Masters (senior) entries cost 330,000 at 5 KM; exact 40-year boundary', async () => {
  const ok = await register(H.individual('senior', { dob: '1986-12-26' }));
  assert.equal(ok.registration.fee.total, 330000);
  assert.equal(ok.registration.distanceKm, 5);
  const no = await post('/registrations', H.individual('senior', { dob: '1986-12-27' }));
  assert.equal(no.status, 400);
  assert.equal(no.data.error, 'VALIDATION');
  assert.ok(no.data.fields['members.0.dob'].includes('40'));
  assert.ok(no.data.fields['members.0.dob'].includes('Masters'));
});

test('General 10 KM needs age 15 on event day; config exposes prize age groups', async () => {
  assert.ok(await register(H.individual('general', { dob: '2011-12-26' })));
  const no = await post('/registrations', H.individual('general', { dob: '2011-12-27' }));
  assert.equal(no.status, 400);
  assert.ok(no.data.fields['members.0.dob'].includes('15'));
  const cfg = (await H.req(base, 'GET', '/api/public/config')).data;
  assert.deepEqual(cfg.categories.find((c) => c.code === 'general').ageGroups, ['15–34 ປີ', '35 ປີຂຶ້ນໄປ']);
});

test('family totals for 3, 4, 5, 6 and 10 members; each member stored separately', async () => {
  const expected = { 3: 880000, 4: 1179000, 5: 1478000, 6: 1777000, 10: 2973000 };
  for (const [n, total] of Object.entries(expected)) {
    const r = await register(H.family(Number(n)));
    assert.equal(r.registration.fee.total, total, `${n} members`);
    assert.equal(r.registration.distanceKm, 5);
    assert.equal(r.registration.participants.length, Number(n));
    const rows = await pool.query('SELECT count(*)::int n FROM participants p JOIN registrations r ON r.id=p.registration_id WHERE r.reference=$1', [r.reference]);
    assert.equal(rows.rows[0].n, Number(n));
  }
});

test('family with fewer than 3 members is rejected', async () => {
  const r = await post('/registrations', H.family(2));
  assert.equal(r.status, 400);
  assert.equal(r.data.error, 'TOO_FEW_MEMBERS');
});

test('server rejects tampered fee and category/distance mismatch', async () => {
  const t = await post('/registrations', H.individual('general', { clientTotal: 1000 }));
  assert.equal(t.status, 400); assert.equal(t.data.error, 'PRICE_MISMATCH');
  const d1 = await post('/registrations', H.individual('general', { distanceKm: 5 }));
  assert.equal(d1.data.error, 'DISTANCE_MISMATCH');
  const d2 = await post('/registrations', H.individual('senior', { dob: '1950-01-01', distanceKm: 10 }));
  assert.equal(d2.data.error, 'DISTANCE_MISMATCH');
  const d3 = await post('/registrations', H.family(3, { distanceKm: 10 }));
  assert.equal(d3.data.error, 'DISTANCE_MISMATCH');
  // Extra unknown "total" fields are ignored; the DB constraint also forbids wrong distances.
  await assert.rejects(pool.query(`UPDATE registrations SET distance_km=5 WHERE category_code='general'`), /check constraint/);
});

test('idempotency: retries and parallel double-clicks create one registration', async () => {
  const body = H.individual('general');
  const a = await register(body);
  const b = await register(body);
  assert.equal(b.replay, true);
  assert.equal(a.reference, b.reference);
  assert.equal(a.accessCode, b.accessCode);
  const body2 = H.family(4);
  const results = await Promise.all(Array.from({ length: 6 }, () => post('/registrations', body2)));
  assert.ok(results.every((r) => [200, 201].includes(r.status)));
  assert.equal(new Set(results.map((r) => r.data.reference)).size, 1);
  const n = await pool.query('SELECT count(*)::int n FROM registrations WHERE idempotency_key=$1', [body2.idempotencyKey]);
  assert.equal(n.rows[0].n, 1);
  const conflict = await post('/registrations', { ...body, contactName: 'Someone Else' });
  assert.equal(conflict.status, 409); assert.equal(conflict.data.error, 'IDEMPOTENCY_CONFLICT');
});

test('possible duplicate warns but can be confirmed; shared family phone is not blocked', async () => {
  const first = H.individual('general', { contactName: 'Somchai Dup', dob: '1991-03-03' });
  await register(first);
  const again = H.individual('general', { contactName: 'somchai  dup', dob: '1991-03-03' });
  const w = await post('/registrations', again);
  assert.equal(w.status, 409); assert.equal(w.data.error, 'POSSIBLE_DUPLICATE');
  const ok = await post('/registrations', { ...again, acknowledgeDuplicate: true });
  assert.equal(ok.status, 201);
  // Two families sharing one contact number: no warning.
  await register(H.family(3, { contactPhone: '020 9999 0000' }));
  await register(H.family(3, { contactPhone: '020 9999 0000' }));
});

test('proof upload: size/type validation, failed-upload recovery, then awaiting review', async () => {
  const r = await register(H.individual('general'));
  const big = Buffer.concat([H.PNG, Buffer.alloc(5 * 1024 * 1024)]);
  const tooBig = await upload(r.reference, r.accessCode, big);
  assert.equal(tooBig.status, 413);
  const fake = await upload(r.reference, r.accessCode, Buffer.from('<svg onload=alert(1)>'.padEnd(100, ' ')), 'image/png');
  assert.equal(fake.status, 415);
  const empty = await upload(r.reference, r.accessCode, Buffer.alloc(0));
  assert.equal(empty.status, 400);
  // After failures the registration is unchanged and a retry works.
  assert.equal((await my(r.reference, r.accessCode)).data.registration.paymentStatus, 'unpaid');
  for (const [buf, type] of [[H.JPG, 'image/jpeg'], [H.WEBP, 'image/webp'], [H.PNG, 'image/png']]) {
    const ok = await upload(r.reference, r.accessCode, buf, type);
    assert.equal(ok.status, 201);
    assert.equal(ok.data.registration.paymentStatus, 'awaiting_review');
  }
  const proofs = await pool.query(`SELECT review_status FROM payment_proofs p JOIN registrations r ON r.id=p.registration_id WHERE r.reference=$1 ORDER BY p.id`, [r.reference]);
  assert.deepEqual(proofs.rows.map((x) => x.review_status), ['superseded', 'superseded', 'pending']);
});

test('anonymous users cannot read participant lists, admin data, exports or proofs', async () => {
  for (const p of ['/api/admin/registrations', '/api/admin/dashboard', '/api/admin/export/participants.csv', '/api/admin/export/payments.csv',
    '/api/admin/proofs/1', '/api/admin/settings', '/api/admin/staff', '/api/admin/audit', '/api/admin/reports']) {
    const r = await H.req(base, 'GET', p);
    assert.equal(r.status, 401, p);
  }
  assert.equal((await H.req(base, 'GET', '/api/public/registrations')).status, 404);
  const cfg = await H.req(base, 'GET', '/api/public/config');
  assert.ok(!JSON.stringify(cfg.data).includes('020 5555 1234'), 'config does not leak participant data');
});

test('one participant cannot access another registration; phone alone is not identity', async () => {
  const a = await register(H.individual('general'));
  const b = await register(H.individual('general'));
  assert.equal((await my(a.reference, a.accessCode)).status, 200);
  assert.equal((await my(b.reference, a.accessCode)).status, 404);
  assert.equal((await my(b.reference, '')).status, 404);
  assert.equal((await my(b.reference, '020 5555 1234')).status, 404);
  assert.equal((await upload(b.reference, a.accessCode, H.PNG)).status, 404);
});

test('payment confirmation requires accountant/owner; participants cannot mark paid', async () => {
  const r = await register(H.family(5));
  await upload(r.reference, r.accessCode, H.PNG);
  const id = (await pool.query('SELECT id FROM registrations WHERE reference=$1', [r.reference])).rows[0].id;
  assert.equal((await H.req(base, 'POST', `/api/admin/registrations/${id}/payment`, { body: { action: 'confirm' }, headers: { 'X-Requested-With': 'lnt-admin' } })).status, 401);
  const staff = H.adm(base, await H.login(base, 'staff1'));
  assert.equal((await staff('POST', `/registrations/${id}/payment`, { action: 'confirm' })).status, 403);
  assert.equal((await staff('GET', `/proofs/1`)).status, 403);
  const acctCookie = await H.login(base, 'acct1');
  // CSRF: missing custom header is refused even with a valid session.
  const csrf = await H.req(base, 'POST', `/api/admin/registrations/${id}/payment`, { body: { action: 'confirm' }, cookie: acctCookie });
  assert.equal(csrf.status, 403);
  assert.equal((await H.req(base, 'POST', '/api/public/my/payment', { body: { status: 'confirmed' } })).status, 404);
  const acct = H.adm(base, acctCookie);
  const ok = await acct('POST', `/registrations/${id}/payment`, { action: 'confirm', note: 'BCEL ref 123' });
  assert.equal(ok.status, 200); assert.equal(ok.data.paymentStatus, 'confirmed');
  const twice = await acct('POST', `/registrations/${id}/payment`, { action: 'confirm' });
  assert.equal(twice.status, 409);
  const view = await my(r.reference, r.accessCode);
  assert.equal(view.data.registration.paymentStatus, 'confirmed');
  assert.equal(view.data.registration.canUploadProof, false);
  assert.equal((await upload(r.reference, r.accessCode, H.PNG)).status, 409);
});

test('reject proof shows reason to participant, who can re-upload', async () => {
  const r = await register(H.individual('general'));
  await upload(r.reference, r.accessCode, H.PNG);
  const id = (await pool.query('SELECT id FROM registrations WHERE reference=$1', [r.reference])).rows[0].id;
  const acct = H.adm(base, await H.login(base, 'acct1'));
  assert.equal((await acct('POST', `/registrations/${id}/payment`, { action: 'reject' })).status, 400, 'note required');
  assert.equal((await acct('POST', `/registrations/${id}/payment`, { action: 'reject', note: 'ຍອດບໍ່ຄົບ' })).status, 200);
  const v = await my(r.reference, r.accessCode);
  assert.equal(v.data.registration.paymentStatus, 'rejected');
  assert.equal(v.data.registration.paymentNote, 'ຍອດບໍ່ຄົບ');
  assert.equal((await upload(r.reference, r.accessCode, H.PNG)).data.registration.paymentStatus, 'awaiting_review');
});

test('BIB: unique per runner incl. family members, duplicates and concurrent races rejected', async () => {
  const fam = await register(H.family(5));
  const regId = (await pool.query('SELECT id FROM registrations WHERE reference=$1', [fam.reference])).rows[0].id;
  const pids = (await pool.query('SELECT id FROM participants WHERE registration_id=$1 ORDER BY position', [regId])).rows.map((x) => x.id);
  const staff = H.adm(base, await H.login(base, 'staff1'));
  const auto = await Promise.all(pids.map((pid) => staff('POST', `/participants/${pid}/bib`, { auto: true })));
  assert.ok(auto.every((x) => x.status === 200));
  const bibs = auto.map((x) => x.data.bib);
  assert.equal(new Set(bibs).size, 5, 'each family member has own BIB');
  assert.ok(bibs.every((b) => Number(b) >= 5001));
  const dup = await staff('POST', `/participants/${pids[0]}/bib`, { bib: bibs[1] });
  assert.equal(dup.status, 409); assert.equal(dup.data.error, 'BIB_TAKEN');
  // Two different runners racing for the same manual BIB: exactly one wins.
  const a = await register(H.individual('general')); const b = await register(H.individual('general'));
  const pa = (await pool.query('SELECT p.id FROM participants p JOIN registrations r ON r.id=p.registration_id WHERE r.reference=$1', [a.reference])).rows[0].id;
  const pb = (await pool.query('SELECT p.id FROM participants p JOIN registrations r ON r.id=p.registration_id WHERE r.reference=$1', [b.reference])).rows[0].id;
  const race = await Promise.all([staff('POST', `/participants/${pa}/bib`, { bib: 'X777' }), staff('POST', `/participants/${pb}/bib`, { bib: 'x777' })]);
  assert.deepEqual(race.map((x) => x.status).sort(), [200, 409]);
  const acct = H.adm(base, await H.login(base, 'acct1'));
  assert.equal((await acct('POST', `/participants/${pa}/bib`, { bib: 'Y1' })).status, 403, 'accountant cannot assign BIB');
});

test('per-member kit collection and check-in, partial within a family', async () => {
  const fam = await register(H.family(4));
  const regId = (await pool.query('SELECT id FROM registrations WHERE reference=$1', [fam.reference])).rows[0].id;
  const pids = (await pool.query('SELECT id FROM participants WHERE registration_id=$1 ORDER BY position', [regId])).rows.map((x) => x.id);
  const staff = H.adm(base, await H.login(base, 'staff1'));
  assert.equal((await staff('POST', `/participants/${pids[0]}/kit`, { value: true })).status, 200);
  assert.equal((await staff('POST', `/participants/${pids[1]}/kit`, { value: true })).status, 200);
  assert.equal((await staff('POST', `/participants/${pids[0]}/checkin`, { value: true })).status, 200);
  const v = (await my(fam.reference, fam.accessCode)).data.registration.participants;
  assert.deepEqual(v.map((p) => p.kitCollected), [true, true, false, false]);
  assert.deepEqual(v.map((p) => p.checkedIn), [true, false, false, false]);
  await staff('POST', `/participants/${pids[1]}/kit`, { value: false });
  assert.equal((await my(fam.reference, fam.accessCode)).data.registration.participants[1].kitCollected, false);
});

test('repricing protection and explicit recalculation', async () => {
  const owner = H.adm(base, await H.login(base, 'owner1'));
  const fam = await register(H.family(3));
  const id = (await pool.query('SELECT id FROM registrations WHERE reference=$1', [fam.reference])).rows[0].id;
  const m = { fullName: 'New Kid', gender: 'female', dob: '2015-01-01', shirtSize: 'S' };
  const noFlag = await owner('POST', `/registrations/${id}/members`, { member: m });
  assert.equal(noFlag.data.error, 'RECALC_REQUIRED');
  assert.equal((await owner('POST', `/registrations/${id}/members`, { member: m, recalculate: true, reason: 'added at desk' })).status, 200);
  assert.equal((await my(fam.reference, fam.accessCode)).data.registration.fee.total, 1179000);
  // Price change applies to new registrations only.
  assert.equal((await owner('PUT', '/categories/family', { baseFee: 900000 })).status, 200);
  assert.equal((await my(fam.reference, fam.accessCode)).data.registration.fee.total, 1179000);
  assert.equal((await register(H.family(3))).registration.fee.total, 900000);
  assert.equal((await owner('POST', `/registrations/${id}/recalculate`, { reason: 'apply new price' })).status, 200);
  assert.equal((await my(fam.reference, fam.accessCode)).data.registration.fee.total, 900000 + 299000);
  await owner('PUT', '/categories/family', { baseFee: 880000 });
  // Once paid, price changes are blocked.
  await owner('POST', `/registrations/${id}/payment`, { action: 'confirm', note: 'cash' });
  const locked = await owner('POST', `/registrations/${id}/members`, { member: m, recalculate: true, reason: 'x' });
  assert.equal(locked.data.error, 'PRICE_LOCKED');
  const pid = (await pool.query('SELECT id FROM participants WHERE registration_id=$1 LIMIT 1', [id])).rows[0].id;
  assert.equal((await owner('DELETE', `/participants/${pid}`, { recalculate: true, reason: 'x' })).data.error, 'PRICE_LOCKED');
  assert.equal((await owner('POST', `/registrations/${id}/recalculate`, { reason: 'x' })).data.error, 'PRICE_LOCKED');
  // Removing below 3 members is refused.
  const fam3 = await register(H.family(3));
  const id3 = (await pool.query('SELECT id FROM registrations WHERE reference=$1', [fam3.reference])).rows[0].id;
  const p3 = (await pool.query('SELECT id FROM participants WHERE registration_id=$1 LIMIT 1', [id3])).rows[0].id;
  assert.equal((await owner('DELETE', `/participants/${p3}`, { recalculate: true, reason: 'x' })).data.error, 'TOO_FEW_MEMBERS');
  // Category change general -> senior respects age.
  const g = await register(H.individual('general', { dob: '2000-01-01' }));
  const gid = (await pool.query('SELECT id FROM registrations WHERE reference=$1', [g.reference])).rows[0].id;
  assert.equal((await owner('POST', `/registrations/${gid}/category`, { category: 'senior', recalculate: true, reason: 'x' })).data.error, 'AGE');
});

test('cancellation keeps financial history; paid cancellations need owner', async () => {
  const r = await register(H.individual('general'));
  const id = (await pool.query('SELECT id FROM registrations WHERE reference=$1', [r.reference])).rows[0].id;
  const owner = H.adm(base, await H.login(base, 'owner1'));
  const staff = H.adm(base, await H.login(base, 'staff1'));
  await owner('POST', `/registrations/${id}/payment`, { action: 'confirm', note: 'cash at desk' });
  assert.equal((await staff('POST', `/registrations/${id}/cancel`, { reason: 'requested' })).status, 403);
  assert.equal((await owner('POST', `/registrations/${id}/cancel`, { reason: 'requested' })).status, 200);
  const row = (await pool.query('SELECT status, payment_status, confirmed_amount FROM registrations WHERE id=$1', [id])).rows[0];
  assert.deepEqual(row, { status: 'cancelled', payment_status: 'confirmed', confirmed_amount: 380000 });
  const ev = (await pool.query('SELECT count(*)::int n FROM payment_events WHERE registration_id=$1', [id])).rows[0].n;
  assert.ok(ev >= 1);
  assert.equal((await my(r.reference, r.accessCode)).data.registration.status, 'cancelled');
});

test('dashboard counts participants per person and team revenue once; CSV exports', async () => {
  await pool.query('TRUNCATE payment_events, payment_proofs, participants, registrations RESTART IDENTITY CASCADE');
  const owner = H.adm(base, await H.login(base, 'owner1'));
  const fam = await register(H.family(5));
  await register(H.individual('general', { contactName: '=HYPERLINK("http://x")' }));
  const id = (await pool.query('SELECT id FROM registrations WHERE reference=$1', [fam.reference])).rows[0].id;
  await owner('POST', `/registrations/${id}/payment`, { action: 'confirm', note: 'transfer' });
  const d = (await owner('GET', '/dashboard')).data;
  assert.equal(d.registrations, 2);
  assert.equal(d.participants, 6);
  assert.equal(d.family_teams, 1);
  assert.equal(d.confirmed_revenue, 1478000);
  assert.equal(d.outstanding, 380000);
  const staffDash = (await H.adm(base, await H.login(base, 'staff1'))('GET', '/dashboard')).data;
  assert.equal(staffDash.confirmed_revenue, undefined, 'staff cannot see revenue');
  const pcsv = (await owner('GET', '/export/participants.csv')).data;
  const plines = pcsv.trim().split('\r\n');
  assert.equal(plines.length, 1 + 6, 'one row per participant');
  const rawBytes = Buffer.from(await (await fetch(base + '/api/admin/export/participants.csv', { headers: { Cookie: await H.login(base, 'owner1') } })).arrayBuffer());
  assert.deepEqual([...rawBytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'UTF-8 BOM so Excel shows Lao correctly');
  assert.ok(pcsv.includes(`"'=HYPERLINK(""http://x"")"`), 'formula neutralised');
  assert.ok(plines.filter((l) => l.includes(fam.reference)).length === 5, 'family members linked by reference');
  const paycsv = (await owner('GET', '/export/payments.csv')).data;
  const paylines = paycsv.trim().split('\r\n');
  assert.equal(paylines.length, 1 + 2, 'one row per registration');
  assert.equal(paylines.filter((l) => l.includes(fam.reference)).length, 1, 'family payment not duplicated');
  const staff = H.adm(base, await H.login(base, 'staff1'));
  assert.equal((await staff('GET', '/export/payments.csv')).status, 403);
  assert.equal((await staff('GET', '/export/participants.csv')).status, 200);
  const rep = (await owner('GET', '/reports')).data;
  assert.equal(rep.shirts.reduce((a, x) => a + x.n, 0), 6);
  assert.equal(rep.revenue.reduce((a, x) => a + x.confirmed, 0), 1478000);
  assert.equal(rep.unpaid.length, 1);
});

test('search by reference, team, phone, name and BIB; filters', async () => {
  const owner = H.adm(base, await H.login(base, 'owner1'));
  const fam = await register(H.family(3, { teamName: 'Namtha Eagles', contactPhone: '020 4444 1212' }));
  const id = (await pool.query('SELECT id FROM registrations WHERE reference=$1', [fam.reference])).rows[0].id;
  const pid = (await pool.query('SELECT id FROM participants WHERE registration_id=$1 LIMIT 1', [id])).rows[0].id;
  await owner('POST', `/participants/${pid}/bib`, { bib: 'F-42' });
  for (const q of [fam.reference, 'eagles', '2044441212', '020 4444 1212', 'F-42', fam.registration.participants[1].fullName]) {
    const r = await owner('GET', `/registrations?q=${encodeURIComponent(q)}`);
    assert.ok(r.data.rows.some((x) => x.id === id), `search ${q}`);
  }
  const f = await owner('GET', '/registrations?category=family&distance=5&payment=unpaid&gender=female');
  assert.ok(f.data.rows.every((x) => x.category_code === 'family'));
  assert.equal((await owner('GET', '/registrations?distance=10&category=family')).data.total, 0);
});

test('registration open/close, deadline and capacity (counts participants)', async () => {
  const owner = H.adm(base, await H.login(base, 'owner1'));
  const ownerCookie = await H.login(base, 'owner1');
  await setSettings(ownerCookie, { registrationOpen: false });
  let r = await post('/registrations', H.individual('general'));
  assert.equal(r.status, 409); assert.equal(r.data.error, 'REGISTRATION_CLOSED');
  await setSettings(ownerCookie, { registrationOpen: true, registrationDeadline: '2020-01-01T00:00' });
  r = await post('/registrations', H.individual('general'));
  assert.equal(r.data.error, 'REGISTRATION_CLOSED');
  assert.equal((await H.req(base, 'GET', '/api/public/config')).data.registration.open, false);
  await setSettings(ownerCookie, { registrationDeadline: '2026-12-25T23:59' });
  const used = (await owner('GET', '/dashboard')).data.participants;
  await setSettings(ownerCookie, { capacity: used + 2 });
  r = await post('/registrations', H.family(3));
  assert.equal(r.data.error, 'CAPACITY');
  await register(H.individual('general'));
  await register(H.individual('general'));
  r = await post('/registrations', H.individual('general'));
  assert.equal(r.data.error, 'REGISTRATION_CLOSED');
  assert.equal((await H.req(base, 'GET', '/api/public/config')).data.registration.reason, 'ບ່ອນວ່າງເຕັມແລ້ວ');
  await setSettings(ownerCookie, { capacity: null, registrationDeadline: null });
});

test('settings: owner only; unconfigured bank details are reported as such', async () => {
  const cfg = (await H.req(base, 'GET', '/api/public/config')).data;
  assert.equal(cfg.payment.configured, false);
  assert.equal(cfg.payment.accountNumber, null);
  const acct = H.adm(base, await H.login(base, 'acct1'));
  assert.equal((await acct('PUT', '/settings', { bankName: 'X' })).status, 403);
  assert.equal((await acct('POST', '/staff', { username: 'zz', role: 'owner' })).status, 403);
  const owner = H.adm(base, await H.login(base, 'owner1'));
  assert.equal((await owner('PUT', '/settings', { bankName: 'Test Bank', bankAccountName: 'Test', bankAccountNumber: '000' })).status, 200);
  assert.equal((await H.req(base, 'GET', '/api/public/config')).data.payment.configured, true);
  await owner('PUT', '/settings', { bankName: null, bankAccountName: null, bankAccountNumber: null });
  // Asset upload validates content.
  const bad = await H.req(base, 'POST', '/api/admin/assets?kind=payment_qr', { raw: Buffer.from('not an image at all, really'), cookie: await H.login(base, 'owner1'), headers: { 'X-Requested-With': 'lnt-admin', 'Content-Type': 'image/png' } });
  assert.equal(bad.status, 415);
});

test('staff management: no self-lockout, deactivated staff lose access', async () => {
  const owner = H.adm(base, await H.login(base, 'owner1'));
  const me = (await owner('GET', '/me')).data.staff;
  assert.equal((await owner('PATCH', `/staff/${me.id}`, { active: false })).status, 400);
  assert.equal((await owner('POST', '/staff', { username: 'temp1', displayName: 'Temp', role: 'staff', password: 'short' })).status, 400);
  const c = await owner('POST', '/staff', { username: 'temp1', displayName: 'Temp', role: 'staff', password: 'long-enough-pw' });
  assert.equal(c.status, 201);
  const tempCookie = await (async () => {
    const res = await fetch(base + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'lnt-admin' }, body: JSON.stringify({ username: 'temp1', password: 'long-enough-pw' }) });
    return res.headers.get('set-cookie').split(';')[0];
  })();
  assert.equal((await H.adm(base, tempCookie)('GET', '/dashboard')).status, 200);
  await owner('PATCH', `/staff/${c.data.id}`, { active: false });
  assert.equal((await H.adm(base, tempCookie)('GET', '/dashboard')).status, 401);
  const audit = (await owner('GET', '/audit')).data.rows;
  assert.ok(audit.some((a) => a.action === 'staff.update'));
  assert.ok(!JSON.stringify(audit).includes('scrypt$'), 'no password hashes in audit');
});

test('one-time owner setup works only with code and only once', async () => {
  const sec = require('../src/security');
  await pool.query(`INSERT INTO setup_code (id, code_hash) VALUES (1, $1)`, [sec.sha256('setup:ABC123DEF456')]);
  // Owners already exist in tests -> not needed / refused.
  assert.equal((await H.req(base, 'GET', '/api/admin/setup-status')).data.needed, false);
  const hdr = { 'X-Requested-With': 'lnt-admin' };
  const body = { code: 'ABC123DEF456', username: 'newowner', password: 'a-strong-password' };
  assert.equal((await H.req(base, 'POST', '/api/admin/setup', { body, headers: hdr })).status, 409);
  await pool.query(`UPDATE staff SET role='staff' WHERE role='owner'`);
  assert.equal((await H.req(base, 'GET', '/api/admin/setup-status')).data.needed, true);
  assert.equal((await H.req(base, 'POST', '/api/admin/setup', { body: { ...body, code: 'WRONG' }, headers: hdr })).status, 403);
  assert.equal((await H.req(base, 'POST', '/api/admin/setup', { body, headers: hdr })).status, 201);
  assert.equal((await H.req(base, 'POST', '/api/admin/setup', { body: { ...body, username: 'second' }, headers: hdr })).status, 409);
  await pool.query(`UPDATE staff SET role='owner' WHERE username='owner1'`);
});

test('access code reset invalidates the old code', async () => {
  const r = await register(H.individual('general'));
  const id = (await pool.query('SELECT id FROM registrations WHERE reference=$1', [r.reference])).rows[0].id;
  const staff = H.adm(base, await H.login(base, 'staff1'));
  const nc = await staff('POST', `/registrations/${id}/access-code`);
  assert.equal(nc.status, 200);
  assert.equal((await my(r.reference, r.accessCode)).status, 404);
  assert.equal((await my(r.reference, nc.data.accessCode)).status, 200);
});

test('rate limiting on login and lookups', async () => {
  process.env.DISABLE_RATE_LIMIT = 'false';
  try {
    let last;
    for (let i = 0; i < 12; i++) {
      last = await H.req(base, 'POST', '/api/admin/login', { body: { username: 'owner1', password: 'wrong' }, headers: { 'X-Requested-With': 'lnt-admin' } });
    }
    assert.equal(last.status, 429);
  } finally { process.env.DISABLE_RATE_LIMIT = 'true'; }
});

test('pages and Lao font are publicly reachable without any login', async () => {
  for (const p of ['/', '/register', '/status', '/admin', '/static/style.css', '/static/register.js', '/fonts/noto-sans-lao-lao-400-normal.woff2', '/healthz']) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200, p);
  }
  const home = await (await fetch(base + '/')).text();
  assert.ok(home.includes('ລົງທະບຽນ'));
  const h = (await fetch(base + '/')).headers;
  assert.ok(h.get('content-security-policy').includes("script-src 'self'"));
});

test('logs never contain access codes, session tokens or proof bytes', async () => {
  const r = await register(H.individual('general'));
  await my(r.reference, r.accessCode);
  const joined = env.logs.join('\n');
  assert.ok(!joined.includes(r.accessCode));
  assert.ok(!/lnt_admin=/.test(joined));
  assert.ok(!joined.includes('X-Reg-Code'));
  assert.ok(joined.includes('POST /api/public/registrations'), 'access log present');
});

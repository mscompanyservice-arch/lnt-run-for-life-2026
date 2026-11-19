'use strict';
const express = require('express');
const crypto = require('crypto');
const { AppError, bad, cleanText, normalizePhone, parseDate, ageOn, ageGroup, computeFee, GENDERS, CATEGORY_DISTANCE } = require('./domain');
const sec = require('./security');
const sh = require('./shared');
const { tx } = require('./db');

const COOKIE = 'lnt_admin';
const SESSION_HOURS = 12;

// Role → permissions. Checked server-side on every admin endpoint.
const PERMS = {
  'reg.read': ['owner', 'accountant', 'staff'],
  'reg.edit': ['owner', 'staff'],
  'reg.cancel': ['owner', 'staff'],
  'pay.read': ['owner', 'accountant'],
  'pay.review': ['owner', 'accountant'],
  'pay.reopen': ['owner'],
  'race.ops': ['owner', 'staff'], // BIB, kit collection, check-in
  'export.participants': ['owner', 'staff', 'accountant'],
  'export.payments': ['owner', 'accountant'],
  'reports.finance': ['owner', 'accountant'],
  'reports.ops': ['owner', 'staff', 'accountant'],
  settings: ['owner'],
  'staff.manage': ['owner'],
  'audit.read': ['owner'],
};
const can = (staff, perm) => !!staff && PERMS[perm].includes(staff.role);

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const PRICE_LOCKED = new Set(['confirmed', 'awaiting_review']);

module.exports = function adminApi({ pool, config }) {
  const r = express.Router();
  const json = express.json({ limit: '64kb' });
  const limitLogin = sec.rateLimiter({ name: 'login', windowMs: 15 * 60 * 1000, max: 10 });

  function setSessionCookie(res, token, maxAgeSec) {
    const parts = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAgeSec}`];
    if (config.cookieSecure) parts.push('Secure');
    res.set('Set-Cookie', parts.join('; '));
  }

  // CSRF defence: state-changing requests must carry a custom header (forces CORS preflight; no CORS is enabled).
  r.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method) && req.get('X-Requested-With') !== 'lnt-admin') {
      return next(new AppError(403, 'CSRF', 'ຄຳຂໍຖືກປະຕິເສດ'));
    }
    next();
  });

  async function loadStaff(req) {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (!token || token.length > 100) return null;
    const q = await pool.query(
      `SELECT s.id, s.username, s.display_name, s.role FROM sessions x JOIN staff s ON s.id=x.staff_id
        WHERE x.token_hash=$1 AND x.expires_at > now() AND s.active`, [sec.sha256(token)]);
    return q.rows[0] || null;
  }
  const need = (perm) => async (req, res, next) => {
    const staff = await loadStaff(req);
    if (!staff) return next(new AppError(401, 'UNAUTHENTICATED', 'ກະລຸນາເຂົ້າສູ່ລະບົບ'));
    if (perm && !can(staff, perm)) return next(new AppError(403, 'FORBIDDEN', 'ທ່ານບໍ່ມີສິດເຮັດລາຍການນີ້'));
    req.staff = staff;
    next();
  };
  const idParam = (v) => {
    const n = Number(v);
    if (!Number.isSafeInteger(n) || n <= 0) throw new AppError(404, 'NOT_FOUND', 'ບໍ່ພົບຂໍ້ມູນ');
    return n;
  };

  // ---------- auth ----------
  r.post('/login', limitLogin, json, async (req, res) => {
    const { username, password } = req.body || {};
    const fail = new AppError(401, 'BAD_LOGIN', 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    if (typeof username !== 'string' || typeof password !== 'string' || password.length > 200) throw fail;
    const q = await pool.query('SELECT * FROM staff WHERE lower(username)=lower($1) AND active', [username.trim()]);
    // Run a hash even when the user doesn't exist to reduce timing differences.
    const ok = q.rowCount ? sec.verifyPassword(password, q.rows[0].password_hash) : (sec.verifyPassword(password, sec.hashPassword('x'.repeat(12))), false);
    if (!ok) throw fail;
    const s = q.rows[0];
    const token = crypto.randomBytes(32).toString('base64url');
    await pool.query(`INSERT INTO sessions (token_hash, staff_id, expires_at) VALUES ($1,$2, now() + interval '${SESSION_HOURS} hours')`, [sec.sha256(token), s.id]);
    await pool.query('UPDATE staff SET last_login_at=now() WHERE id=$1', [s.id]);
    await pool.query('DELETE FROM sessions WHERE expires_at < now()');
    setSessionCookie(res, token, SESSION_HOURS * 3600);
    await sh.audit(pool, s.id, 'login', 'staff', s.id);
    res.json({ staff: { id: s.id, username: s.username, displayName: s.display_name, role: s.role } });
  });

  // One-time owner setup: only works while no owner exists, and only with the setup code stored (hashed) in the database.
  r.get('/setup-status', async (req, res) => {
    const owners = (await pool.query(`SELECT count(*)::int n FROM staff WHERE role='owner' AND active`)).rows[0].n;
    const code = (await pool.query('SELECT 1 FROM setup_code WHERE used_at IS NULL')).rowCount;
    res.json({ needed: owners === 0 && code > 0 });
  });
  r.post('/setup', limitLogin, json, async (req, res) => {
    const b = req.body || {};
    const username = String(b.username || '').trim();
    if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) throw bad('VALIDATION', 'ຊື່ຜູ້ໃຊ້: ຕົວອັກສອນອັງກິດ/ຕົວເລກ 3–40 ຕົວ');
    const displayName = cleanText(b.displayName, 80) || username;
    sec.checkPasswordStrength(b.password);
    const id = await tx(pool, async (c) => {
      const row = (await c.query('SELECT code_hash FROM setup_code WHERE used_at IS NULL FOR UPDATE')).rows[0];
      const owners = (await c.query(`SELECT count(*)::int n FROM staff WHERE role='owner'`)).rows[0].n;
      if (!row || owners > 0) throw new AppError(409, 'SETUP_DONE', 'ການຕັ້ງຄ່າຄັ້ງທຳອິດສຳເລັດແລ້ວ. ກະລຸນາເຂົ້າສູ່ລະບົບ');
      if (!sec.safeEqualHex(row.code_hash, sec.sha256('setup:' + String(b.code || '').trim().toUpperCase()))) {
        throw new AppError(403, 'BAD_SETUP_CODE', 'ລະຫັດຕັ້ງຄ່າບໍ່ຖືກຕ້ອງ');
      }
      const s = (await c.query(`INSERT INTO staff (username, display_name, password_hash, role) VALUES ($1,$2,$3,'owner') RETURNING id`,
        [username, displayName, sec.hashPassword(b.password)])).rows[0];
      await c.query('UPDATE setup_code SET used_at=now()');
      await sh.audit(c, s.id, 'staff.create', 'staff', s.id, { username, role: 'owner', via: 'setup' });
      return s.id;
    });
    res.status(201).json({ id });
  });

  r.post('/logout', async (req, res) => {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (token) await pool.query('DELETE FROM sessions WHERE token_hash=$1', [sec.sha256(token)]);
    setSessionCookie(res, '', 0);
    res.json({ ok: true });
  });

  r.get('/me', need(null), (req, res) => {
    const s = req.staff;
    res.json({
      staff: { id: s.id, username: s.username, displayName: s.display_name, role: s.role },
      permissions: Object.keys(PERMS).filter((p) => can(s, p)),
    });
  });

  // ---------- dashboard ----------
  r.get('/dashboard', need('reg.read'), async (req, res) => {
    const settings = await sh.loadSettings(pool);
    const q = await pool.query(`
      SELECT
        count(*) FILTER (WHERE status='active')::int AS registrations,
        count(*) FILTER (WHERE status='active' AND reg_type='family')::int AS family_teams,
        count(*) FILTER (WHERE status='active' AND payment_status='awaiting_review')::int AS awaiting_review,
        count(*) FILTER (WHERE status='active' AND payment_status IN ('unpaid','rejected'))::int AS unpaid,
        coalesce(sum(total_amount) FILTER (WHERE status='active' AND payment_status<>'confirmed'),0)::bigint AS outstanding,
        coalesce(sum(confirmed_amount) FILTER (WHERE payment_status='confirmed'),0)::bigint AS confirmed_revenue,
        count(*) FILTER (WHERE payment_status='confirmed')::int AS confirmed_count,
        count(*) FILTER (WHERE status='cancelled')::int AS cancelled,
        count(*) FILTER (WHERE status='cancelled' AND payment_status='confirmed')::int AS cancelled_paid
      FROM registrations`);
    const p = await pool.query(`
      SELECT count(*)::int AS participants,
             count(*) FILTER (WHERE p.kit_collected_at IS NOT NULL)::int AS kit_collected,
             count(*) FILTER (WHERE p.checked_in_at IS NOT NULL)::int AS checked_in,
             count(*) FILTER (WHERE p.bib IS NOT NULL)::int AS with_bib
        FROM participants p JOIN registrations r ON r.id=p.registration_id WHERE r.status='active'`);
    const byCat = await pool.query(`
      SELECT r.category_code, count(DISTINCT r.id)::int AS registrations, count(p.id)::int AS participants
        FROM registrations r JOIN participants p ON p.registration_id=r.id WHERE r.status='active' GROUP BY 1`);
    const d = { ...q.rows[0], ...p.rows[0], byCategory: byCat.rows };
    if (!can(req.staff, 'reports.finance')) { delete d.confirmed_revenue; delete d.outstanding; }
    d.capacity = settings.capacity || null;
    d.registration = sh.openState(settings, d.participants);
    res.json(d);
  });

  // ---------- registrations ----------
  r.get('/registrations', need('reg.read'), async (req, res) => {
    const where = [];
    const args = [];
    const add = (sql, v) => { args.push(v); where.push(sql.replace(/\?/g, `$${args.length}`)); };
    const q = String(req.query.q || '').trim().slice(0, 100);
    if (q) {
      const like = '%' + q.replace(/[\\%_]/g, (m) => '\\' + m) + '%';
      const phone = normalizePhone(q) || (q.replace(/\D/g, '').length >= 4 ? q.replace(/\D/g, '') : null);
      args.push(like);
      const L = `$${args.length}`;
      let phoneSql = '';
      if (phone) { args.push('%' + phone.replace(/^\+/, '') + '%'); phoneSql = ` OR r.contact_phone_norm LIKE $${args.length}`; }
      args.push(q.toUpperCase());
      const U = `$${args.length}`;
      where.push(`(r.reference ILIKE ${L} OR r.team_name ILIKE ${L} OR r.contact_name ILIKE ${L}${phoneSql}
        OR EXISTS (SELECT 1 FROM participants p WHERE p.registration_id=r.id AND (p.full_name ILIKE ${L} OR upper(p.bib)=${U})))`);
    }
    if (req.query.category) add('r.category_code=?', String(req.query.category));
    if (req.query.payment) add('r.payment_status=?', String(req.query.payment));
    if (req.query.status) add('r.status=?', String(req.query.status));
    if (req.query.distance) add('r.distance_km=?', Number(req.query.distance) || 0);
    if (req.query.gender) add('EXISTS (SELECT 1 FROM participants p WHERE p.registration_id=r.id AND p.gender=?)', String(req.query.gender));
    const page = Math.max(1, Math.min(1000, Number(req.query.page) || 1));
    const sql = `
      SELECT r.id, r.reference, r.reg_type, r.category_code, r.distance_km, r.team_name, r.contact_name, r.contact_phone,
             r.member_count, r.total_amount, r.payment_status, r.status, r.created_at,
             (SELECT string_agg(p.full_name || coalesce(' #' || p.bib, ''), ', ' ORDER BY p.position) FROM participants p WHERE p.registration_id=r.id) AS members,
             count(*) OVER()::int AS total_rows
        FROM registrations r ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY r.created_at DESC LIMIT 50 OFFSET ${(page - 1) * 50}`;
    const rows = (await pool.query(sql, args)).rows;
    res.json({ rows: rows.map(({ total_rows, ...x }) => x), total: rows[0] ? rows[0].total_rows : 0, page });
  });

  r.get('/registrations/:id', need('reg.read'), async (req, res) => {
    const id = idParam(req.params.id);
    const reg = await sh.getRegistrationFull(pool, id);
    if (!reg) throw new AppError(404, 'NOT_FOUND', 'ບໍ່ພົບການລົງທະບຽນ');
    delete reg.access_hash; delete reg.idempotency_key; delete reg.request_fingerprint;
    const settings = await sh.loadSettings(pool);
    reg.participants.forEach((p) => { p.age_on_event = ageOn(p.dob, settings.eventDate); p.age_group = ageGroup(reg.category_code, p.age_on_event); });
    if (!can(req.staff, 'pay.read')) reg.proofs = reg.proofs.map((p) => ({ id: p.id, review_status: p.review_status, uploaded_at: p.uploaded_at }));
    reg.payment_events = (await pool.query(
      `SELECT e.action, e.amount, e.note, e.created_at, s.display_name AS staff FROM payment_events e LEFT JOIN staff s ON s.id=e.staff_id
        WHERE e.registration_id=$1 ORDER BY e.created_at`, [id])).rows;
    reg.audit = (await pool.query(`SELECT a.action, a.details, a.created_at, s.display_name AS staff FROM audit_log a LEFT JOIN staff s ON s.id=a.staff_id
        WHERE a.entity_type='registration' AND a.entity_id=$1 ORDER BY a.created_at DESC LIMIT 100`, [String(id)])).rows;
    res.json({ registration: reg });
  });

  async function lockReg(c, id) {
    const q = await c.query('SELECT * FROM registrations WHERE id=$1 FOR UPDATE', [id]);
    if (!q.rowCount) throw new AppError(404, 'NOT_FOUND', 'ບໍ່ພົບການລົງທະບຽນ');
    return q.rows[0];
  }
  const requireReason = (body) => {
    const reason = cleanText(body && body.reason, 300);
    if (!reason) throw bad('REASON_REQUIRED', 'ກະລຸນາໃສ່ເຫດຜົນ');
    return reason;
  };

  r.patch('/registrations/:id', need('reg.edit'), json, async (req, res) => {
    const id = idParam(req.params.id);
    const b = req.body || {};
    await tx(pool, async (c) => {
      const reg = await lockReg(c, id);
      const changes = {};
      const set = (col, val) => { if (val !== reg[col]) { changes[col] = { from: reg[col], to: val }; } };
      if (b.contactName !== undefined) { const v = cleanText(b.contactName, 120); if (!v) throw bad('VALIDATION', 'ຊື່ຜູ້ຕິດຕໍ່ບໍ່ຖືກຕ້ອງ'); set('contact_name', v); }
      if (b.contactPhone !== undefined) {
        const raw = cleanText(b.contactPhone, 30); const n = normalizePhone(raw || '');
        if (!n) throw bad('VALIDATION', 'ເບີ WhatsApp ບໍ່ຖືກຕ້ອງ');
        set('contact_phone', raw); if (changes.contact_phone) changes.contact_phone_norm = { from: reg.contact_phone_norm, to: n };
      }
      if (b.emergencyName !== undefined) set('emergency_name', cleanText(b.emergencyName, 120) || null);
      if (b.emergencyPhone !== undefined) {
        const raw = cleanText(b.emergencyPhone, 30) || null;
        if (raw && !normalizePhone(raw)) throw bad('VALIDATION', 'ເບີສຸກເສີນບໍ່ຖືກຕ້ອງ');
        set('emergency_phone', raw);
      }
      if (b.teamName !== undefined && reg.reg_type === 'family') { const v = cleanText(b.teamName, 120); if (!v) throw bad('VALIDATION', 'ຊື່ທີມບໍ່ຖືກຕ້ອງ'); set('team_name', v); }
      if (b.note !== undefined) { const v = cleanText(b.note, 500); if (v === null) throw bad('VALIDATION', 'ໝາຍເຫດຍາວເກີນ'); set('note', v || null); }
      const cols = Object.keys(changes);
      if (!cols.length) return;
      await c.query(`UPDATE registrations SET ${cols.map((k, i) => `${k}=$${i + 2}`).join(', ')}, updated_at=now() WHERE id=$1`,
        [id, ...cols.map((k) => changes[k].to)]);
      await sh.audit(c, req.staff.id, 'registration.edit', 'registration', id, { changes });
    });
    res.json({ ok: true });
  });

  async function reprice(c, reg, categoryCode, memberCount, staffId, reason, action) {
    if (reg.status !== 'active') throw new AppError(409, 'CANCELLED', 'ການລົງທະບຽນນີ້ຖືກຍົກເລີກແລ້ວ');
    if (PRICE_LOCKED.has(reg.payment_status)) {
      throw new AppError(409, 'PRICE_LOCKED', reg.payment_status === 'confirmed'
        ? 'ການລົງທະບຽນນີ້ຈ່າຍເງິນແລ້ວ. ບໍ່ອະນຸຍາດໃຫ້ປ່ຽນລາຄາ'
        : 'ມີຫຼັກຖານການຈ່າຍລໍຖ້າກວດ. ກະລຸນາກວດ ແລະ ປະຕິເສດຫຼັກຖານກ່ອນ ຈຶ່ງປ່ຽນລາຄາໄດ້');
    }
    const cat = (await c.query('SELECT * FROM categories WHERE code=$1', [categoryCode])).rows[0];
    const fee = computeFee(cat, memberCount);
    await c.query(`UPDATE registrations SET category_code=$2, distance_km=$3, member_count=$4, fee_base=$5, fee_base_members=$6,
        fee_extra_each=$7, fee_extra_count=$8, total_amount=$9, priced_at=now(), updated_at=now() WHERE id=$1`,
      [reg.id, categoryCode, CATEGORY_DISTANCE[categoryCode], memberCount, fee.base, fee.baseMembers, fee.extraEach, fee.extraCount, fee.total]);
    await sh.audit(c, staffId, action, 'registration', reg.id, {
      reason, from: { category: reg.category_code, members: reg.member_count, total: reg.total_amount },
      to: { category: categoryCode, members: memberCount, total: fee.total },
    });
    return fee;
  }

  const confirmRecalc = (b) => {
    if (b.recalculate !== true) throw new AppError(409, 'RECALC_REQUIRED', 'ການປ່ຽນນີ້ຈະປ່ຽນລາຄາ. ກະລຸນາຢືນຢັນການຄິດໄລ່ລາຄາໃໝ່');
    return requireReason(b);
  };

  r.post('/registrations/:id/recalculate', need('reg.edit'), json, async (req, res) => {
    const id = idParam(req.params.id);
    const reason = requireReason(req.body);
    const fee = await tx(pool, async (c) => {
      const reg = await lockReg(c, id);
      return reprice(c, reg, reg.category_code, reg.member_count, req.staff.id, reason, 'registration.recalculate');
    });
    res.json({ ok: true, fee });
  });

  r.post('/registrations/:id/category', need('reg.edit'), json, async (req, res) => {
    const id = idParam(req.params.id);
    const b = req.body || {};
    const reason = confirmRecalc(b);
    const fee = await tx(pool, async (c) => {
      const reg = await lockReg(c, id);
      if (reg.reg_type !== 'individual' || !['general', 'senior'].includes(b.category)) {
        throw bad('BAD_CATEGORY_CHANGE', 'ປ່ຽນລຸ້ນໄດ້ສະເພາະ ລຸ້ນທົ່ວໄປ ↔ ລຸ້ນ Masters');
      }
      if (b.category === reg.category_code) throw bad('NO_CHANGE', 'ລຸ້ນນີ້ຖືກເລືອກຢູ່ແລ້ວ');
      const cat = (await c.query('SELECT * FROM categories WHERE code=$1', [b.category])).rows[0];
      if (cat.min_age) {
        const settings = await sh.loadSettings(c);
        const p = (await c.query('SELECT dob FROM participants WHERE registration_id=$1', [id])).rows[0];
        if (ageOn(p.dob, settings.eventDate) < cat.min_age) throw bad('AGE', `ອາຍຸບໍ່ເຖິງ ${cat.min_age} ປີ ໃນວັນແຂ່ງຂັນ`);
      }
      return reprice(c, reg, b.category, reg.member_count, req.staff.id, reason, 'registration.category_change');
    });
    res.json({ ok: true, fee });
  });

  function validMember(m, settings, minAge) {
    const fullName = cleanText(m.fullName, 120);
    if (!fullName) throw bad('VALIDATION', 'ກະລຸນາໃສ່ຊື່');
    if (!GENDERS.includes(m.gender)) throw bad('VALIDATION', 'ກະລຸນາເລືອກເພດ');
    if (!parseDate(m.dob) || m.dob < '1900-01-01' || ageOn(m.dob, settings.eventDate) < 0) throw bad('VALIDATION', 'ວັນເກີດບໍ່ຖືກຕ້ອງ');
    if (minAge && ageOn(m.dob, settings.eventDate) < minAge) throw bad('AGE', `ອາຍຸບໍ່ເຖິງ ${minAge} ປີ ໃນວັນແຂ່ງຂັນ`);
    if (!(settings.shirtSizes || []).includes(m.shirtSize)) throw bad('VALIDATION', 'ຂະໜາດເສື້ອບໍ່ຖືກຕ້ອງ');
    return { fullName, gender: m.gender, dob: m.dob, shirtSize: m.shirtSize };
  }

  r.post('/registrations/:id/members', need('reg.edit'), json, async (req, res) => {
    const id = idParam(req.params.id);
    const b = req.body || {};
    const reason = confirmRecalc(b);
    await tx(pool, async (c) => {
      const reg = await lockReg(c, id);
      if (reg.reg_type !== 'family') throw bad('NOT_FAMILY', 'ເພີ່ມສະມາຊິກໄດ້ສະເພາະລຸ້ນ Family');
      const settings = await sh.loadSettings(c, { lock: true });
      const cat = (await c.query('SELECT * FROM categories WHERE code=$1', [reg.category_code])).rows[0];
      if (reg.member_count + 1 > cat.max_members) throw bad('TOO_MANY_MEMBERS', `ສູງສຸດ ${cat.max_members} ຄົນ`);
      const used = await sh.activeParticipantCount(c);
      if (settings.capacity && used + 1 > Number(settings.capacity)) throw new AppError(409, 'CAPACITY', 'ບ່ອນວ່າງເຕັມແລ້ວ');
      const m = validMember(b.member || {}, settings, cat.min_age);
      const pos = (await c.query('SELECT coalesce(max(position),0)+1 AS n FROM participants WHERE registration_id=$1', [id])).rows[0].n;
      await reprice(c, reg, reg.category_code, reg.member_count + 1, req.staff.id, reason, 'registration.member_add');
      await c.query('INSERT INTO participants (registration_id, position, full_name, gender, dob, shirt_size) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, pos, m.fullName, m.gender, m.dob, m.shirtSize]);
      await sh.audit(c, req.staff.id, 'participant.add', 'registration', id, { member: m.fullName });
    });
    res.json({ ok: true });
  });

  r.delete('/participants/:pid', need('reg.edit'), json, async (req, res) => {
    const pid = idParam(req.params.pid);
    const b = req.body || {};
    const reason = confirmRecalc(b);
    await tx(pool, async (c) => {
      const p = (await c.query('SELECT * FROM participants WHERE id=$1', [pid])).rows[0];
      if (!p) throw new AppError(404, 'NOT_FOUND', 'ບໍ່ພົບຜູ້ເຂົ້າຮ່ວມ');
      const reg = await lockReg(c, p.registration_id);
      if (reg.reg_type !== 'family') throw bad('NOT_FAMILY', 'ລຶບສະມາຊິກໄດ້ສະເພາະລຸ້ນ Family');
      const cat = (await c.query('SELECT * FROM categories WHERE code=$1', [reg.category_code])).rows[0];
      if (reg.member_count - 1 < cat.min_members) throw bad('TOO_FEW_MEMBERS', `ລຸ້ນ Family ຕ້ອງມີຢ່າງໜ້ອຍ ${cat.min_members} ຄົນ`);
      await reprice(c, reg, reg.category_code, reg.member_count - 1, req.staff.id, reason, 'registration.member_remove');
      await c.query('DELETE FROM participants WHERE id=$1', [pid]);
      await sh.audit(c, req.staff.id, 'participant.remove', 'registration', reg.id, {
        member: { name: p.full_name, gender: p.gender, dob: p.dob, shirt: p.shirt_size, bib: p.bib },
      });
    });
    res.json({ ok: true });
  });

  r.patch('/participants/:pid', need('reg.edit'), json, async (req, res) => {
    const pid = idParam(req.params.pid);
    await tx(pool, async (c) => {
      const p = (await c.query('SELECT * FROM participants WHERE id=$1 FOR UPDATE', [pid])).rows[0];
      if (!p) throw new AppError(404, 'NOT_FOUND', 'ບໍ່ພົບຜູ້ເຂົ້າຮ່ວມ');
      const reg = (await c.query('SELECT category_code FROM registrations WHERE id=$1', [p.registration_id])).rows[0];
      const cat = (await c.query('SELECT min_age FROM categories WHERE code=$1', [reg.category_code])).rows[0];
      const settings = await sh.loadSettings(c);
      const b = req.body || {};
      const m = validMember({
        fullName: b.fullName ?? p.full_name, gender: b.gender ?? p.gender, dob: b.dob ?? p.dob, shirtSize: b.shirtSize ?? p.shirt_size,
      }, settings, cat.min_age);
      const changes = {};
      for (const [k, col] of [['fullName', 'full_name'], ['gender', 'gender'], ['dob', 'dob'], ['shirtSize', 'shirt_size']]) {
        if (m[k] !== p[col]) changes[col] = { from: p[col], to: m[k] };
      }
      if (!Object.keys(changes).length) return;
      await c.query('UPDATE participants SET full_name=$2, gender=$3, dob=$4, shirt_size=$5 WHERE id=$1', [pid, m.fullName, m.gender, m.dob, m.shirtSize]);
      await sh.audit(c, req.staff.id, 'participant.edit', 'registration', p.registration_id, { participant: pid, changes });
    });
    res.json({ ok: true });
  });

  r.post('/registrations/:id/cancel', need('reg.cancel'), json, async (req, res) => {
    const id = idParam(req.params.id);
    const reason = requireReason(req.body);
    await tx(pool, async (c) => {
      const reg = await lockReg(c, id);
      if (reg.status === 'cancelled') throw new AppError(409, 'ALREADY', 'ຍົກເລີກແລ້ວ');
      if (reg.payment_status === 'confirmed' && req.staff.role !== 'owner') {
        throw new AppError(403, 'FORBIDDEN', 'ການລົງທະບຽນທີ່ຈ່າຍແລ້ວ ຕ້ອງໃຫ້ເຈົ້າຂອງງານເປັນຜູ້ຍົກເລີກ');
      }
      // Financial fields and payment history are kept unchanged.
      await c.query(`UPDATE registrations SET status='cancelled', cancelled_at=now(), cancelled_by=$2, cancel_reason=$3, updated_at=now() WHERE id=$1`,
        [id, req.staff.id, reason]);
      await sh.audit(c, req.staff.id, 'registration.cancel', 'registration', id, { reason, paymentStatus: reg.payment_status, total: reg.total_amount });
    });
    res.json({ ok: true });
  });

  r.post('/registrations/:id/reinstate', need('settings'), json, async (req, res) => {
    const id = idParam(req.params.id);
    const reason = requireReason(req.body);
    await tx(pool, async (c) => {
      const settings = await sh.loadSettings(c, { lock: true });
      const reg = await lockReg(c, id);
      if (reg.status !== 'cancelled') throw new AppError(409, 'NOT_CANCELLED', 'ການລົງທະບຽນນີ້ບໍ່ໄດ້ຖືກຍົກເລີກ');
      const used = await sh.activeParticipantCount(c);
      if (settings.capacity && used + reg.member_count > Number(settings.capacity)) throw new AppError(409, 'CAPACITY', 'ບ່ອນວ່າງບໍ່ພໍ');
      await c.query(`UPDATE registrations SET status='active', updated_at=now() WHERE id=$1`, [id]);
      await sh.audit(c, req.staff.id, 'registration.reinstate', 'registration', id, { reason });
    });
    res.json({ ok: true });
  });

  r.post('/registrations/:id/access-code', need('reg.edit'), async (req, res) => {
    const id = idParam(req.params.id);
    const code = sec.randomAccessCode();
    const q = await pool.query('UPDATE registrations SET access_hash=$2, updated_at=now() WHERE id=$1 RETURNING reference', [id, sec.hashAccessCode(code)]);
    if (!q.rowCount) throw new AppError(404, 'NOT_FOUND', 'ບໍ່ພົບການລົງທະບຽນ');
    await sh.audit(pool, req.staff.id, 'registration.access_code_reset', 'registration', id, {});
    res.json({ reference: q.rows[0].reference, accessCode: code });
  });

  // ---------- payments ----------
  r.get('/proofs/:pid', need('pay.read'), async (req, res) => {
    const pid = idParam(req.params.pid);
    const q = await pool.query('SELECT content_type, data FROM payment_proofs WHERE id=$1', [pid]);
    if (!q.rowCount) throw new AppError(404, 'NOT_FOUND', 'ບໍ່ພົບໄຟລ໌');
    res.set({
      'Content-Type': q.rows[0].content_type, 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    res.send(q.rows[0].data);
  });

  r.post('/registrations/:id/payment', need('pay.review'), json, async (req, res) => {
    const id = idParam(req.params.id);
    const b = req.body || {};
    const note = cleanText(b.note, 500) || null;
    const out = await tx(pool, async (c) => {
      const reg = await lockReg(c, id);
      const pending = (await c.query(`SELECT id FROM payment_proofs WHERE registration_id=$1 AND review_status='pending' ORDER BY uploaded_at DESC LIMIT 1`, [id])).rows[0];
      if (b.action === 'confirm') {
        if (reg.status !== 'active') throw new AppError(409, 'CANCELLED', 'ການລົງທະບຽນນີ້ຖືກຍົກເລີກແລ້ວ');
        if (reg.payment_status === 'confirmed') throw new AppError(409, 'ALREADY_CONFIRMED', 'ຢືນຢັນການຈ່າຍແລ້ວ');
        if (!pending && !note) throw bad('NOTE_REQUIRED', 'ບໍ່ມີຫຼັກຖານລໍຖ້າກວດ. ກະລຸນາໃສ່ໝາຍເຫດ (ເຊັ່ນ: ຮັບເງິນສົດ)');
        await c.query(`UPDATE registrations SET payment_status='confirmed', confirmed_amount=total_amount, confirmed_at=now(), confirmed_by=$2,
            payment_note=$3, updated_at=now() WHERE id=$1`, [id, req.staff.id, note]);
        if (pending) await c.query(`UPDATE payment_proofs SET review_status='accepted', reviewed_by=$2, reviewed_at=now() WHERE id=$1`, [pending.id, req.staff.id]);
        await c.query(`INSERT INTO payment_events (registration_id, action, amount, note, staff_id) VALUES ($1,'confirmed',$2,$3,$4)`, [id, reg.total_amount, note, req.staff.id]);
      } else if (b.action === 'reject') {
        if (reg.payment_status !== 'awaiting_review') throw new AppError(409, 'BAD_STATE', 'ປະຕິເສດໄດ້ສະເພາະລາຍການທີ່ລໍຖ້າກວດສອບ');
        if (!note) throw bad('NOTE_REQUIRED', 'ກະລຸນາໃສ່ເຫດຜົນທີ່ປະຕິເສດ (ຜູ້ລົງທະບຽນຈະເຫັນຂໍ້ຄວາມນີ້)');
        await c.query(`UPDATE registrations SET payment_status='rejected', payment_note=$2, updated_at=now() WHERE id=$1`, [id, note]);
        await c.query(`UPDATE payment_proofs SET review_status='rejected', reviewed_by=$2, reviewed_at=now() WHERE registration_id=$1 AND review_status='pending'`, [id, req.staff.id]);
        await c.query(`INSERT INTO payment_events (registration_id, action, note, staff_id) VALUES ($1,'rejected',$2,$3)`, [id, note, req.staff.id]);
      } else if (b.action === 'reopen') {
        if (!can(req.staff, 'pay.reopen')) throw new AppError(403, 'FORBIDDEN', 'ສະເພາະເຈົ້າຂອງງານເທົ່ານັ້ນ');
        if (reg.payment_status !== 'confirmed') throw new AppError(409, 'BAD_STATE', 'ລາຍການນີ້ຍັງບໍ່ໄດ້ຢືນຢັນການຈ່າຍ');
        if (!note) throw bad('NOTE_REQUIRED', 'ກະລຸນາໃສ່ເຫດຜົນ');
        await c.query(`UPDATE registrations SET payment_status='awaiting_review', confirmed_amount=NULL, confirmed_at=NULL, confirmed_by=NULL,
            payment_note=$2, updated_at=now() WHERE id=$1`, [id, note]);
        await c.query(`INSERT INTO payment_events (registration_id, action, amount, note, staff_id) VALUES ($1,'reopened',$2,$3,$4)`, [id, reg.confirmed_amount, note, req.staff.id]);
      } else {
        throw bad('BAD_ACTION', 'ຄຳສັ່ງບໍ່ຖືກຕ້ອງ');
      }
      await sh.audit(c, req.staff.id, `payment.${b.action}`, 'registration', id, { note, total: reg.total_amount, from: reg.payment_status });
      return (await c.query('SELECT payment_status FROM registrations WHERE id=$1', [id])).rows[0];
    });
    res.json({ ok: true, paymentStatus: out.payment_status });
  });

  // ---------- race operations ----------
  async function lockParticipant(c, pid) {
    const p = (await c.query(
      `SELECT p.*, r.status AS reg_status, r.category_code FROM participants p JOIN registrations r ON r.id=p.registration_id WHERE p.id=$1 FOR UPDATE OF p`, [pid])).rows[0];
    if (!p) throw new AppError(404, 'NOT_FOUND', 'ບໍ່ພົບຜູ້ເຂົ້າຮ່ວມ');
    return p;
  }

  r.post('/participants/:pid/bib', need('race.ops'), json, async (req, res) => {
    const pid = idParam(req.params.pid);
    const b = req.body || {};
    try {
      const bib = await tx(pool, async (c) => {
        // Serialize BIB assignments; the unique index is the final guarantee.
        await c.query('SELECT pg_advisory_xact_lock(7262026)');
        const p = await lockParticipant(c, pid);
        if (p.reg_status !== 'active') throw new AppError(409, 'CANCELLED', 'ການລົງທະບຽນນີ້ຖືກຍົກເລີກແລ້ວ');
        let bibVal;
        if (b.auto === true) {
          const settings = await sh.loadSettings(c);
          const start = Number((settings.bibStart || {})[p.category_code]) || ({ general: 1001, senior: 3001, family: 5001 })[p.category_code];
          const mx = (await c.query(
            `SELECT max(p.bib::int) AS m FROM participants p JOIN registrations r ON r.id=p.registration_id
              WHERE r.category_code=$1 AND p.bib ~ '^[0-9]{1,9}$' AND p.bib::int >= $2`, [p.category_code, start])).rows[0].m;
          let n = mx ? mx + 1 : start;
          while ((await c.query('SELECT 1 FROM participants WHERE upper(bib)=$1', [String(n)])).rowCount) n++;
          bibVal = String(n);
        } else {
          bibVal = String(b.bib || '').trim().toUpperCase();
          if (!/^[0-9A-Z-]{1,10}$/.test(bibVal)) throw bad('BAD_BIB', 'BIB ຕ້ອງເປັນຕົວເລກ/ຕົວອັກສອນອັງກິດ ບໍ່ເກີນ 10 ຕົວ');
        }
        if (p.bib && p.bib.toUpperCase() === bibVal) return bibVal;
        await c.query('UPDATE participants SET bib=$2, bib_assigned_at=now() WHERE id=$1', [pid, bibVal]);
        await sh.audit(c, req.staff.id, 'participant.bib', 'registration', p.registration_id, { participant: pid, name: p.full_name, from: p.bib, to: bibVal });
        return bibVal;
      });
      res.json({ ok: true, bib });
    } catch (e) {
      if (e.code === '23505') throw new AppError(409, 'BIB_TAKEN', 'BIB ນີ້ຖືກໃຊ້ແລ້ວ');
      throw e;
    }
  });

  r.delete('/participants/:pid/bib', need('race.ops'), async (req, res) => {
    const pid = idParam(req.params.pid);
    await tx(pool, async (c) => {
      const p = await lockParticipant(c, pid);
      await c.query('UPDATE participants SET bib=NULL, bib_assigned_at=NULL WHERE id=$1', [pid]);
      await sh.audit(c, req.staff.id, 'participant.bib_remove', 'registration', p.registration_id, { participant: pid, name: p.full_name, from: p.bib });
    });
    res.json({ ok: true });
  });

  for (const [path, col, byCol, label] of [['kit', 'kit_collected_at', 'kit_collected_by', 'participant.kit'], ['checkin', 'checked_in_at', 'checked_in_by', 'participant.checkin']]) {
    r.post(`/participants/:pid/${path}`, need('race.ops'), json, async (req, res) => {
      const pid = idParam(req.params.pid);
      const on = (req.body || {}).value === true;
      await tx(pool, async (c) => {
        const p = await lockParticipant(c, pid);
        if (on && p.reg_status !== 'active') throw new AppError(409, 'CANCELLED', 'ການລົງທະບຽນນີ້ຖືກຍົກເລີກແລ້ວ');
        if (on === !!p[col]) return;
        await c.query(`UPDATE participants SET ${col}=${on ? 'now()' : 'NULL'}, ${byCol}=$2 WHERE id=$1`, [pid, on ? req.staff.id : null]);
        await sh.audit(c, req.staff.id, label, 'registration', p.registration_id, { participant: pid, name: p.full_name, value: on });
      });
      res.json({ ok: true });
    });
  }

  // ---------- reports & exports ----------
  r.get('/reports', need('reports.ops'), async (req, res) => {
    const shirts = (await pool.query(`SELECT p.shirt_size, count(*)::int AS n FROM participants p JOIN registrations r ON r.id=p.registration_id
      WHERE r.status='active' GROUP BY 1 ORDER BY 1`)).rows;
    const settings = await sh.loadSettings(pool);
    const people = (await pool.query(`SELECT r.category_code, p.gender, p.dob::text AS dob FROM participants p JOIN registrations r ON r.id=p.registration_id
      WHERE r.status='active'`)).rows;
    const div = new Map();
    for (const x of people) {
      const age_group = ageGroup(x.category_code, ageOn(x.dob, settings.eventDate));
      const k = [x.category_code, x.gender, age_group].join('|');
      if (!div.has(k)) div.set(k, { category_code: x.category_code, gender: x.gender, age_group, n: 0 });
      div.get(k).n += 1;
    }
    const order = { general: 1, senior: 2, family: 3 };
    const divisions = [...div.values()].sort((a, b) => (order[a.category_code] - order[b.category_code])
      || a.gender.localeCompare(b.gender) || a.age_group.localeCompare(b.age_group));
    const out = { shirts, divisions };
    if (can(req.staff, 'reports.finance')) {
      out.revenue = (await pool.query(`SELECT category_code, count(*)::int AS registrations, coalesce(sum(confirmed_amount),0)::bigint AS confirmed
        FROM registrations WHERE payment_status='confirmed' GROUP BY 1 ORDER BY 1`)).rows;
      out.unpaid = (await pool.query(`SELECT id, reference, category_code, team_name, contact_name, contact_phone, member_count, total_amount, payment_status, created_at
        FROM registrations WHERE status='active' AND payment_status<>'confirmed' ORDER BY created_at`)).rows;
    }
    res.json(out);
  });

  const yes = (v) => (v ? 'ແມ່ນ' : 'ບໍ່');
  r.get('/export/participants.csv', need('export.participants'), async (req, res) => {
    const settings = await sh.loadSettings(pool);
    const rows = (await pool.query(`
      SELECT r.reference, r.reg_type, r.category_code, c.name_lo, r.team_name, p.position, p.full_name, p.gender, p.dob, r.distance_km, p.shirt_size,
             r.contact_name, r.contact_phone, r.emergency_name, r.emergency_phone, r.payment_status, p.bib,
             p.kit_collected_at, p.checked_in_at, r.status, r.created_at
        FROM participants p JOIN registrations r ON r.id=p.registration_id JOIN categories c ON c.code=r.category_code
       ORDER BY r.created_at, r.id, p.position`)).rows;
    const header = ['ລະຫັດລົງທະບຽນ', 'ປະເພດ', 'ລຸ້ນ', 'ຊື່ທີມ', 'ລຳດັບໃນທີມ', 'ຊື່ ແລະ ນາມສະກຸນ', 'ເພດ', 'ວັນເດືອນປີເກີດ', 'ອາຍຸໃນວັນແຂ່ງ', 'ກຸ່ມອາຍຸ (ລາງວັນ)',
      'ໄລຍະທາງ (KM)', 'ຂະໜາດເສື້ອ', 'ຜູ້ຕິດຕໍ່', 'ເບີ WhatsApp', 'ຜູ້ຕິດຕໍ່ສຸກເສີນ', 'ເບີສຸກເສີນ', 'ສະຖານະການຈ່າຍ', 'BIB',
      'ຮັບເຄື່ອງແລ້ວ', 'ເວລາຮັບເຄື່ອງ', 'ເຊັກອິນແລ້ວ', 'ເວລາເຊັກອິນ', 'ສະຖານະລົງທະບຽນ', 'ວັນທີລົງທະບຽນ'];
    const data = rows.map((x) => [x.reference, x.reg_type === 'family' ? 'Family' : 'ບຸກຄົນ', x.name_lo, x.team_name, x.position, x.full_name,
      sh.GENDER_LABELS[x.gender], x.dob, ageOn(x.dob, settings.eventDate), ageGroup(x.category_code, ageOn(x.dob, settings.eventDate)), x.distance_km, x.shirt_size, x.contact_name, x.contact_phone,
      x.emergency_name, x.emergency_phone, sh.PAYMENT_LABELS[x.payment_status], x.bib, yes(x.kit_collected_at), sh.fmtVientiane(x.kit_collected_at),
      yes(x.checked_in_at), sh.fmtVientiane(x.checked_in_at), sh.STATUS_LABELS[x.status], sh.fmtVientiane(x.created_at)]);
    await sh.audit(pool, req.staff.id, 'export.participants', 'export', null, { rows: data.length });
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="lnt-2026-participants.csv"' });
    res.send(sec.toCsv(header, data));
  });

  r.get('/export/payments.csv', need('export.payments'), async (req, res) => {
    const rows = (await pool.query(`
      SELECT r.reference, r.reg_type, c.name_lo, r.team_name, r.contact_name, r.contact_phone, r.member_count, r.fee_base, r.fee_extra_each,
             r.fee_extra_count, r.total_amount, r.payment_status, r.confirmed_amount, r.confirmed_at, s.display_name AS confirmed_by, r.payment_note,
             r.status, r.created_at
        FROM registrations r JOIN categories c ON c.code=r.category_code LEFT JOIN staff s ON s.id=r.confirmed_by
       ORDER BY r.created_at, r.id`)).rows;
    const header = ['ລະຫັດລົງທະບຽນ', 'ປະເພດ', 'ລຸ້ນ', 'ຊື່ທີມ', 'ຜູ້ຕິດຕໍ່', 'ເບີ WhatsApp', 'ຈຳນວນຄົນ', 'ຄ່າພື້ນຖານ (ກີບ)', 'ຄ່າເພີ່ມຕໍ່ຄົນ (ກີບ)',
      'ຈຳນວນຄົນເພີ່ມ', 'ຍອດຕ້ອງຈ່າຍ (ກີບ)', 'ສະຖານະການຈ່າຍ', 'ຍອດຢືນຢັນແລ້ວ (ກີບ)', 'ເວລາຢືນຢັນ', 'ຢືນຢັນໂດຍ', 'ໝາຍເຫດການຈ່າຍ', 'ສະຖານະລົງທະບຽນ', 'ວັນທີລົງທະບຽນ'];
    const data = rows.map((x) => [x.reference, x.reg_type === 'family' ? 'Family' : 'ບຸກຄົນ', x.name_lo, x.team_name, x.contact_name, x.contact_phone,
      x.member_count, x.fee_base, x.fee_extra_each, x.fee_extra_count, x.total_amount, sh.PAYMENT_LABELS[x.payment_status], x.confirmed_amount,
      sh.fmtVientiane(x.confirmed_at), x.confirmed_by, x.payment_note, sh.STATUS_LABELS[x.status], sh.fmtVientiane(x.created_at)]);
    await sh.audit(pool, req.staff.id, 'export.payments', 'export', null, { rows: data.length });
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="lnt-2026-payments.csv"' });
    res.send(sec.toCsv(header, data));
  });

  // ---------- settings ----------
  r.get('/settings', need('settings'), async (req, res) => {
    res.json({ settings: await sh.loadSettings(pool), categories: await sh.loadCategories(pool) });
  });

  r.put('/settings', need('settings'), json, async (req, res) => {
    const b = req.body || {};
    await tx(pool, async (c) => {
      const cur = await sh.loadSettings(c, { lock: true });
      const next = { ...cur };
      const str = (k, max) => {
        if (b[k] === undefined) return;
        const v = b[k] === null ? '' : (typeof b[k] === 'string' ? b[k].replace(/\r\n/g, '\n').trim() : null);
        if (v === null || v.length > max) throw bad('VALIDATION', `ຂໍ້ມູນ ${k} ບໍ່ຖືກຕ້ອງ ຫຼື ຍາວເກີນ`);
        next[k] = v || null;
      };
      ['eventName', 'province', 'meetingPoint', 'meetingTime', 'bankName', 'bankAccountName', 'bankAccountNumber', 'whatsapp'].forEach((k) => str(k, 200));
      ['contactNote', 'benefits', 'instructions'].forEach((k) => str(k, 3000));
      if (!next.eventName) throw bad('VALIDATION', 'ກະລຸນາໃສ່ຊື່ງານ');
      if (b.eventDate !== undefined) { if (!parseDate(b.eventDate)) throw bad('VALIDATION', 'ວັນທີງານບໍ່ຖືກຕ້ອງ'); next.eventDate = b.eventDate; }
      if (b.registrationOpen !== undefined) next.registrationOpen = b.registrationOpen === true;
      if (b.registrationDeadline !== undefined) {
        if (b.registrationDeadline && !(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(b.registrationDeadline) && sh.vientianeToDate(b.registrationDeadline))) {
          throw bad('VALIDATION', 'ກຳນົດປິດລົງທະບຽນບໍ່ຖືກຕ້ອງ');
        }
        next.registrationDeadline = b.registrationDeadline || null;
      }
      if (b.capacity !== undefined) {
        if (b.capacity === null || b.capacity === '') next.capacity = null;
        else { const n = Number(b.capacity); if (!Number.isSafeInteger(n) || n < 1 || n > 100000) throw bad('VALIDATION', 'ຈຳນວນຮັບສູງສຸດບໍ່ຖືກຕ້ອງ'); next.capacity = n; }
      }
      if (b.shirtSizes !== undefined) {
        if (!Array.isArray(b.shirtSizes) || !b.shirtSizes.length || b.shirtSizes.length > 20 ||
            !b.shirtSizes.every((s) => typeof s === 'string' && s.trim() && s.trim().length <= 12)) throw bad('VALIDATION', 'ຂະໜາດເສື້ອບໍ່ຖືກຕ້ອງ');
        next.shirtSizes = [...new Set(b.shirtSizes.map((s) => s.trim()))];
      }
      if (b.bibStart !== undefined) {
        const o = {};
        for (const k of ['general', 'senior', 'family']) {
          const n = Number((b.bibStart || {})[k]);
          if (!Number.isSafeInteger(n) || n < 1 || n > 99999999) throw bad('VALIDATION', 'ເລກ BIB ເລີ່ມຕົ້ນບໍ່ຖືກຕ້ອງ');
          o[k] = n;
        }
        next.bibStart = o;
      }
      for (const k of ['paymentQrAssetId', 'logoAssetId']) if (b[k] === null) next[k] = null;
      if (Array.isArray(b.eventImageAssetIds)) next.eventImageAssetIds = (cur.eventImageAssetIds || []).filter((id) => b.eventImageAssetIds.includes(id));
      await c.query('UPDATE settings SET data=$1, updated_at=now(), updated_by=$2 WHERE id=1', [next, req.staff.id]);
      const changed = Object.keys(next).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(cur[k]));
      await sh.audit(c, req.staff.id, 'settings.update', 'settings', 1, { changed: Object.fromEntries(changed.map((k) => [k, { from: cur[k], to: next[k] }])) });
    });
    res.json({ settings: await sh.loadSettings(pool) });
  });

  r.put('/categories/:code', need('settings'), json, async (req, res) => {
    const code = req.params.code;
    const b = req.body || {};
    await tx(pool, async (c) => {
      const cur = (await c.query('SELECT * FROM categories WHERE code=$1 FOR UPDATE', [code])).rows[0];
      if (!cur) throw new AppError(404, 'NOT_FOUND', 'ບໍ່ພົບລຸ້ນ');
      const int = (v, d, min, max) => {
        if (v === undefined) return d;
        const n = Number(v);
        if (!Number.isSafeInteger(n) || n < min || n > max) throw bad('VALIDATION', 'ຕົວເລກບໍ່ຖືກຕ້ອງ (ໃຊ້ຈຳນວນເຕັມ)');
        return n;
      };
      const next = {
        base_fee: int(b.baseFee, cur.base_fee, 0, 100000000),
        extra_fee: code === 'family' ? int(b.extraFee, cur.extra_fee, 0, 100000000) : 0,
        max_members: code === 'family' ? int(b.maxMembers, cur.max_members, cur.min_members, 100) : cur.max_members,
        active: b.active === undefined ? cur.active : b.active === true,
      };
      await c.query('UPDATE categories SET base_fee=$2, extra_fee=$3, max_members=$4, active=$5, updated_at=now() WHERE code=$1',
        [code, next.base_fee, next.extra_fee, next.max_members, next.active]);
      await sh.audit(c, req.staff.id, 'category.update', 'category', code, {
        from: { base_fee: cur.base_fee, extra_fee: cur.extra_fee, max_members: cur.max_members, active: cur.active }, to: next,
        note: 'ລາຄາໃໝ່ໃຊ້ກັບການລົງທະບຽນໃໝ່ເທົ່ານັ້ນ',
      });
    });
    res.json({ categories: await sh.loadCategories(pool) });
  });

  r.post('/assets', need('settings'), express.raw({ type: () => true, limit: 5 * 1024 * 1024 }), async (req, res) => {
    const kind = String(req.query.kind || '');
    if (!['logo', 'event_image', 'payment_qr'].includes(kind)) throw bad('BAD_KIND', 'ປະເພດຮູບບໍ່ຖືກຕ້ອງ');
    const buf = req.body;
    const type = sec.sniffImage(buf);
    if (!type) throw new AppError(415, 'BAD_FILE_TYPE', 'ຮັບສະເພາະຮູບ JPG, PNG ຫຼື WebP');
    const id = await tx(pool, async (c) => {
      const settings = await sh.loadSettings(c, { lock: true });
      const a = (await c.query('INSERT INTO assets (kind, content_type, byte_size, data) VALUES ($1,$2,$3,$4) RETURNING id', [kind, type, buf.length, buf])).rows[0].id;
      if (kind === 'payment_qr') settings.paymentQrAssetId = a;
      if (kind === 'logo') settings.logoAssetId = a;
      if (kind === 'event_image') {
        const list = settings.eventImageAssetIds || [];
        if (list.length >= 6) throw bad('TOO_MANY', 'ຮູບງານໄດ້ສູງສຸດ 6 ຮູບ');
        settings.eventImageAssetIds = [...list, a];
      }
      await c.query('UPDATE settings SET data=$1, updated_at=now(), updated_by=$2 WHERE id=1', [settings, req.staff.id]);
      await sh.audit(c, req.staff.id, 'asset.upload', 'asset', a, { kind });
      return a;
    });
    res.status(201).json({ id, url: `/assets/${id}` });
  });

  // ---------- staff ----------
  r.get('/staff', need('staff.manage'), async (req, res) => {
    res.json({ staff: (await pool.query('SELECT id, username, display_name, role, active, created_at, last_login_at FROM staff ORDER BY id')).rows });
  });

  r.post('/staff', need('staff.manage'), json, async (req, res) => {
    const b = req.body || {};
    const username = String(b.username || '').trim();
    if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) throw bad('VALIDATION', 'ຊື່ຜູ້ໃຊ້: ຕົວອັກສອນອັງກິດ/ຕົວເລກ 3–40 ຕົວ');
    const displayName = cleanText(b.displayName, 80);
    if (!displayName) throw bad('VALIDATION', 'ກະລຸນາໃສ່ຊື່ສະແດງ');
    if (!['owner', 'accountant', 'staff'].includes(b.role)) throw bad('VALIDATION', 'ບົດບາດບໍ່ຖືກຕ້ອງ');
    sec.checkPasswordStrength(b.password);
    try {
      const q = await pool.query('INSERT INTO staff (username, display_name, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id',
        [username, displayName, sec.hashPassword(b.password), b.role]);
      await sh.audit(pool, req.staff.id, 'staff.create', 'staff', q.rows[0].id, { username, role: b.role });
      res.status(201).json({ id: q.rows[0].id });
    } catch (e) {
      if (e.code === '23505') throw new AppError(409, 'USERNAME_TAKEN', 'ຊື່ຜູ້ໃຊ້ນີ້ມີແລ້ວ');
      throw e;
    }
  });

  r.patch('/staff/:sid', need('staff.manage'), json, async (req, res) => {
    const sid = idParam(req.params.sid);
    const b = req.body || {};
    const cur = (await pool.query('SELECT * FROM staff WHERE id=$1', [sid])).rows[0];
    if (!cur) throw new AppError(404, 'NOT_FOUND', 'ບໍ່ພົບພະນັກງານ');
    if (sid === req.staff.id && (b.active === false || (b.role && b.role !== 'owner'))) {
      throw bad('SELF_LOCKOUT', 'ບໍ່ສາມາດປິດບັນຊີ ຫຼື ລົດສິດຂອງຕົນເອງໄດ້');
    }
    const changes = {};
    if (b.role !== undefined) { if (!['owner', 'accountant', 'staff'].includes(b.role)) throw bad('VALIDATION', 'ບົດບາດບໍ່ຖືກຕ້ອງ'); changes.role = b.role; }
    if (b.active !== undefined) changes.active = b.active === true;
    if (b.displayName !== undefined) { const v = cleanText(b.displayName, 80); if (!v) throw bad('VALIDATION', 'ຊື່ບໍ່ຖືກຕ້ອງ'); changes.display_name = v; }
    if (b.password !== undefined) { sec.checkPasswordStrength(b.password); changes.password_hash = sec.hashPassword(b.password); }
    const cols = Object.keys(changes);
    if (cols.length) {
      await pool.query(`UPDATE staff SET ${cols.map((k, i) => `${k}=$${i + 2}`).join(', ')} WHERE id=$1`, [sid, ...cols.map((k) => changes[k])]);
      if (changes.active === false || changes.password_hash || changes.role) await pool.query('DELETE FROM sessions WHERE staff_id=$1 AND staff_id<>$2', [sid, req.staff.id]);
      const logged = { ...changes }; if (logged.password_hash) logged.password_hash = '(changed)';
      await sh.audit(pool, req.staff.id, 'staff.update', 'staff', sid, logged);
    }
    res.json({ ok: true });
  });

  r.get('/audit', need('audit.read'), async (req, res) => {
    const rows = (await pool.query(`SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at, s.display_name AS staff
      FROM audit_log a LEFT JOIN staff s ON s.id=a.staff_id ORDER BY a.created_at DESC, a.id DESC LIMIT 300`)).rows;
    res.json({ rows });
  });

  return r;
};

module.exports.PERMS = PERMS;

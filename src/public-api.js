'use strict';
const express = require('express');
const crypto = require('crypto');
const { AppError, validateRegistration, normName, AGE_GROUPS } = require('./domain');
const sec = require('./security');
const sh = require('./shared');
const { tx } = require('./db');

const MAX_UPLOAD = 5 * 1024 * 1024;
const MAX_PROOFS = 10;

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function buildFaq(settings, categories) {
  const senior = categories.find((c) => c.code === 'senior');
  const fam = categories.find((c) => c.code === 'family');
  const [y, m, d] = settings.eventDate.split('-').map(Number);
  const months = ['ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ', 'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'];
  const faq = [
    { q: 'ລົງທະບຽນແລ້ວ ໝາຍຄວາມວ່າຈ່າຍເງິນແລ້ວບໍ?', a: 'ບໍ່. ການລົງທະບຽນແມ່ນບັນທຶກຂໍ້ມູນເທົ່ານັ້ນ. ການຈ່າຍເງິນຈະສົມບູນເມື່ອພະນັກງານກວດສອບຫຼັກຖານ ແລະ ຢືນຢັນແລ້ວ.' },
    { q: 'ກວດສະຖານະການລົງທະບຽນແນວໃດ?', a: 'ໃຊ້ລິ້ງສ່ວນຕົວທີ່ໄດ້ຮັບຫຼັງລົງທະບຽນ ຫຼື ໃສ່ລະຫັດລົງທະບຽນ ແລະ ລະຫັດເຂົ້າເບິ່ງ ຢູ່ໜ້າ “ກວດສະຖານະ”.' },
    { q: 'ເຮັດລິ້ງ ຫຼື ລະຫັດເຂົ້າເບິ່ງເສຍ ຕ້ອງເຮັດແນວໃດ?', a: 'ຕິດຕໍ່ຜູ້ຈັດງານ. ພະນັກງານຈະກວດຢືນຢັນຕົວຕົນ ແລະ ອອກລະຫັດໃໝ່ໃຫ້. ເບີໂທຢ່າງດຽວບໍ່ພຽງພໍສຳລັບການຢືນຢັນຕົວຕົນ.' },
  ];
  if (senior && senior.active && senior.min_age) {
    faq.push({ q: `${senior.name_lo} ນັບອາຍຸແນວໃດ?`, a: `ນັບອາຍຸໃນວັນແຂ່ງຂັນ. ຕ້ອງມີອາຍຸ ${senior.min_age} ປີຂຶ້ນໄປ ໃນວັນທີ ${d} ${months[m - 1]} ${y}.` });
  }
  const gen = categories.find((c) => c.code === 'general');
  if (gen && gen.active && AGE_GROUPS.general.length > 1) {
    faq.push({ q: `${gen.name_lo} ${gen.distance_km} KM ແບ່ງລາງວັນແນວໃດ?`, a: `ແບ່ງຊາຍ ແລະ ຍິງ, ແຕ່ລະເພດແບ່ງ ${AGE_GROUPS.general.length} ກຸ່ມອາຍຸ: ${AGE_GROUPS.general.map((g) => g.label).join(' ແລະ ')} (ນັບອາຍຸໃນວັນແຂ່ງຂັນ).${gen.min_age ? ` ຕ້ອງມີອາຍຸ ${gen.min_age} ປີຂຶ້ນໄປ.` : ''} ອັນດັບ 1–3 ຂອງທຸກກຸ່ມ ຮັບຂັນ.` });
  }
  if (fam && fam.active) {
    faq.push({ q: 'ລຸ້ນ Family ຄິດເງິນແນວໃດ?', a: `${fam.base_members} ຄົນທຳອິດ ${fmt(fam.base_fee)} ກີບຕໍ່ທີມ. ຕັ້ງແຕ່ຄົນທີ ${fam.base_members + 1} ເປັນຕົ້ນໄປ ເພີ່ມຄົນລະ ${fmt(fam.extra_fee)} ກີບ. ຈ່າຍຄັ້ງດຽວສຳລັບທັງທີມໄດ້.` });
  }
  return faq;
}

module.exports = function publicApi({ pool, config }) {
  const r = express.Router();
  const json = express.json({ limit: '64kb' });
  const limitCreate = sec.rateLimiter({ name: 'create', windowMs: 60 * 60 * 1000, max: 40 });
  const limitLookup = sec.rateLimiter({ name: 'lookup', windowMs: 15 * 60 * 1000, max: 60 });
  const limitUpload = sec.rateLimiter({ name: 'upload', windowMs: 60 * 60 * 1000, max: 20 });

  r.get('/config', async (req, res) => {
    const settings = await sh.loadSettings(pool);
    const categories = await sh.loadCategories(pool);
    const used = await sh.activeParticipantCount(pool);
    const state = sh.openState(settings, used);
    res.set('Cache-Control', 'no-store');
    res.json({
      eventName: settings.eventName,
      eventDate: settings.eventDate,
      timezone: 'Asia/Vientiane',
      province: settings.province,
      meetingPoint: settings.meetingPoint || null,
      meetingTime: settings.meetingTime || null,
      registrationDeadline: settings.registrationDeadline || null,
      registration: state,
      whatsapp: settings.whatsapp || null,
      contactNote: settings.contactNote || null,
      benefits: settings.benefits || null,
      instructions: settings.instructions || null,
      logoUrl: settings.logoAssetId ? `/assets/${settings.logoAssetId}` : null,
      imageUrls: (settings.eventImageAssetIds || []).map((id) => `/assets/${id}`),
      shirtSizes: settings.shirtSizes || [],
      faq: buildFaq(settings, categories),
      payment: sh.paymentInfo(settings),
      categories: categories.filter((c) => c.active).map((c) => ({
        code: c.code, name: c.name_lo, distanceKm: c.distance_km, baseFee: c.base_fee, baseMembers: c.base_members,
        extraFee: c.extra_fee, minMembers: c.min_members, maxMembers: c.max_members, minAge: c.min_age,
        ageGroups: (AGE_GROUPS[c.code] || []).map((g) => g.label),
      })),
    });
  });

  r.post('/registrations', limitCreate, json, async (req, res) => {
    const body = req.body || {};
    const key = body.idempotencyKey;
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) {
      throw new AppError(400, 'BAD_IDEMPOTENCY_KEY', 'ຄຳຂໍບໍ່ຖືກຕ້ອງ. ກະລຸນາໂຫຼດໜ້າໃໝ່');
    }
    const result = await tx(pool, async (c) => {
      // Serializes registration creation: protects capacity and idempotency under concurrent requests.
      const settings = await sh.loadSettings(c, { lock: true });
      const categories = await sh.loadCategories(c);
      const v = validateRegistration(body, { categories, settings });
      const fingerprint = sec.sha256(JSON.stringify({
        c: v.category, t: v.teamName, n: v.contactName, p: v.contactPhoneNorm, e: v.emergencyName, ep: v.emergencyPhone,
        note: v.note, m: v.members.map((m) => [m.fullName, m.gender, m.dob, m.shirtSize]),
      }));

      const existing = await c.query('SELECT id, reference, request_fingerprint FROM registrations WHERE idempotency_key=$1', [key]);
      if (existing.rowCount) {
        if (existing.rows[0].request_fingerprint !== fingerprint) {
          throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'ຄຳຂໍນີ້ຖືກໃຊ້ກັບຂໍ້ມູນອື່ນແລ້ວ. ກະລຸນາໂຫຼດໜ້າໃໝ່ ແລ້ວລົງທະບຽນອີກຄັ້ງ');
        }
        return { id: existing.rows[0].id, reference: existing.rows[0].reference, replay: true };
      }

      const used = await sh.activeParticipantCount(c);
      const state = sh.openState(settings, used);
      if (!state.open) throw new AppError(409, 'REGISTRATION_CLOSED', state.reason);
      if (state.remaining !== null && state.remaining < v.members.length) {
        throw new AppError(409, 'CAPACITY', `ບ່ອນວ່າງເຫຼືອ ${state.remaining} ຄົນ ບໍ່ພຽງພໍສຳລັບ ${v.members.length} ຄົນ`);
      }

      if (body.acknowledgeDuplicate !== true) {
        const names = v.members.map((m) => normName(m.fullName));
        const dobs = v.members.map((m) => m.dob);
        const dup = await c.query(
          `SELECT DISTINCT lower(regexp_replace(p.full_name,'\\s+',' ','g')) AS n, p.dob::text AS d
             FROM participants p JOIN registrations r ON r.id=p.registration_id
            WHERE r.status='active' AND (lower(regexp_replace(p.full_name,'\\s+',' ','g')), p.dob::text) IN
                  (SELECT * FROM unnest($1::text[], $2::text[]))`, [names, dobs]);
        if (dup.rowCount) {
          const hits = new Set(dup.rows.map((x) => `${x.n}|${x.d}`));
          const who = v.members.filter((m) => hits.has(`${normName(m.fullName)}|${m.dob}`)).map((m) => m.fullName);
          throw new AppError(409, 'POSSIBLE_DUPLICATE',
            'ອາດມີການລົງທະບຽນຊ້ຳ: ມີຜູ້ລົງທະບຽນທີ່ມີຊື່ ແລະ ວັນເກີດດຽວກັນແລ້ວ. ຖ້າແນ່ໃຈວ່າບໍ່ແມ່ນການລົງທະບຽນຊ້ຳ ກົດ “ຢືນຢັນສົ່ງຕໍ່”', { names: who });
        }
      }

      const accessCode = sec.accessCodeFor(config.appSecret, key);
      let reference;
      for (let i = 0; i < 10; i++) {
        reference = sec.newReference();
        const taken = await c.query('SELECT 1 FROM registrations WHERE reference=$1', [reference]);
        if (!taken.rowCount) break;
      }
      const ins = await c.query(
        `INSERT INTO registrations (reference, access_hash, idempotency_key, request_fingerprint, reg_type, category_code, distance_km,
           team_name, contact_name, contact_phone, contact_phone_norm, emergency_name, emergency_phone, note, consent_at,
           member_count, fee_base, fee_base_members, fee_extra_each, fee_extra_count, total_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),$15,$16,$17,$18,$19,$20) RETURNING id`,
        [reference, sec.hashAccessCode(accessCode), key, fingerprint, v.type, v.category, v.distanceKm, v.teamName, v.contactName,
          v.contactPhone, v.contactPhoneNorm, v.emergencyName, v.emergencyPhone, v.note, v.members.length,
          v.fee.base, v.fee.baseMembers, v.fee.extraEach, v.fee.extraCount, v.fee.total]);
      const id = ins.rows[0].id;
      for (let i = 0; i < v.members.length; i++) {
        const m = v.members[i];
        await c.query('INSERT INTO participants (registration_id, position, full_name, gender, dob, shirt_size) VALUES ($1,$2,$3,$4,$5,$6)',
          [id, i + 1, m.fullName, m.gender, m.dob, m.shirtSize]);
      }
      return { id, reference, replay: false };
    });

    const settings = await sh.loadSettings(pool);
    const reg = await sh.getRegistrationFull(pool, result.id);
    res.status(result.replay ? 200 : 201).json({
      reference: result.reference,
      accessCode: sec.accessCodeFor(config.appSecret, key),
      replay: result.replay,
      registration: sh.publicRegistrationView(reg, settings),
    });
  });

  async function authRegistration(req) {
    const ref = String(req.get('X-Reg-Ref') || '').trim().toUpperCase();
    const code = req.get('X-Reg-Code') || '';
    const generic = new AppError(404, 'NOT_FOUND', 'ບໍ່ພົບການລົງທະບຽນ ຫຼື ລະຫັດເຂົ້າເບິ່ງບໍ່ຖືກຕ້ອງ');
    if (!/^LNT26-[0-9A-Z]{6}$/.test(ref) || sec.normalizeCode(code).length !== 12) throw generic;
    const q = await pool.query('SELECT id, access_hash FROM registrations WHERE reference=$1', [ref]);
    // Compare even when not found to keep timing similar.
    const stored = q.rowCount ? q.rows[0].access_hash : '0'.repeat(64);
    const ok = sec.safeEqualHex(stored, sec.hashAccessCode(code));
    if (!q.rowCount || !ok) throw generic;
    return q.rows[0].id;
  }

  r.get('/my', limitLookup, async (req, res) => {
    const id = await authRegistration(req);
    const settings = await sh.loadSettings(pool);
    const reg = await sh.getRegistrationFull(pool, id);
    res.set('Cache-Control', 'no-store');
    res.json({ registration: sh.publicRegistrationView(reg, settings) });
  });

  r.post('/my/proof', limitUpload, express.raw({ type: () => true, limit: MAX_UPLOAD }), async (req, res) => {
    const id = await authRegistration(req);
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || !buf.length) throw new AppError(400, 'EMPTY_FILE', 'ບໍ່ພົບໄຟລ໌. ກະລຸນາເລືອກຮູບຫຼັກຖານການໂອນ');
    const type = sec.sniffImage(buf);
    if (!type) throw new AppError(415, 'BAD_FILE_TYPE', 'ຮັບສະເພາະຮູບ JPG, PNG ຫຼື WebP ເທົ່ານັ້ນ');
    await tx(pool, async (c) => {
      const reg = (await c.query('SELECT status, payment_status FROM registrations WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (reg.status !== 'active') throw new AppError(409, 'CANCELLED', 'ການລົງທະບຽນນີ້ຖືກຍົກເລີກແລ້ວ. ກະລຸນາຕິດຕໍ່ຜູ້ຈັດງານ');
      if (reg.payment_status === 'confirmed') throw new AppError(409, 'ALREADY_CONFIRMED', 'ການຈ່າຍເງິນໄດ້ຮັບການຢືນຢັນແລ້ວ ບໍ່ຈຳເປັນຕ້ອງສົ່ງຫຼັກຖານອີກ');
      const n = (await c.query('SELECT count(*)::int AS n FROM payment_proofs WHERE registration_id=$1', [id])).rows[0].n;
      if (n >= MAX_PROOFS) throw new AppError(409, 'TOO_MANY_PROOFS', 'ສົ່ງຫຼັກຖານຄົບຈຳນວນສູງສຸດແລ້ວ. ກະລຸນາຕິດຕໍ່ຜູ້ຈັດງານ');
      await c.query(`UPDATE payment_proofs SET review_status='superseded' WHERE registration_id=$1 AND review_status='pending'`, [id]);
      await c.query('INSERT INTO payment_proofs (registration_id, content_type, byte_size, sha256, data) VALUES ($1,$2,$3,$4,$5)',
        [id, type, buf.length, crypto.createHash('sha256').update(buf).digest('hex'), buf]);
      await c.query(`UPDATE registrations SET payment_status='awaiting_review', updated_at=now() WHERE id=$1`, [id]);
      await c.query(`INSERT INTO payment_events (registration_id, action) VALUES ($1,'proof_uploaded')`, [id]);
    });
    const settings = await sh.loadSettings(pool);
    const reg = await sh.getRegistrationFull(pool, id);
    res.status(201).json({ registration: sh.publicRegistrationView(reg, settings) });
  });

  return r;
};

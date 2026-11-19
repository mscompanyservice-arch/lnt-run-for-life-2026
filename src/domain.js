'use strict';
// Pure business rules: pricing, age, validation. No I/O here.

const GENDERS = ['male', 'female'];
const CATEGORY_CODES = ['general', 'senior', 'family'];
// Distance is fixed per category and enforced again by a DB CHECK constraint.
const CATEGORY_DISTANCE = { general: 10, senior: 5, family: 5 };
const PAYMENT_STATUSES = ['unpaid', 'awaiting_review', 'confirmed', 'rejected'];

class AppError extends Error {
  constructor(status, code, message, extra) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}
const bad = (code, message, extra) => new AppError(400, code, message, extra);

function isSafeInt(n) {
  return Number.isSafeInteger(n) && n >= 0;
}

/**
 * Integer-only fee calculation.
 * total = base_fee + max(0, members - base_members) * extra_fee
 */
function computeFee(category, memberCount) {
  const base = Number(category.base_fee);
  const extraEach = Number(category.extra_fee);
  const baseMembers = Number(category.base_members);
  if (![base, extraEach, baseMembers, memberCount].every(isSafeInt)) {
    throw new AppError(500, 'BAD_PRICE_CONFIG', 'ການຕັ້ງຄ່າລາຄາບໍ່ຖືກຕ້ອງ');
  }
  const extraCount = Math.max(0, memberCount - baseMembers);
  const total = base + extraCount * extraEach;
  if (!isSafeInt(total)) throw new AppError(500, 'BAD_PRICE_CONFIG', 'ການຄຳນວນລາຄາຜິດພາດ');
  return { base, extraEach, extraCount, total, baseMembers };
}

/** Parse strict YYYY-MM-DD into {y,m,d}; returns null if invalid. */
function parseDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** Completed years of age on a given date (calendar arithmetic, no time zones). */
function ageOn(dobStr, onStr) {
  const b = parseDate(dobStr);
  const o = parseDate(onStr);
  if (!b || !o) return null;
  let age = o.y - b.y;
  if (o.m < b.m || (o.m === b.m && o.d < b.d)) age -= 1;
  return age;
}

function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+') && !digits.startsWith('856')) return digits.length >= 8 && digits.length <= 15 ? '+' + digits : null;
  if (digits.startsWith('00856')) digits = digits.slice(5);
  else if (digits.startsWith('856')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length < 8 || digits.length > 11) return null;
  return digits;
}

function cleanText(v, max) {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') return null;
  // strip control chars, collapse whitespace
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > max ? null : s;
}

function normName(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Validate a registration request against current categories/settings.
 * Returns a normalized object. Throws AppError with Lao field messages.
 */
function validateRegistration(body, { categories, settings }) {
  const errors = {};
  const fail = (field, msg) => { if (!errors[field]) errors[field] = msg; };
  if (!body || typeof body !== 'object') throw bad('INVALID', 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ');

  const category = categories.find((c) => c.code === body.category && c.active);
  if (!category) throw bad('INVALID_CATEGORY', 'ກະລຸນາເລືອກລຸ້ນການແຂ່ງຂັນ');
  const isFamily = category.code === 'family';
  const distance = CATEGORY_DISTANCE[category.code];
  if (body.distanceKm !== undefined && Number(body.distanceKm) !== distance) {
    throw bad('DISTANCE_MISMATCH', 'ໄລຍະທາງບໍ່ກົງກັບລຸ້ນທີ່ເລືອກ. ລຸ້ນທົ່ວໄປ 10 KM, ລຸ້ນອາວຸໂສ ແລະ Family 5 KM');
  }

  const shirtSizes = settings.shirtSizes || [];
  const eventDate = settings.eventDate;

  const contactName = cleanText(body.contactName, 120);
  const contactPhoneRaw = cleanText(body.contactPhone, 30);
  const contactPhone = normalizePhone(contactPhoneRaw || '');
  const emergencyName = cleanText(body.emergencyName, 120);
  const emergencyPhoneRaw = cleanText(body.emergencyPhone, 30);
  const emergencyPhone = emergencyPhoneRaw ? normalizePhone(emergencyPhoneRaw) : null;
  const note = cleanText(body.note, 500);
  const teamName = cleanText(body.teamName, 120);

  if (!contactName) fail('contactName', isFamily ? 'ກະລຸນາໃສ່ຊື່ຜູ້ຕິດຕໍ່ຂອງທີມ' : 'ກະລຸນາໃສ່ຊື່ ແລະ ນາມສະກຸນ');
  if (!contactPhone) fail('contactPhone', 'ກະລຸນາໃສ່ເບີ WhatsApp ທີ່ຖືກຕ້ອງ (ຕົວຢ່າງ 020 5555 1234)');
  if (note === null) fail('note', 'ໝາຍເຫດຍາວເກີນ 500 ຕົວອັກສອນ');
  if (!isFamily) {
    if (!emergencyName) fail('emergencyName', 'ກະລຸນາໃສ່ຊື່ຜູ້ຕິດຕໍ່ກໍລະນີສຸກເສີນ');
    if (!emergencyPhone) fail('emergencyPhone', 'ກະລຸນາໃສ່ເບີໂທຜູ້ຕິດຕໍ່ກໍລະນີສຸກເສີນ');
  } else {
    if (!teamName) fail('teamName', 'ກະລຸນາໃສ່ຊື່ທີມ');
    if (emergencyPhoneRaw && !emergencyPhone) fail('emergencyPhone', 'ເບີໂທສຸກເສີນບໍ່ຖືກຕ້ອງ');
  }
  if (body.consent !== true) fail('consent', 'ກະລຸນາຢືນຢັນການຍິນຍອມໃຫ້ໃຊ້ຂໍ້ມູນເພື່ອການຈັດງານ');

  let rawMembers;
  if (isFamily) {
    rawMembers = Array.isArray(body.members) ? body.members : [];
  } else {
    // Individual: the registrant is the single participant.
    const m = Array.isArray(body.members) && body.members[0] ? body.members[0] : {};
    rawMembers = [{ ...m, fullName: m.fullName !== undefined ? m.fullName : body.contactName }];
    if (Array.isArray(body.members) && body.members.length > 1) {
      throw bad('TOO_MANY_MEMBERS', 'ການລົງທະບຽນລາຍບຸກຄົນມີໄດ້ 1 ຄົນເທົ່ານັ້ນ');
    }
  }
  const minM = Number(category.min_members);
  const maxM = Number(category.max_members);
  if (rawMembers.length < minM) {
    throw bad('TOO_FEW_MEMBERS', `ລຸ້ນ Family ຕ້ອງມີຢ່າງໜ້ອຍ ${minM} ຄົນ`, { min: minM });
  }
  if (rawMembers.length > maxM) {
    throw bad('TOO_MANY_MEMBERS', `ມີສະມາຊິກໄດ້ສູງສຸດ ${maxM} ຄົນຕໍ່ການລົງທະບຽນ`, { max: maxM });
  }

  const members = rawMembers.map((m, i) => {
    const p = `members.${i}.`;
    m = m && typeof m === 'object' ? m : {};
    const fullName = cleanText(m.fullName, 120);
    if (!fullName) fail(p + 'fullName', 'ກະລຸນາໃສ່ຊື່ ແລະ ນາມສະກຸນ');
    const gender = GENDERS.includes(m.gender) ? m.gender : null;
    if (!gender) fail(p + 'gender', 'ກະລຸນາເລືອກ ຊາຍ ຫຼື ຍິງ');
    const dob = parseDate(m.dob) ? m.dob : null;
    let age = null;
    if (!dob) fail(p + 'dob', 'ກະລຸນາໃສ່ວັນເດືອນປີເກີດ');
    else {
      age = ageOn(dob, eventDate);
      if (age === null || age < 0 || m.dob < '1900-01-01') fail(p + 'dob', 'ວັນເດືອນປີເກີດບໍ່ຖືກຕ້ອງ');
      else if (category.min_age !== null && category.min_age !== undefined && age < Number(category.min_age)) {
        fail(p + 'dob', `ລຸ້ນອາວຸໂສ ຕ້ອງມີອາຍຸ ${category.min_age} ປີຂຶ້ນໄປ ໃນວັນແຂ່ງຂັນ (${eventDate}). ອາຍຸໃນວັນແຂ່ງ: ${age} ປີ`);
      }
    }
    const shirtSize = shirtSizes.includes(m.shirtSize) ? m.shirtSize : null;
    if (!shirtSize) fail(p + 'shirtSize', 'ກະລຸນາເລືອກຂະໜາດເສື້ອ');
    return { fullName, gender, dob, shirtSize, age };
  });

  if (Object.keys(errors).length) {
    throw bad('VALIDATION', 'ກະລຸນາກວດສອບຂໍ້ມູນທີ່ໝາຍໄວ້', { fields: errors });
  }

  const fee = computeFee(category, members.length);
  // A browser-submitted total is never used; if present and different, treat as tampering.
  if (body.clientTotal !== undefined && body.clientTotal !== null && Number(body.clientTotal) !== fee.total) {
    throw bad('PRICE_MISMATCH', 'ລາຄາບໍ່ກົງກັບລະບົບ. ກະລຸນາໂຫຼດໜ້າໃໝ່ ແລ້ວລອງອີກຄັ້ງ', { serverTotal: fee.total });
  }

  return {
    type: isFamily ? 'family' : 'individual',
    category: category.code,
    distanceKm: distance,
    teamName: isFamily ? teamName : null,
    contactName,
    contactPhone: contactPhoneRaw,
    contactPhoneNorm: contactPhone,
    emergencyName: emergencyName || null,
    emergencyPhone: emergencyPhoneRaw || null,
    note: note || null,
    members,
    fee,
  };
}

const REF_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

module.exports = {
  AppError, bad, GENDERS, CATEGORY_CODES, CATEGORY_DISTANCE, PAYMENT_STATUSES,
  computeFee, parseDate, ageOn, normalizePhone, cleanText, normName, validateRegistration, REF_ALPHABET,
};

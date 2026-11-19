'use strict';
// Helpers shared by public and admin APIs.
const { AppError } = require('./domain');

const PAYMENT_LABELS = {
  unpaid: 'ຍັງບໍ່ໄດ້ຈ່າຍ',
  awaiting_review: 'ລໍຖ້າກວດສອບການຈ່າຍ',
  confirmed: 'ຢືນຢັນການຈ່າຍແລ້ວ',
  rejected: 'ຫຼັກຖານບໍ່ຜ່ານ — ກະລຸນາສົ່ງໃໝ່',
};
const GENDER_LABELS = { male: 'ຊາຍ', female: 'ຍິງ' };
const STATUS_LABELS = { active: 'ປົກກະຕິ', cancelled: 'ຍົກເລີກແລ້ວ' };

async function loadSettings(db, { lock = false } = {}) {
  const r = await db.query(`SELECT data FROM settings WHERE id=1${lock ? ' FOR UPDATE' : ''}`);
  if (!r.rowCount) throw new AppError(500, 'NO_SETTINGS', 'ລະບົບຍັງບໍ່ໄດ້ຕັ້ງຄ່າ');
  return r.rows[0].data;
}
async function loadCategories(db) {
  return (await db.query('SELECT * FROM categories ORDER BY sort_order')).rows;
}

/** Parse 'YYYY-MM-DDTHH:mm' as Asia/Vientiane local time (UTC+7, no DST). */
function vientianeToDate(local) {
  if (!local) return null;
  const t = Date.parse(`${local}:00+07:00`);
  return Number.isNaN(t) ? null : new Date(t);
}
function fmtVientiane(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('sv-SE', { timeZone: 'Asia/Vientiane', hour12: false }).slice(0, 16);
}

async function activeParticipantCount(db) {
  const r = await db.query(`SELECT count(*)::int AS n FROM participants p JOIN registrations r ON r.id=p.registration_id WHERE r.status='active'`);
  return r.rows[0].n;
}

/** Whether new registrations are accepted right now. Capacity counts participants in non-cancelled registrations. */
function openState(settings, used, now = new Date()) {
  if (!settings.registrationOpen) return { open: false, reason: 'ປິດຮັບລົງທະບຽນແລ້ວ' };
  const deadline = vientianeToDate(settings.registrationDeadline);
  if (deadline && now > deadline) return { open: false, reason: 'ໝົດເວລາລົງທະບຽນແລ້ວ' };
  const eventEnd = vientianeToDate(`${settings.eventDate}T23:59`);
  if (eventEnd && now > eventEnd) return { open: false, reason: 'ງານແລ່ນໄດ້ຈັດຂຶ້ນແລ້ວ' };
  const capacity = settings.capacity ? Number(settings.capacity) : null;
  const remaining = capacity ? Math.max(0, capacity - used) : null;
  if (capacity && remaining <= 0) return { open: false, reason: 'ບ່ອນວ່າງເຕັມແລ້ວ', remaining: 0, capacity };
  return { open: true, remaining, capacity };
}

async function getRegistrationFull(db, id) {
  const r = await db.query(
    `SELECT r.*, c.name_lo AS category_name, s.display_name AS confirmed_by_name
       FROM registrations r JOIN categories c ON c.code=r.category_code
       LEFT JOIN staff s ON s.id=r.confirmed_by WHERE r.id=$1`, [id]);
  if (!r.rowCount) return null;
  const reg = r.rows[0];
  reg.participants = (await db.query('SELECT * FROM participants WHERE registration_id=$1 ORDER BY position', [id])).rows;
  reg.proofs = (await db.query(
    'SELECT id, content_type, byte_size, review_status, uploaded_at, reviewed_at FROM payment_proofs WHERE registration_id=$1 ORDER BY uploaded_at DESC', [id])).rows;
  return reg;
}

function feeView(reg) {
  return {
    base: reg.fee_base, baseMembers: reg.fee_base_members, extraEach: reg.fee_extra_each,
    extraCount: reg.fee_extra_count, total: reg.total_amount,
  };
}

/** Participant-facing view: no internal staff data. */
function publicRegistrationView(reg, settings) {
  return {
    reference: reg.reference,
    type: reg.reg_type,
    category: reg.category_code,
    categoryName: reg.category_name,
    distanceKm: reg.distance_km,
    teamName: reg.team_name,
    contactName: reg.contact_name,
    contactPhone: reg.contact_phone,
    emergencyName: reg.emergency_name,
    emergencyPhone: reg.emergency_phone,
    note: reg.note,
    memberCount: reg.member_count,
    fee: feeView(reg),
    paymentStatus: reg.payment_status,
    paymentStatusLabel: PAYMENT_LABELS[reg.payment_status],
    paymentNote: reg.payment_status === 'rejected' ? reg.payment_note : null,
    status: reg.status,
    createdAt: reg.created_at,
    canUploadProof: reg.status === 'active' && reg.payment_status !== 'confirmed',
    proofs: reg.proofs.map((p) => ({ uploadedAt: p.uploaded_at, reviewStatus: p.review_status })),
    participants: reg.participants.map((p) => ({
      position: p.position, fullName: p.full_name, gender: p.gender, dob: p.dob, shirtSize: p.shirt_size,
      bib: p.bib, kitCollected: !!p.kit_collected_at, checkedIn: !!p.checked_in_at,
    })),
    payment: paymentInfo(settings),
  };
}

function paymentInfo(s) {
  const configured = !!(s.bankName && s.bankAccountName && s.bankAccountNumber) || !!s.paymentQrAssetId;
  return {
    configured,
    bankName: s.bankName || null,
    accountName: s.bankAccountName || null,
    accountNumber: s.bankAccountNumber || null,
    qrUrl: s.paymentQrAssetId ? `/assets/${s.paymentQrAssetId}` : null,
  };
}

async function audit(db, staffId, action, entityType, entityId, details = {}) {
  await db.query('INSERT INTO audit_log (staff_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
    [staffId, action, entityType, entityId === null || entityId === undefined ? null : String(entityId), details]);
}

module.exports = {
  PAYMENT_LABELS, GENDER_LABELS, STATUS_LABELS, loadSettings, loadCategories, vientianeToDate, fmtVientiane,
  activeParticipantCount, openState, getRegistrationFull, publicRegistrationView, paymentInfo, feeView, audit,
};

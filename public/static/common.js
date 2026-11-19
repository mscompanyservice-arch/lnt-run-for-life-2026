'use strict';
/* Shared helpers for public pages and admin. No external libraries. */
(function () {
  const MONTHS = ['ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ', 'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'];
  const NET_ERR = 'ເຊື່ອມຕໍ່ອິນເຕີເນັດບໍ່ໄດ້ ຫຼື ຊ້າເກີນໄປ. ຂໍ້ມູນຂອງທ່ານຍັງຢູ່ — ກະລຸນາກວດອິນເຕີເນັດ ແລ້ວກົດລອງໃໝ່';

  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const lak = (n) => String(Math.trunc(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ກີບ';
  function laoDate(s) {
    if (!s) return '';
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  }
  function laoDateTime(iso) {
    if (!iso) return '';
    const s = new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Vientiane', hour12: false });
    return `${laoDate(s.slice(0, 10))} ${s.slice(11, 16)}`;
  }
  function ageOn(dob, on) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob || '') || !on) return null;
    const [by, bm, bd] = dob.split('-').map(Number);
    const [oy, om, od] = on.split('-').map(Number);
    let a = oy - by;
    if (om < bm || (om === bm && od < bd)) a -= 1;
    return a;
  }
  function fee(cat, n) {
    const extraCount = Math.max(0, n - cat.baseMembers);
    return { base: cat.baseFee, extraEach: cat.extraFee, extraCount, total: cat.baseFee + extraCount * cat.extraFee };
  }

  class ApiError extends Error {
    constructor(message, status, data) { super(message); this.status = status; this.data = data || {}; }
  }
  async function api(path, opts = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeout || 30000);
    const headers = Object.assign({}, opts.headers || {});
    let body = opts.body;
    if (body !== undefined && !(body instanceof Blob) && typeof body !== 'string') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(path, { method: opts.method || 'GET', headers, body, signal: ctrl.signal, credentials: 'same-origin', cache: 'no-store' });
    } catch (e) {
      throw new ApiError(NET_ERR, 0);
    } finally { clearTimeout(timer); }
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json().catch(() => ({})) : {};
    if (!res.ok) throw new ApiError(data.message || `ເກີດຂໍ້ຜິດພາດ (${res.status}). ກະລຸນາລອງໃໝ່`, res.status, data);
    return data;
  }

  /** Upload a file with progress (useful on slow mobile connections). */
  function upload(path, file, headers, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', path);
      xhr.timeout = 180000;
      Object.entries(headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      xhr.onload = () => {
        let data = {};
        try { data = JSON.parse(xhr.responseText); } catch (_) { /* ignore */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new ApiError(data.message || `ອັບໂຫຼດບໍ່ສຳເລັດ (${xhr.status}). ກະລຸນາລອງໃໝ່`, xhr.status, data));
      };
      xhr.onerror = () => reject(new ApiError('ອັບໂຫຼດບໍ່ສຳເລັດ ເພາະການເຊື່ອມຕໍ່ຂາດ. ຮູບຍັງຖືກເລືອກຢູ່ — ກົດລອງໃໝ່ໄດ້', 0));
      xhr.ontimeout = () => reject(new ApiError('ອັບໂຫຼດຊ້າເກີນໄປ. ລອງໃຊ້ Wi-Fi ຫຼື ຮູບທີ່ນ້ອຍກວ່າ ແລ້ວລອງໃໝ່', 0));
      xhr.send(file);
    });
  }

  const PAY = {
    unpaid: 'ຍັງບໍ່ໄດ້ຈ່າຍ', awaiting_review: 'ລໍຖ້າກວດສອບການຈ່າຍ', confirmed: 'ຢືນຢັນການຈ່າຍແລ້ວ', rejected: 'ຫຼັກຖານບໍ່ຜ່ານ — ກະລຸນາສົ່ງໃໝ່',
  };
  const GENDER = { male: 'ຊາຍ', female: 'ຍິງ' };
  const CAT = { general: 'ລຸ້ນທົ່ວໄປ', senior: 'ລຸ້ນ Masters', family: 'ລຸ້ນ Family' };
  const payBadge = (s) => `<span class="badge b-${esc(s)}">${esc(PAY[s] || s)}</span>`;

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) { /* ignore */ }
      ta.remove(); return ok;
    }
  }
  function toast(msg, isErr) {
    const t = document.createElement('div');
    t.className = 'toast' + (isErr ? ' err' : '');
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), isErr ? 6000 : 2600);
  }
  function waLink(num) {
    const d = String(num || '').replace(/\D/g, '');
    if (!d) return null;
    const intl = d.startsWith('856') ? d : '856' + d.replace(/^0/, '');
    return 'https://wa.me/' + intl;
  }
  function uuid() {
    const b = new Uint8Array(18);
    crypto.getRandomValues(b);
    return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  }

  window.LNT = { esc, lak, laoDate, laoDateTime, ageOn, fee, api, upload, ApiError, PAY, GENDER, CAT, payBadge, copyText, toast, waLink, uuid, NET_ERR };
})();

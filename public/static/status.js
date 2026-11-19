'use strict';
(function () {
  const L = window.LNT;
  const { esc, lak, laoDate, laoDateTime, api, GENDER, payBadge, copyText, toast } = L;
  const app = document.getElementById('app');
  const MAX = 5 * 1024 * 1024;
  const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  let ref = '';
  let code = '';
  let isNew = false;
  let reg = null;
  let pendingFile = null;

  function readHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    ref = (h.get('r') || '').toUpperCase();
    code = h.get('c') || '';
    isNew = h.get('new') === '1';
  }
  const privateLink = () => `${location.origin}/status#r=${encodeURIComponent(ref)}&c=${encodeURIComponent(code)}`;
  const authHeaders = () => ({ 'X-Reg-Ref': ref, 'X-Reg-Code': code });

  function renderLookup(err) {
    app.innerHTML = `<h1>ກວດສະຖານະການລົງທະບຽນ</h1>
      ${err ? `<div class="alert err">${esc(err)}</div>` : ''}
      <div class="card"><p>ໃສ່ລະຫັດລົງທະບຽນ ແລະ ລະຫັດເຂົ້າເບິ່ງ ທີ່ໄດ້ຮັບຫຼັງລົງທະບຽນ. ຫຼື ເປີດລິ້ງສ່ວນຕົວທີ່ທ່ານບັນທຶກໄວ້.</p>
      <form id="lookup" novalidate>
        <label for="lr" class="req">ລະຫັດລົງທະບຽນ</label><input id="lr" type="text" placeholder="LNT26-XXXXXX" autocapitalize="characters" value="${esc(ref)}" maxlength="20">
        <label for="lc" class="req">ລະຫັດເຂົ້າເບິ່ງ</label><input id="lc" type="text" placeholder="XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off" maxlength="20">
        <div class="btn-row"><button class="btn block" type="submit">ເບິ່ງສະຖານະ</button></div>
      </form>
      <p class="small muted">ເຮັດລະຫັດເສຍ? ກະລຸນາຕິດຕໍ່ຜູ້ຈັດງານ ເພື່ອຢືນຢັນຕົວຕົນ ແລະ ຂໍລະຫັດໃໝ່. ເບີໂທຢ່າງດຽວ ບໍ່ສາມາດໃຊ້ເຂົ້າເບິ່ງຂໍ້ມູນໄດ້.</p></div>`;
    document.getElementById('lookup').addEventListener('submit', (e) => {
      e.preventDefault();
      ref = document.getElementById('lr').value.trim().toUpperCase();
      code = document.getElementById('lc').value.trim().toUpperCase();
      if (!ref || !code) { renderLookup('ກະລຸນາໃສ່ທັງສອງລະຫັດ'); return; }
      history.replaceState(null, '', `#r=${encodeURIComponent(ref)}&c=${encodeURIComponent(code)}`);
      load();
    });
  }

  async function load() {
    app.innerHTML = '<div class="loading">ກຳລັງໂຫຼດ…</div>';
    try {
      reg = (await api('/api/public/my', { headers: authHeaders() })).registration;
      render();
    } catch (e) {
      if (e.status === 404 || e.status === 429) renderLookup(e.message);
      else app.innerHTML = `<div class="alert err">${esc(e.message)}</div><button class="btn" id="retry">ລອງໃໝ່</button>`;
      const r = document.getElementById('retry'); if (r) r.onclick = load;
    }
  }

  function summaryText() {
    const lines = [
      'LNT RUN FOR LIFE 2026',
      `ລະຫັດລົງທະບຽນ: ${reg.reference}`,
      `ລະຫັດເຂົ້າເບິ່ງ: ${code}`,
      `ລຸ້ນ: ${reg.categoryName} ${reg.distanceKm} KM`,
      reg.teamName ? `ທີມ: ${reg.teamName}` : null,
      `ຜູ້ເຂົ້າຮ່ວມ: ${reg.participants.map((p) => p.fullName).join(', ')}`,
      `ຍອດຕ້ອງຈ່າຍ: ${lak(reg.fee.total)}`,
      `ສະຖານະການຈ່າຍ: ${L.PAY[reg.paymentStatus]}`,
      `ລິ້ງສ່ວນຕົວ: ${privateLink()}`,
    ];
    return lines.filter(Boolean).join('\n');
  }

  function render() {
    const paid = reg.paymentStatus === 'confirmed';
    const cancelled = reg.status === 'cancelled';
    let banner;
    if (cancelled) banner = '<div class="alert err"><h3>ການລົງທະບຽນນີ້ຖືກຍົກເລີກແລ້ວ</h3><p>ກະລຸນາຕິດຕໍ່ຜູ້ຈັດງານ ຖ້າມີຄຳຖາມ.</p></div>';
    else if (paid) banner = '<div class="alert ok"><h3>✅ ຢືນຢັນການຈ່າຍເງິນແລ້ວ</h3><p>ການລົງທະບຽນຂອງທ່ານສົມບູນ.</p></div>';
    else if (reg.paymentStatus === 'awaiting_review') banner = '<div class="alert warn"><h3>⏳ ໄດ້ຮັບຫຼັກຖານແລ້ວ — ລໍຖ້າພະນັກງານກວດສອບ</h3><p>ການຈ່າຍເງິນ <b>ຍັງບໍ່ທັນຖືກຢືນຢັນ</b>. ກະລຸນາກວດສະຖານະອີກຄັ້ງພາຍຫຼັງ.</p></div>';
    else if (reg.paymentStatus === 'rejected') banner = `<div class="alert err"><h3>ຫຼັກຖານການຈ່າຍບໍ່ຜ່ານການກວດສອບ</h3>${reg.paymentNote ? `<p>ເຫດຜົນ: ${esc(reg.paymentNote)}</p>` : ''}<p>ກະລຸນາອັບໂຫຼດຫຼັກຖານໃໝ່ ຫຼື ຕິດຕໍ່ຜູ້ຈັດງານ.</p></div>`;
    else banner = `<div class="alert info"><h3>📝 ບັນທຶກການລົງທະບຽນແລ້ວ — ຍັງບໍ່ໄດ້ຈ່າຍເງິນ</h3><p>ກະລຸນາໂອນເງິນ <b>${lak(reg.fee.total)}</b> ແລ້ວອັບໂຫຼດຮູບຫຼັກຖານຢູ່ລຸ່ມນີ້.</p></div>`;

    const saveBox = `<div class="card ${isNew ? '' : 'no-print'}">
      ${isNew ? '<h2>🎉 ລົງທະບຽນສຳເລັດ</h2><p><b>ກະລຸນາບັນທຶກຂໍ້ມູນລຸ່ມນີ້ໄວ້.</b> ທ່ານຕ້ອງໃຊ້ມັນເພື່ອກວດສະຖານະ ແລະ ອັບໂຫຼດຫຼັກຖານການຈ່າຍ.</p>' : '<h2>ລະຫັດຂອງທ່ານ</h2>'}
      <dl class="kv"><dt>ລະຫັດລົງທະບຽນ</dt><dd><span class="codebox">${esc(reg.reference)}</span></dd>
      <dt>ລະຫັດເຂົ້າເບິ່ງ</dt><dd><span class="codebox">${esc(code)}</span></dd></dl>
      <p class="small muted">ລິ້ງສ່ວນຕົວ (ຢ່າແບ່ງປັນໃຫ້ຄົນອື່ນ):</p><div class="linkbox">${esc(privateLink())}</div>
      <div class="btn-row no-print"><button class="btn small" id="copyLink">ສຳເນົາລິ້ງ</button>
      <button class="btn small secondary" id="copyAll">ສຳເນົາຂໍ້ມູນທັງໝົດ</button>
      <button class="btn small secondary" id="printBtn">ພິມ / ບັນທຶກ PDF</button></div>
      <p class="small muted">ແນະນຳ: ສົ່ງຂໍ້ມູນນີ້ເຂົ້າ WhatsApp ຂອງຕົນເອງ ຫຼື ຖ່າຍຮູບໜ້າຈໍໄວ້.</p></div>`;

    const f = reg.fee;
    const feeRows = reg.type === 'family'
      ? `<tr><td>${f.baseMembers} ຄົນທຳອິດ (ລາຄາທີມ)</td><td>${lak(f.base)}</td></tr><tr><td>ຄົນເພີ່ມ ${f.extraCount} × ${lak(f.extraEach)}</td><td>${lak(f.extraCount * f.extraEach)}</td></tr>`
      : `<tr><td>${esc(reg.categoryName)} 1 ຄົນ</td><td>${lak(f.base)}</td></tr>`;

    const yesNo = (v, yes, no) => (v ? `<span class="badge b-yes">${yes}</span>` : `<span class="badge b-no">${no}</span>`);
    const members = `<div class="card"><h2>${reg.type === 'family' ? `ສະມາຊິກ ${reg.memberCount} ຄົນ` : 'ຜູ້ແລ່ນ'}</h2>
      ${reg.participants.map((p) => `<div class="pcard"><div class="pname">${p.position}. ${esc(p.fullName)}</div>
        <div class="pmeta">${GENDER[p.gender]} · ເກີດ ${laoDate(p.dob)} · ເສື້ອ ${esc(p.shirtSize)}</div>
        <div class="pbadges">${p.bib ? `<span class="badge b-confirmed">BIB ${esc(p.bib)}</span>` : '<span class="badge b-no">BIB: ຍັງບໍ່ອອກ</span>'}
        ${yesNo(p.kitCollected, 'ຮັບເຄື່ອງແລ້ວ', 'ຍັງບໍ່ຮັບເຄື່ອງ')} ${yesNo(p.checkedIn, 'ເຊັກອິນແລ້ວ', 'ຍັງບໍ່ເຊັກອິນ')}</div></div>`).join('')}</div>`;

    let pay = '';
    if (reg.canUploadProof) {
      const p = reg.payment;
      const bank = p.configured
        ? `<dl class="kv">${p.bankName ? `<dt>ທະນາຄານ</dt><dd>${esc(p.bankName)}</dd>` : ''}${p.accountName ? `<dt>ຊື່ບັນຊີ</dt><dd>${esc(p.accountName)}</dd>` : ''}
           ${p.accountNumber ? `<dt>ເລກບັນຊີ</dt><dd><span class="codebox">${esc(p.accountNumber)}</span> <button class="btn small ghost no-print" id="copyAcc">ສຳເນົາ</button></dd>` : ''}
           <dt>ຍອດທີ່ຕ້ອງໂອນ</dt><dd>${lak(reg.fee.total)}</dd><dt>ໝາຍເຫດການໂອນ</dt><dd>${esc(reg.reference)}</dd></dl>
           ${p.qrUrl ? `<p><img class="qr" src="${esc(p.qrUrl)}" alt="QR ສຳລັບໂອນເງິນ"></p>` : ''}`
        : '<div class="alert warn">ຂໍ້ມູນບັນຊີສຳລັບໂອນເງິນ ກຳລັງຈະແຈ້ງໃຫ້ຊາບ. ການລົງທະບຽນຂອງທ່ານຖືກບັນທຶກແລ້ວ. ກະລຸນາກັບມາໜ້ານີ້ພາຍຫຼັງ ຜ່ານລິ້ງສ່ວນຕົວ.</div>';
      pay = `<div class="card no-print"><h2>ການຈ່າຍເງິນ</h2>${bank}
        <p class="small muted">ລະບົບນີ້ບໍ່ໄດ້ເຊື່ອມກັບທະນາຄານອັດຕະໂນມັດ. ຫຼັງອັບໂຫຼດ ພະນັກງານຈະກວດ ແລະ ຢືນຢັນ.</p>
        <h3>${reg.proofs.length ? 'ອັບໂຫຼດຫຼັກຖານໃໝ່' : 'ອັບໂຫຼດຫຼັກຖານການໂອນ'}</h3>
        <input type="file" id="proofFile" class="visually-hidden" accept="image/jpeg,image/png,image/webp">
        <label for="proofFile" class="btn secondary">📷 ເລືອກຮູບຫຼັກຖານ</label>
        <div class="file-name" id="fileName"></div>
        <div class="hint">ຮູບ JPG, PNG ຫຼື WebP ບໍ່ເກີນ 5 MB</div>
        <div id="upMsg"></div><div class="progress" id="upProg" hidden><div></div></div>
        <div class="btn-row"><button class="btn" id="upBtn" disabled>ອັບໂຫຼດຫຼັກຖານ</button></div>
        ${reg.proofs.length ? `<p class="small muted">ສົ່ງແລ້ວ ${reg.proofs.length} ຄັ້ງ. ຫຼ້າສຸດ: ${laoDateTime(reg.proofs[0].uploadedAt)}</p>` : ''}</div>`;
    }

    app.innerHTML = `<h1>ສະຖານະການລົງທະບຽນ</h1>${banner}${saveBox}
      <div class="card"><h2>${esc(reg.categoryName)} · ${reg.distanceKm} KM</h2><dl class="kv">
        ${reg.teamName ? `<dt>ທີມ</dt><dd>${esc(reg.teamName)}</dd>` : ''}<dt>ຜູ້ຕິດຕໍ່</dt><dd>${esc(reg.contactName)}</dd>
        <dt>ເບີ WhatsApp</dt><dd>${esc(reg.contactPhone)}</dd>
        ${reg.emergencyName ? `<dt>ຜູ້ຕິດຕໍ່ສຸກເສີນ</dt><dd>${esc(reg.emergencyName)} ${esc(reg.emergencyPhone || '')}</dd>` : ''}
        <dt>ສະຖານະການຈ່າຍ</dt><dd>${payBadge(reg.paymentStatus)}</dd><dt>ລົງທະບຽນເມື່ອ</dt><dd>${laoDateTime(reg.createdAt)}</dd></dl>
        <table class="fee-table">${feeRows}<tr class="total"><td>ລວມ</td><td>${lak(f.total)}</td></tr></table></div>
      ${pay}${members}
      <div class="btn-row no-print"><button class="btn secondary" id="refresh">ໂຫຼດສະຖານະຄືນໃໝ່</button></div>`;
    bind();
  }

  function bind() {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    on('copyLink', async () => toast((await copyText(privateLink())) ? 'ສຳເນົາລິ້ງແລ້ວ' : 'ສຳເນົາບໍ່ໄດ້ — ກະລຸນາກົດຄ້າງເພື່ອສຳເນົາ', false));
    on('copyAll', async () => toast((await copyText(summaryText())) ? 'ສຳເນົາຂໍ້ມູນແລ້ວ' : 'ສຳເນົາບໍ່ໄດ້', false));
    on('copyAcc', async () => toast((await copyText(reg.payment.accountNumber)) ? 'ສຳເນົາເລກບັນຊີແລ້ວ' : 'ສຳເນົາບໍ່ໄດ້', false));
    on('printBtn', () => window.print());
    on('refresh', load);
    const fileIn = document.getElementById('proofFile');
    if (!fileIn) return;
    const upMsg = document.getElementById('upMsg');
    const upBtn = document.getElementById('upBtn');
    const show = (html, kind) => { upMsg.innerHTML = html ? `<div class="alert ${kind}">${html}</div>` : ''; };
    fileIn.addEventListener('change', () => {
      const f = fileIn.files[0];
      pendingFile = null; upBtn.disabled = true; show('');
      document.getElementById('fileName').textContent = f ? f.name : '';
      if (!f) return;
      if (f.size > MAX) return show(`ໄຟລ໌ໃຫຍ່ເກີນ 5 MB (${(f.size / 1048576).toFixed(1)} MB). ກະລຸນາຖ່າຍໜ້າຈໍ ຫຼື ເລືອກຮູບທີ່ນ້ອຍກວ່າ`, 'err');
      if (!TYPES.includes(f.type)) return show('ຮັບສະເພາະຮູບ JPG, PNG ຫຼື WebP', 'err');
      pendingFile = f; upBtn.disabled = false;
    });
    upBtn.addEventListener('click', async () => {
      if (!pendingFile) return;
      upBtn.disabled = true; fileIn.disabled = true;
      upBtn.innerHTML = '<span class="spinner"></span> ກຳລັງອັບໂຫຼດ…';
      const prog = document.getElementById('upProg');
      prog.hidden = false;
      try {
        const res = await L.upload('/api/public/my/proof', pendingFile, authHeaders(), (x) => { prog.firstElementChild.style.width = `${Math.round(x * 100)}%`; });
        reg = res.registration; pendingFile = null;
        render();
        toast('ອັບໂຫຼດສຳເລັດ — ລໍຖ້າພະນັກງານກວດສອບ');
      } catch (e) {
        show(esc(e.message), 'err');
        upBtn.disabled = false; fileIn.disabled = false; upBtn.textContent = 'ລອງອັບໂຫຼດອີກຄັ້ງ';
        prog.hidden = true;
      }
    });
  }

  window.addEventListener('hashchange', () => { readHash(); if (ref && code) load(); });
  readHash();
  if (ref && code) load(); else renderLookup();
})();

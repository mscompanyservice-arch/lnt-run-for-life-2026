'use strict';
(function () {
  const L = window.LNT;
  const { esc, lak, laoDate, api, ageOn, fee, GENDER } = L;
  const app = document.getElementById('app');
  const msg = document.getElementById('globalMsg');
  const DRAFT = 'lnt-draft-v1';
  const SUBMIT = 'lnt-submit-v1';
  const MONTHS = ['ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ', 'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'];

  let cfg = null;
  let errors = {};
  let submitting = false;
  const blankMember = () => ({ fullName: '', gender: '', dob: '', shirtSize: '' });
  let state = load() || { category: '', teamName: '', contactName: '', contactPhone: '', emergencyName: '', emergencyPhone: '', note: '', consent: false, members: [blankMember()] };

  function load() { try { return JSON.parse(sessionStorage.getItem(DRAFT)); } catch (_) { return null; } }
  function save() { try { sessionStorage.setItem(DRAFT, JSON.stringify(state)); } catch (_) { /* private mode */ } }
  const cat = () => cfg.categories.find((c) => c.code === state.category);
  const isFamily = () => state.category === 'family';

  function showMsg(html, kind) {
    msg.innerHTML = html ? `<div class="alert ${kind || 'err'}">${html}</div>` : '';
    if (html) msg.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- form rendering ----------
  const errHtml = (k) => (errors[k] ? `<div class="field-error" data-err="${k}">${esc(errors[k])}</div>` : '');
  const inv = (k) => (errors[k] ? ' invalid' : '');
  function input(key, label, opts = {}) {
    const v = getPath(key);
    return `<label for="f-${key}" class="${opts.req ? 'req' : ''}">${label}</label>
      <input id="f-${key}" data-k="${key}" type="${opts.type || 'text'}" value="${esc(v)}" ${opts.attrs || ''} class="${inv(key)}" autocomplete="${opts.ac || 'off'}">
      ${opts.hint ? `<div class="hint">${opts.hint}</div>` : ''}${errHtml(key)}`;
  }
  function getPath(k) { return k.split('.').reduce((o, p) => (o ? o[p] : ''), state) ?? ''; }
  function setPath(k, v) {
    const parts = k.split('.');
    let o = state;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = v;
  }

  function dobPicker(i) {
    const key = `members.${i}.dob`;
    const [y, m, d] = (state.members[i].dob || '--').split('-');
    const evYear = Number(cfg.eventDate.slice(0, 4));
    const years = []; for (let yy = evYear; yy >= 1920; yy--) years.push(yy);
    const sel = (part, options, cur, aria) => `<select data-dob="${i}" data-part="${part}" aria-label="${aria}" class="${inv(key)}">
      <option value="">${aria}</option>${options.map(([val, lab]) => `<option value="${val}" ${String(val) === String(cur) ? 'selected' : ''}>${lab}</option>`).join('')}</select>`;
    const days = Array.from({ length: 31 }, (_, k) => [String(k + 1).padStart(2, '0'), k + 1]);
    const months = MONTHS.map((n, k) => [String(k + 1).padStart(2, '0'), n]);
    let ageNote = '';
    const age = ageOn(state.members[i].dob, cfg.eventDate);
    if (age !== null && age >= 0) {
      const c = cat();
      const okAge = !c || !c.minAge || age >= c.minAge;
      const groups = (c && c.ageGroups) || [];
      const grp = okAge && groups.length > 1 ? (age <= 34 ? groups[0] : groups[groups.length - 1]) : '';
      ageNote = `<div class="hint">ອາຍຸໃນວັນແຂ່ງຂັນ (${laoDate(cfg.eventDate)}): <b>${age} ປີ</b>${grp ? ` · ກຸ່ມລາງວັນ: <b>${esc(grp)}</b>` : ''}${okAge ? '' : ` — <span class="field-error">ບໍ່ເຖິງ ${c.minAge} ປີ ສຳລັບ${esc(c.name)}</span>`}</div>`;
    }
    return `<label class="req">ວັນເດືອນປີເກີດ</label>
      <div class="choice dob-grid">${sel('d', days, d, 'ວັນ')}${sel('m', months, m, 'ເດືອນ')}${sel('y', years.map((yy) => [yy, yy]), y, 'ປີ')}</div>
      ${ageNote}${errHtml(key)}`;
  }
  function genderPicker(i) {
    const key = `members.${i}.gender`;
    const g = state.members[i].gender;
    return `<label class="req">ເພດ (ປະເພດການແຂ່ງຂັນ)</label><div class="choice">
      ${['male', 'female'].map((x) => `<label class="${g === x ? 'selected' : ''}"><input type="radio" name="g${i}" data-k="${key}" value="${x}" ${g === x ? 'checked' : ''}> ${GENDER[x]}</label>`).join('')}
      </div>${errHtml(key)}`;
  }
  function shirtPicker(i) {
    const key = `members.${i}.shirtSize`;
    return `<label class="req" for="s${i}">ຂະໜາດເສື້ອ</label><select id="s${i}" data-k="${key}" class="${inv(key)}">
      <option value="">— ເລືອກຂະໜາດ —</option>${cfg.shirtSizes.map((s) => `<option ${state.members[i].shirtSize === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
      </select>${errHtml(key)}`;
  }

  function renderForm() {
    if (!cfg.registration.open) {
      app.innerHTML = `<div class="alert warn"><h3>${esc(cfg.registration.reason)}</h3><p>ກະລຸນາຕິດຕໍ່ຜູ້ຈັດງານ ຖ້າມີຄຳຖາມ.</p></div>`;
      return;
    }
    const c = cat();
    let h = `<div class="card"><h2>1. ເລືອກລຸ້ນ</h2><div class="cat-options">${cfg.categories.map((x) => `
      <label class="opt ${state.category === x.code ? 'selected' : ''}"><input type="radio" name="category" value="${x.code}" ${state.category === x.code ? 'checked' : ''}>
        <span><b>${esc(x.name)} · ${x.distanceKm} KM</b>
        ${x.code === 'family' ? `${lak(x.baseFee)} / ທີມ ${x.baseMembers} ຄົນ, ເພີ່ມຄົນລະ ${lak(x.extraFee)}` : `${lak(x.baseFee)} / ຄົນ`}
        ${x.minAge ? `<br><span class="small muted">ອາຍຸ ${x.minAge} ປີຂຶ້ນໄປ ໃນວັນແຂ່ງຂັນ</span>` : ''}
        ${(x.ageGroups || []).length > 1 ? `<br><span class="small muted">ລາງວັນແບ່ງກຸ່ມອາຍຸ: ${x.ageGroups.map(esc).join(' / ')}</span>` : ''}</span></label>`).join('')}</div>${errHtml('category')}</div>`;

    if (c) {
      h += `<div class="card"><h2>2. ຂໍ້ມູນ${isFamily() ? 'ທີມ' : 'ຜູ້ແລ່ນ'}</h2>
        <p class="small muted">ໄລຍະທາງ: <b>${c.distanceKm} KM</b> (ກຳນົດຕາມລຸ້ນ)</p>`;
      if (isFamily()) {
        h += input('teamName', 'ຊື່ທີມ', { req: true, attrs: 'maxlength="120"' });
        h += input('contactName', 'ຊື່ຜູ້ຕິດຕໍ່ຂອງທີມ', { req: true, attrs: 'maxlength="120"', ac: 'name' });
        h += input('contactPhone', 'ເບີ WhatsApp ຜູ້ຕິດຕໍ່', { req: true, type: 'tel', attrs: 'inputmode="tel" maxlength="30" placeholder="020 xxxx xxxx"', ac: 'tel' });
        h += input('emergencyName', 'ຜູ້ຕິດຕໍ່ກໍລະນີສຸກເສີນ (ຖ້າມີ)', { attrs: 'maxlength="120"' });
        h += input('emergencyPhone', 'ເບີໂທກໍລະນີສຸກເສີນ (ຖ້າມີ)', { type: 'tel', attrs: 'inputmode="tel" maxlength="30"' });
        h += `</div><div class="card"><h2>3. ສະມາຊິກໃນທີມ (${state.members.length} ຄົນ)</h2>
          <p class="small muted">ຢ່າງໜ້ອຍ ${c.minMembers} ຄົນ. ສະມາຊິກແຕ່ລະຄົນຈະໄດ້ BIB ຂອງຕົນເອງ.</p>`;
        state.members.forEach((m, i) => {
          h += `<div class="member"><div class="member-head"><h3>ສະມາຊິກຄົນທີ ${i + 1}</h3>
            ${state.members.length > c.minMembers ? `<button type="button" class="btn small ghost" data-remove="${i}">ລຶບ</button>` : ''}</div>
            ${input(`members.${i}.fullName`, 'ຊື່ ແລະ ນາມສະກຸນ', { req: true, attrs: 'maxlength="120"' })}
            ${genderPicker(i)}${dobPicker(i)}${shirtPicker(i)}</div>`;
        });
        h += state.members.length < c.maxMembers ? '<button type="button" class="btn secondary block" id="addMember">+ ເພີ່ມສະມາຊິກ</button>' : `<p class="muted">ສູງສຸດ ${c.maxMembers} ຄົນ</p>`;
      } else {
        h += input('contactName', 'ຊື່ ແລະ ນາມສະກຸນ', { req: true, attrs: 'maxlength="120"', ac: 'name' });
        h += genderPicker(0) + dobPicker(0);
        h += input('contactPhone', 'ເບີ WhatsApp', { req: true, type: 'tel', attrs: 'inputmode="tel" maxlength="30" placeholder="020 xxxx xxxx"', ac: 'tel' });
        h += shirtPicker(0);
        h += input('emergencyName', 'ຊື່ຜູ້ຕິດຕໍ່ກໍລະນີສຸກເສີນ', { req: true, attrs: 'maxlength="120"' });
        h += input('emergencyPhone', 'ເບີໂທຜູ້ຕິດຕໍ່ກໍລະນີສຸກເສີນ', { req: true, type: 'tel', attrs: 'inputmode="tel" maxlength="30"' });
      }
      h += `<label for="f-note">ໝາຍເຫດ (ຖ້າມີ)</label><textarea id="f-note" data-k="note" maxlength="500">${esc(state.note)}</textarea>
        <div class="mt"><label class="check"><input type="checkbox" data-k="consent" ${state.consent ? 'checked' : ''}>
        <span>ຂ້ອຍຍິນຍອມໃຫ້ຜູ້ຈັດງານໃຊ້ຂໍ້ມູນທີ່ໃຫ້ໄວ້ນີ້ ເພື່ອການຈັດງານ LNT RUN FOR LIFE 2026 ເທົ່ານັ້ນ (ການລົງທະບຽນ, ການຕິດຕໍ່, ການແຈກເຄື່ອງ ແລະ ຄວາມປອດໄພ).</span></label>${errHtml('consent')}</div>
        </div>
        <div class="feebar" id="feebar"></div>
        <div class="btn-row"><button type="button" class="btn block" id="toReview">ກວດຂໍ້ມູນກ່ອນສົ່ງ</button></div>`;
    }
    app.innerHTML = h;
    renderFee();
  }

  function renderFee() {
    const bar = document.getElementById('feebar');
    const c = cat();
    if (!bar || !c) return;
    const n = isFamily() ? state.members.length : 1;
    const f = fee(c, n);
    bar.innerHTML = isFamily()
      ? `<div class="small">${n} ຄົນ: ${lak(f.base)} (${c.baseMembers} ຄົນທຳອິດ)${f.extraCount ? ` + ${f.extraCount} × ${lak(f.extraEach)}` : ''}</div><div class="total">ລວມ ${lak(f.total)}</div>`
      : `<div class="small">${esc(c.name)} · ${c.distanceKm} KM</div><div class="total">ລວມ ${lak(f.total)}</div>`;
  }

  // ---------- events ----------
  app.addEventListener('input', onChange);
  app.addEventListener('change', onChange);
  function onChange(e) {
    const t = e.target;
    if (t.name === 'category' && e.type === 'change') {
      const prev = state.category;
      state.category = t.value;
      const c = cat();
      if (t.value === 'family' && state.members.length < c.minMembers) {
        while (state.members.length < c.minMembers) state.members.push(blankMember());
      } else if (t.value !== 'family' && prev === 'family') {
        state.members = [state.members[0] || blankMember()];
      }
      errors = {}; save(); renderForm(); return;
    }
    if (t.dataset.dob !== undefined) {
      const i = Number(t.dataset.dob);
      const parts = (state.members[i].dob || '--').split('-');
      const idx = { y: 0, m: 1, d: 2 }[t.dataset.part];
      parts[idx] = t.value;
      state.members[i].dob = parts.join('-');
      if (e.type === 'change') { delete errors[`members.${i}.dob`]; if (!Object.keys(errors).length) showMsg(''); save(); renderForm(); }
      return;
    }
    const k = t.dataset.k;
    if (!k) return;
    setPath(k, t.type === 'checkbox' ? t.checked : t.value);
    if (errors[k]) {
      delete errors[k];
      t.classList.remove('invalid');
      const fe = app.querySelector(`[data-err="${k}"]`);
      if (fe) fe.remove();
      if (!Object.keys(errors).length) showMsg('');
    }
    if ((t.type === 'radio' || t.type === 'checkbox') && e.type === 'change') renderForm();
    save();
  }
  app.addEventListener('click', (e) => {
    const t = e.target;
    if (t.id === 'addMember') { state.members.push(blankMember()); save(); renderForm(); document.querySelectorAll('.member')[state.members.length - 1].scrollIntoView({ behavior: 'smooth' }); }
    else if (t.dataset.remove !== undefined) { state.members.splice(Number(t.dataset.remove), 1); errors = {}; save(); renderForm(); }
    else if (t.id === 'toReview') { if (validate()) renderReview(); }
    else if (t.id === 'backToForm') { showMsg(''); renderForm(); window.scrollTo(0, 0); }
    else if (t.id === 'submitBtn') submit(false);
    else if (t.id === 'ackDup') submit(true);
  });

  // ---------- client validation (server validates again) ----------
  const phoneOk = (p) => String(p || '').replace(/\D/g, '').length >= 8;
  function validDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCDate() === d && dt.getUTCMonth() === m - 1;
  }
  function validate() {
    errors = {};
    const c = cat();
    if (!c) errors.category = 'ກະລຸນາເລືອກລຸ້ນ';
    else {
      const req = (k, m) => { if (!String(getPath(k) || '').trim()) errors[k] = m; };
      req('contactName', isFamily() ? 'ກະລຸນາໃສ່ຊື່ຜູ້ຕິດຕໍ່' : 'ກະລຸນາໃສ່ຊື່ ແລະ ນາມສະກຸນ');
      if (!phoneOk(state.contactPhone)) errors.contactPhone = 'ກະລຸນາໃສ່ເບີ WhatsApp ທີ່ຖືກຕ້ອງ';
      if (isFamily()) req('teamName', 'ກະລຸນາໃສ່ຊື່ທີມ');
      else {
        req('emergencyName', 'ກະລຸນາໃສ່ຊື່ຜູ້ຕິດຕໍ່ກໍລະນີສຸກເສີນ');
        if (!phoneOk(state.emergencyPhone)) errors.emergencyPhone = 'ກະລຸນາໃສ່ເບີໂທສຸກເສີນທີ່ຖືກຕ້ອງ';
      }
      if (isFamily() && state.members.length < c.minMembers) errors.category = `ລຸ້ນ Family ຕ້ອງມີຢ່າງໜ້ອຍ ${c.minMembers} ຄົນ`;
      state.members.forEach((m, i) => {
        if (isFamily() && !m.fullName.trim()) errors[`members.${i}.fullName`] = 'ກະລຸນາໃສ່ຊື່ ແລະ ນາມສະກຸນ';
        if (!m.gender) errors[`members.${i}.gender`] = 'ກະລຸນາເລືອກ ຊາຍ ຫຼື ຍິງ';
        if (!validDate(m.dob)) errors[`members.${i}.dob`] = 'ກະລຸນາເລືອກ ວັນ, ເດືອນ ແລະ ປີເກີດ ໃຫ້ຖືກຕ້ອງ';
        else {
          const a = ageOn(m.dob, cfg.eventDate);
          if (a < 0) errors[`members.${i}.dob`] = 'ວັນເກີດບໍ່ຖືກຕ້ອງ';
          else if (c.minAge && a < c.minAge) errors[`members.${i}.dob`] = `${c.name} ຕ້ອງມີອາຍຸ ${c.minAge} ປີຂຶ້ນໄປ ໃນວັນແຂ່ງຂັນ (ອາຍຸໃນວັນແຂ່ງ: ${a} ປີ)`;
        }
        if (!m.shirtSize) errors[`members.${i}.shirtSize`] = 'ກະລຸນາເລືອກຂະໜາດເສື້ອ';
      });
      if (!state.consent) errors.consent = 'ກະລຸນາຢືນຢັນການຍິນຍອມ';
    }
    if (Object.keys(errors).length) {
      renderForm();
      showMsg(`ກະລຸນາກວດສອບຂໍ້ມູນທີ່ໝາຍສີແດງ (${Object.keys(errors).length} ຈຸດ)`);
      const first = app.querySelector('.invalid, .field-error');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    showMsg('');
    return true;
  }

  // ---------- review ----------
  function payload(ack) {
    const c = cat();
    const members = isFamily() ? state.members : [{ ...state.members[0], fullName: state.contactName }];
    const n = members.length;
    return {
      category: state.category, distanceKm: c.distanceKm, teamName: isFamily() ? state.teamName : undefined,
      contactName: state.contactName, contactPhone: state.contactPhone, emergencyName: state.emergencyName, emergencyPhone: state.emergencyPhone,
      note: state.note, consent: state.consent === true, members, clientTotal: fee(c, n).total, acknowledgeDuplicate: ack === true,
    };
  }
  function renderReview() {
    const c = cat();
    const p = payload();
    const f = fee(c, p.members.length);
    const kv = (k, v) => (v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '');
    app.innerHTML = `<div class="alert info">ກະລຸນາກວດຂໍ້ມູນໃຫ້ຖືກຕ້ອງ ກ່ອນກົດ “ຢືນຢັນ ແລະ ສົ່ງ”. ຍັງແກ້ໄຂໄດ້.</div>
      <div class="card"><h2>${esc(c.name)} · ${c.distanceKm} KM</h2><dl class="kv">
        ${kv('ຊື່ທີມ', p.teamName)}${kv(isFamily() ? 'ຜູ້ຕິດຕໍ່' : 'ຊື່ ແລະ ນາມສະກຸນ', p.contactName)}${kv('ເບີ WhatsApp', p.contactPhone)}
        ${kv('ຜູ້ຕິດຕໍ່ສຸກເສີນ', p.emergencyName)}${kv('ເບີສຸກເສີນ', p.emergencyPhone)}${kv('ໝາຍເຫດ', p.note)}</dl></div>
      <div class="card"><h2>${isFamily() ? `ສະມາຊິກ ${p.members.length} ຄົນ` : 'ຂໍ້ມູນຜູ້ແລ່ນ'}</h2><div class="table-scroll"><table class="list">
        <tr><th>#</th><th>ຊື່</th><th>ເພດ</th><th>ວັນເກີດ</th><th>ອາຍຸໃນວັນແຂ່ງ</th><th>ເສື້ອ</th></tr>
        ${p.members.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.fullName)}</td><td>${GENDER[m.gender]}</td><td>${laoDate(m.dob)}</td><td>${ageOn(m.dob, cfg.eventDate)} ປີ</td><td>${esc(m.shirtSize)}</td></tr>`).join('')}
      </table></div></div>
      <div class="card"><h2>ຄ່າລົງທະບຽນ</h2><table class="fee-table">
        ${isFamily()
          ? `<tr><td>${c.baseMembers} ຄົນທຳອິດ (ລາຄາທີມ)</td><td>${lak(f.base)}</td></tr><tr><td>ຄົນເພີ່ມ ${f.extraCount} × ${lak(f.extraEach)}</td><td>${lak(f.extraCount * f.extraEach)}</td></tr>`
          : `<tr><td>${esc(c.name)} 1 ຄົນ</td><td>${lak(f.base)}</td></tr>`}
        <tr class="total"><td>ລວມທັງໝົດ</td><td>${lak(f.total)}</td></tr></table>
        <p class="small muted">ລາຄາສຸດທ້າຍຄິດໄລ່ ແລະ ກວດສອບໂດຍລະບົບ.</p></div>
      <div id="dupBox"></div>
      <div class="btn-row"><button type="button" class="btn secondary" id="backToForm">← ແກ້ໄຂ</button>
      <button type="button" class="btn" id="submitBtn">ຢືນຢັນ ແລະ ສົ່ງ</button></div>`;
    window.scrollTo(0, 0);
  }

  async function submit(ack) {
    if (submitting) return; // double-click guard
    submitting = true;
    const btns = app.querySelectorAll('#submitBtn, #ackDup, #backToForm');
    btns.forEach((b) => { b.disabled = true; });
    const sb = document.getElementById('submitBtn');
    const label = sb.textContent;
    sb.innerHTML = '<span class="spinner"></span> ກຳລັງສົ່ງ…';
    const body = payload(ack);
    // Same data => same idempotency key, so retries after a timeout can't create a second registration.
    const sig = JSON.stringify({ ...body, acknowledgeDuplicate: undefined });
    let sk = null;
    try { sk = JSON.parse(sessionStorage.getItem(SUBMIT)); } catch (_) { /* ignore */ }
    if (!sk || sk.sig !== sig) { sk = { key: L.uuid(), sig }; try { sessionStorage.setItem(SUBMIT, JSON.stringify(sk)); } catch (_) { /* ignore */ } }
    body.idempotencyKey = sk.key;
    try {
      const res = await api('/api/public/registrations', { method: 'POST', body, timeout: 45000 });
      try { sessionStorage.removeItem(DRAFT); sessionStorage.removeItem(SUBMIT); } catch (_) { /* ignore */ }
      location.href = `/status#r=${encodeURIComponent(res.reference)}&c=${encodeURIComponent(res.accessCode)}&new=1`;
      return;
    } catch (e) {
      submitting = false;
      btns.forEach((b) => { b.disabled = false; });
      sb.textContent = label;
      const d = e.data || {};
      if (d.error === 'POSSIBLE_DUPLICATE') {
        document.getElementById('dupBox').innerHTML = `<div class="alert warn"><h3>ອາດເປັນການລົງທະບຽນຊ້ຳ</h3><p>${esc(e.message)}</p>
          ${d.names && d.names.length ? `<p>ຊື່: <b>${d.names.map(esc).join(', ')}</b></p>` : ''}
          <p class="small">ຖ້າທ່ານເຄີຍລົງທະບຽນແລ້ວ ກະລຸນາໃຊ້ລິ້ງສ່ວນຕົວເກົ່າ ແທນການລົງທະບຽນໃໝ່.</p>
          <button type="button" class="btn" id="ackDup">ຢືນຢັນສົ່ງຕໍ່ (ບໍ່ແມ່ນການລົງທະບຽນຊ້ຳ)</button></div>`;
        document.getElementById('dupBox').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (d.error === 'VALIDATION' && d.fields) { errors = d.fields; renderForm(); showMsg(esc(e.message)); return; }
      if (d.error === 'PRICE_MISMATCH' || d.error === 'INVALID_CATEGORY' || d.error === 'DISTANCE_MISMATCH') {
        cfg = await api('/api/public/config').catch(() => cfg);
      }
      if (d.error === 'TOO_FEW_MEMBERS' || d.error === 'TOO_MANY_MEMBERS') { renderForm(); }
      showMsg(`${esc(e.message)}${e.status === 0 || e.status >= 500 ? ' <br><span class="small">ຂໍ້ມູນທີ່ທ່ານໃສ່ຍັງຢູ່ຄົບ. ກົດ “ຢືນຢັນ ແລະ ສົ່ງ” ອີກຄັ້ງໄດ້ — ລະບົບຈະບໍ່ບັນທຶກຊ້ຳ.</span>' : ''}`);
    }
  }

  // ---------- start ----------
  (async function init() {
    try {
      cfg = await api('/api/public/config');
    } catch (e) {
      app.innerHTML = `<div class="alert err">${esc(e.message)}</div><button class="btn" id="retryLoad">ລອງໃໝ່</button>`;
      document.getElementById('retryLoad').onclick = () => location.reload();
      return;
    }
    const params = new URLSearchParams(location.search);
    if (!state.category && params.get('category') && cfg.categories.some((c) => c.code === params.get('category'))) {
      state.category = params.get('category');
      if (state.category === 'family') while (state.members.length < 3) state.members.push(blankMember());
    }
    if (!cfg.categories.some((c) => c.code === state.category)) state.category = '';
    renderForm();
  })();
})();

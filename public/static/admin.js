'use strict';
(function () {
  const L = window.LNT;
  const { esc, lak, laoDate, laoDateTime, GENDER, CAT, PAY, payBadge, toast } = L;
  const view = document.getElementById('view');
  const ACTION = {
    login: 'ເຂົ້າສູ່ລະບົບ', 'registration.edit': 'ແກ້ໄຂຂໍ້ມູນຕິດຕໍ່', 'registration.recalculate': 'ຄິດລາຄາໃໝ່', 'registration.category_change': 'ປ່ຽນລຸ້ນ',
    'registration.member_add': 'ເພີ່ມສະມາຊິກ (ຄິດລາຄາໃໝ່)', 'registration.member_remove': 'ລຶບສະມາຊິກ (ຄິດລາຄາໃໝ່)', 'participant.add': 'ເພີ່ມຜູ້ເຂົ້າຮ່ວມ',
    'participant.remove': 'ລຶບຜູ້ເຂົ້າຮ່ວມ', 'participant.edit': 'ແກ້ໄຂຂໍ້ມູນຜູ້ເຂົ້າຮ່ວມ', 'registration.cancel': 'ຍົກເລີກການລົງທະບຽນ',
    'registration.reinstate': 'ກູ້ຄືນການລົງທະບຽນ', 'registration.access_code_reset': 'ອອກລະຫັດເຂົ້າເບິ່ງໃໝ່', 'payment.confirm': 'ຢືນຢັນການຈ່າຍ',
    'payment.reject': 'ປະຕິເສດຫຼັກຖານ', 'payment.reopen': 'ຍົກເລີກການຢືນຢັນການຈ່າຍ', 'participant.bib': 'ອອກ/ປ່ຽນ BIB', 'participant.bib_remove': 'ລຶບ BIB',
    'participant.kit': 'ຮັບເຄື່ອງ', 'participant.checkin': 'ເຊັກອິນ', 'export.participants': 'Export ລາຍຊື່', 'export.payments': 'Export ການຈ່າຍ',
    'settings.update': 'ແກ້ໄຂການຕັ້ງຄ່າ', 'category.update': 'ແກ້ໄຂລາຄາ', 'asset.upload': 'ອັບໂຫຼດຮູບ', 'staff.create': 'ເພີ່ມພະນັກງານ', 'staff.update': 'ແກ້ໄຂພະນັກງານ',
  };
  const actionLabel = (a) => ACTION[a] || a;
  const ROLE = { owner: 'ເຈົ້າຂອງງານ', accountant: 'ບັນຊີ', staff: 'ພະນັກງານລົງທະບຽນ' };
  let me = null;
  let perms = new Set();

  const api = (path, opts = {}) => L.api('/api/admin' + path, {
    ...opts, headers: { 'X-Requested-With': 'lnt-admin', ...(opts.headers || {}) },
  }).catch((e) => {
    if (e.status === 401 && path !== '/login') { me = null; renderLogin('ໝົດເວລາເຂົ້າສູ່ລະບົບ. ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່'); }
    throw e;
  });
  const can = (p) => perms.has(p);
  const fail = (e) => toast(e.message, true);

  /** Small in-page dialog (no browser alert/prompt). Resolves to input text, true, or null when cancelled. */
  function ask(title, { input = false, placeholder = '', okText = 'ຢືນຢັນ', danger = false, body = '' } = {}) {
    return new Promise((resolve) => {
      const bg = document.createElement('div');
      bg.className = 'modal-bg';
      bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3>${esc(title)}</h3>${body}
        ${input ? `<textarea id="askIn" placeholder="${esc(placeholder)}" maxlength="500"></textarea>` : ''}
        <div class="btn-row"><button class="btn secondary" data-a="no">ຍົກເລີກ</button><button class="btn ${danger ? 'danger' : ''}" data-a="ok">${esc(okText)}</button></div></div>`;
      document.body.appendChild(bg);
      const ta = bg.querySelector('#askIn'); if (ta) ta.focus();
      bg.addEventListener('click', (e) => {
        const a = e.target.dataset.a;
        if (!a && e.target !== bg) return;
        if (a === 'ok' && input && !ta.value.trim()) { ta.classList.add('invalid'); return; }
        bg.remove();
        resolve(a === 'ok' ? (input ? ta.value.trim() : true) : null);
      });
    });
  }

  // ---------- login ----------
  function renderLogin(err) {
    document.getElementById('nav').hidden = true;
    document.getElementById('who').innerHTML = '';
    view.innerHTML = `<div class="wrap"><div class="card"><h1>ເຂົ້າສູ່ລະບົບພະນັກງານ</h1>
      ${err ? `<div class="alert err">${esc(err)}</div>` : ''}
      <form id="loginForm"><label for="u">ຊື່ຜູ້ໃຊ້</label><input id="u" type="text" autocomplete="username" autocapitalize="none" required>
      <label for="p">ລະຫັດຜ່ານ</label><input id="p" type="password" autocomplete="current-password" required>
      <div class="btn-row"><button class="btn block" type="submit">ເຂົ້າສູ່ລະບົບ</button></div></form></div></div>`;
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button'); btn.disabled = true;
      try {
        await api('/login', { method: 'POST', body: { username: document.getElementById('u').value, password: document.getElementById('p').value } });
        await boot();
      } catch (x) { renderLogin(x.message); }
    });
  }

  async function renderSetup(err) {
    view.innerHTML = `<div class="wrap"><div class="card"><h1>ຕັ້ງຄ່າຄັ້ງທຳອິດ: ສ້າງບັນຊີເຈົ້າຂອງງານ</h1>
      <p>ໃຊ້ໄດ້ຄັ້ງດຽວ. ໃສ່ <b>ລະຫັດຕັ້ງຄ່າ</b> ທີ່ໄດ້ຮັບຈາກຜູ້ຕິດຕັ້ງລະບົບ ແລ້ວຕັ້ງຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານຂອງທ່ານເອງ.</p>
      ${err ? `<div class="alert err">${esc(err)}</div>` : ''}
      <form id="setupForm"><label for="sc">ລະຫັດຕັ້ງຄ່າ</label><input id="sc" type="text" autocomplete="off" autocapitalize="characters" required>
      <label for="su">ຊື່ຜູ້ໃຊ້ (ອັງກິດ/ຕົວເລກ)</label><input id="su" type="text" autocomplete="username" autocapitalize="none" required>
      <label for="sn">ຊື່ສະແດງ</label><input id="sn" type="text" value="ເຈົ້າຂອງງານ">
      <label for="sp">ລະຫັດຜ່ານ (ຢ່າງໜ້ອຍ 10 ຕົວ)</label><input id="sp" type="password" autocomplete="new-password" required>
      <label for="sp2">ຢືນຢັນລະຫັດຜ່ານ</label><input id="sp2" type="password" autocomplete="new-password" required>
      <div class="btn-row"><button class="btn block" type="submit">ສ້າງບັນຊີເຈົ້າຂອງງານ</button></div></form></div></div>`;
    document.getElementById('setupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = (id) => document.getElementById(id).value;
      if (v('sp') !== v('sp2')) return renderSetup('ລະຫັດຜ່ານທັງສອງບໍ່ກົງກັນ');
      try {
        await api('/setup', { method: 'POST', body: { code: v('sc'), username: v('su'), displayName: v('sn'), password: v('sp') } });
        renderLogin('');
        toast('ສ້າງບັນຊີແລ້ວ — ກະລຸນາເຂົ້າສູ່ລະບົບ');
      } catch (x) { renderSetup(x.message); }
    });
  }

  async function boot() {
    try {
      const r = await L.api('/api/admin/me');
      me = r.staff; perms = new Set(r.permissions);
    } catch (e) {
      if (e.status === 401) {
        const st = await L.api('/api/admin/setup-status').catch(() => ({ needed: false }));
        return st.needed ? renderSetup() : renderLogin();
      }
      view.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; return;
    }
    document.getElementById('who').innerHTML = `<span class="small">${esc(me.displayName)} (${ROLE[me.role]})</span> <a href="#" id="logout">ອອກ</a>`;
    document.getElementById('logout').onclick = async (e) => { e.preventDefault(); await api('/logout', { method: 'POST' }).catch(() => {}); me = null; renderLogin(); };
    const links = [['dashboard', 'ພາບລວມ', 'reg.read'], ['regs', 'ການລົງທະບຽນ', 'reg.read'], ['payments', 'ກວດການຈ່າຍ', 'pay.review'],
      ['reports', 'ລາຍງານ & Export', 'reports.ops'], ['settings', 'ຕັ້ງຄ່າງານ', 'settings'], ['staff', 'ພະນັກງານ', 'staff.manage'], ['audit', 'ປະຫວັດການແກ້ໄຂ', 'audit.read']];
    document.getElementById('navLinks').innerHTML = links.filter((l) => can(l[2])).map((l) => `<a href="#/${l[0]}" data-nav="${l[0]}">${l[1]}</a>`).join('');
    document.getElementById('nav').hidden = false;
    route();
  }

  function route() {
    if (!me) return;
    const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
    const parts = path.split('/');
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === (parts[0] === 'reg' ? 'regs' : parts[0] || 'dashboard')));
    const params = new URLSearchParams(qs || '');
    view.innerHTML = '<div class="loading">ກຳລັງໂຫຼດ…</div>';
    const routes = { '': dashboard, dashboard, regs: () => regs(params), payments: () => regs(new URLSearchParams('payment=awaiting_review&status=active'), true), reg: () => regDetail(Number(parts[1])), reports, settings, staff, audit };
    (routes[parts[0]] || dashboard)().catch((e) => { if (e.status !== 401) view.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; });
  }
  window.addEventListener('hashchange', route);

  // ---------- dashboard ----------
  async function dashboard() {
    const d = await api('/dashboard');
    const stat = (n, l) => `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`;
    const byCat = (code) => d.byCategory.find((x) => x.category_code === code) || { registrations: 0, participants: 0 };
    view.innerHTML = `<h1>ພາບລວມ</h1>
      <div class="alert ${d.registration.open ? 'ok' : 'warn'}">${d.registration.open ? 'ເປີດຮັບລົງທະບຽນຢູ່' : esc(d.registration.reason)}
        ${d.capacity ? ` · ໃຊ້ບ່ອນແລ້ວ ${d.participants} / ${d.capacity} ຄົນ (ນັບຜູ້ເຂົ້າຮ່ວມໃນການລົງທະບຽນທີ່ບໍ່ຖືກຍົກເລີກ)` : ' · ບໍ່ໄດ້ກຳນົດຈຳນວນຮັບສູງສຸດ'}</div>
      <div class="stats">
        ${stat(d.registrations, 'ການລົງທະບຽນ (ບໍ່ລວມຍົກເລີກ)')}${stat(d.participants, 'ຜູ້ເຂົ້າຮ່ວມທັງໝົດ (ຄົນ)')}
        ${stat(d.family_teams, 'ທີມ Family')}${stat(`<a href="#/payments">${d.awaiting_review}</a>`, 'ລໍຖ້າກວດການຈ່າຍ')}
        ${d.confirmed_revenue !== undefined ? stat(lak(d.confirmed_revenue), `ລາຍຮັບທີ່ຢືນຢັນແລ້ວ (${d.confirmed_count} ລາຍການ)`) : ''}
        ${d.outstanding !== undefined ? stat(lak(d.outstanding), `ຍັງບໍ່ໄດ້ຮັບ (${d.unpaid + d.awaiting_review} ລາຍການ)`) : ''}
        ${stat(`${d.with_bib} / ${d.participants}`, 'ອອກ BIB ແລ້ວ')}${stat(`${d.kit_collected} / ${d.checked_in}`, 'ຮັບເຄື່ອງແລ້ວ / ເຊັກອິນແລ້ວ')}
      </div>
      <div class="card mt"><h2>ຕາມລຸ້ນ</h2><table class="list"><tr><th>ລຸ້ນ</th><th>ການລົງທະບຽນ</th><th>ຜູ້ເຂົ້າຮ່ວມ</th></tr>
        ${['general', 'senior', 'family'].map((c) => `<tr><td>${CAT[c]}</td><td>${byCat(c).registrations}</td><td>${byCat(c).participants}</td></tr>`).join('')}</table>
        ${d.cancelled ? `<p class="small muted">ຍົກເລີກແລ້ວ ${d.cancelled} ລາຍການ${d.cancelled_paid ? ` (ໃນນັ້ນ ${d.cancelled_paid} ລາຍການເຄີຍຈ່າຍແລ້ວ — ລາຍຮັບຍັງນັບຢູ່ ຈົນກວ່າຈະຈັດການຄືນເງິນ)` : ''}</p>` : ''}</div>`;
  }


  // ---------- registration list ----------
  async function regs(params, paymentsMode) {
    const q = params.toString();
    const data = await api('/registrations?' + q);
    const opt = (name, list, cur) => `<select data-f="${name}">${list.map(([v, l]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const p = Object.fromEntries(params);
    view.innerHTML = `<h1>${paymentsMode ? 'ລໍຖ້າກວດການຈ່າຍ' : 'ການລົງທະບຽນ'} <span class="muted small">(${data.total})</span></h1>
      ${paymentsMode ? '' : `<form class="filters card" id="filters">
        <input type="search" data-f="q" placeholder="ຄົ້ນຫາ: ລະຫັດ, ຊື່, ທີມ, ເບີໂທ, BIB" value="${esc(p.q || '')}">
        ${opt('category', [['', 'ທຸກລຸ້ນ'], ['general', CAT.general], ['senior', CAT.senior], ['family', CAT.family]], p.category || '')}
        ${opt('gender', [['', 'ທຸກເພດ'], ['male', 'ຊາຍ'], ['female', 'ຍິງ']], p.gender || '')}
        ${opt('distance', [['', 'ທຸກໄລຍະ'], ['10', '10 KM'], ['5', '5 KM']], p.distance || '')}
        ${opt('payment', [['', 'ທຸກສະຖານະຈ່າຍ'], ...Object.entries(PAY)], p.payment || '')}
        ${opt('status', [['', 'ທັງໝົດ'], ['active', 'ປົກກະຕິ'], ['cancelled', 'ຍົກເລີກ']], p.status || '')}
        <button class="btn small" type="submit">ຄົ້ນຫາ</button></form>`}
      <div class="card table-scroll"><table class="list"><tr><th>ລະຫັດ</th><th>ລຸ້ນ</th><th>ຊື່ / ທີມ</th><th>ຜູ້ເຂົ້າຮ່ວມ (BIB)</th><th>ເບີໂທ</th><th>ຍອດ</th><th>ການຈ່າຍ</th><th>ວັນທີ</th></tr>
      ${data.rows.map((r) => `<tr class="row-link" data-id="${r.id}"><td><a href="#/reg/${r.id}">${esc(r.reference)}</a>${r.status === 'cancelled' ? ' <span class="badge b-cancelled">ຍົກເລີກ</span>' : ''}</td>
        <td>${CAT[r.category_code]}<br><span class="small muted">${r.distance_km} KM</span></td><td>${esc(r.team_name || r.contact_name)}</td>
        <td class="small">${r.member_count} ຄົນ: ${esc(r.members)}</td><td>${esc(r.contact_phone)}</td><td>${lak(r.total_amount)}</td>
        <td>${payBadge(r.payment_status)}</td><td class="small">${laoDateTime(r.created_at)}</td></tr>`).join('') || '<tr><td colspan="8" class="center muted">ບໍ່ພົບຂໍ້ມູນ</td></tr>'}
      </table></div>
      <div class="btn-row">${data.page > 1 ? '<button class="btn small secondary" data-page="-1">← ກ່ອນໜ້າ</button>' : ''}${data.page * 50 < data.total ? '<button class="btn small secondary" data-page="1">ຕໍ່ໄປ →</button>' : ''}</div>`;
    const f = document.getElementById('filters');
    if (f) f.addEventListener('submit', (e) => {
      e.preventDefault();
      const np = new URLSearchParams();
      f.querySelectorAll('[data-f]').forEach((el) => { if (el.value) np.set(el.dataset.f, el.value); });
      location.hash = '#/regs?' + np.toString();
    });
    view.querySelectorAll('.row-link').forEach((tr) => tr.addEventListener('click', (e) => { if (e.target.tagName !== 'A') location.hash = `#/reg/${tr.dataset.id}`; }));
    view.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => {
      params.set('page', String(data.page + Number(b.dataset.page)));
      if (paymentsMode) regs(params, true); else location.hash = '#/regs?' + params.toString();
    }));
  }

  // ---------- registration detail ----------
  async function regDetail(id) {
    const { registration: r } = await api(`/registrations/${id}`);
    const active = r.status === 'active';
    const priceLocked = ['confirmed', 'awaiting_review'].includes(r.payment_status);
    const sizes = (await L.api('/api/public/config')).shirtSizes;
    const kv = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;

    const tick = (act, at) => (can('race.ops')
      ? `<label class="check"><input type="checkbox" data-act="${act}" ${at ? 'checked' : ''} ${!active && !at ? 'disabled' : ''}> ${act === 'kit' ? 'ຮັບເຄື່ອງ' : 'ເຊັກອິນ'}${at ? ` <span class="small muted">${laoDateTime(at)}</span>` : ''}</label>`
      : `${act === 'kit' ? 'ຮັບເຄື່ອງ' : 'ເຊັກອິນ'}: ${at ? laoDateTime(at) : 'ຍັງ'}`);
    const members = r.participants.map((p) => `<div class="pcard" data-pid="${p.id}">
      <div class="pname">${p.position}. ${esc(p.full_name)} ${p.bib ? `<span class="badge b-confirmed">BIB ${esc(p.bib)}</span>` : ''}</div>
      <div class="pmeta">${GENDER[p.gender]} · ${laoDate(p.dob)} · ອາຍຸໃນວັນແຂ່ງ ${p.age_on_event} ປີ · ເສື້ອ ${esc(p.shirt_size)}</div>
      <div class="pops">
        <div>${can('race.ops') && active ? `<div class="inline-form"><input value="${esc(p.bib || '')}" data-bib placeholder="BIB" maxlength="10" aria-label="BIB">
          <button class="btn small" data-act="saveBib">ບັນທຶກ BIB</button><button class="btn small secondary" data-act="autoBib">ອັດຕະໂນມັດ</button>
          ${p.bib ? '<button class="btn small ghost" data-act="clearBib">ລຶບ BIB</button>' : ''}</div>` : `BIB: ${esc(p.bib || '—')}`}</div>
        <div>${tick('kit', p.kit_collected_at)}</div><div>${tick('checkin', p.checked_in_at)}</div>
      </div>
      ${can('reg.edit') ? `<div class="btn-row"><button class="btn small ghost" data-act="editMember">ແກ້ໄຂຂໍ້ມູນ</button>
        ${r.reg_type === 'family' && active ? '<button class="btn small ghost" data-act="removeMember">ລຶບສະມາຊິກອອກຈາກທີມ</button>' : ''}</div>` : ''}
      </div>`).join('');

    const proofs = can('pay.read') ? (r.proofs.length ? r.proofs.map((p) => `<div class="card"><div class="small">${laoDateTime(p.uploaded_at)} · ${Math.round(p.byte_size / 1024)} KB ·
        <b>${{ pending: 'ລໍຖ້າກວດ', accepted: 'ຮັບແລ້ວ', rejected: 'ປະຕິເສດ', superseded: 'ຖືກແທນທີ່ດ້ວຍຮູບໃໝ່' }[p.review_status]}</b>
        · <a href="/api/admin/proofs/${p.id}" target="_blank" rel="noopener">ເປີດຮູບເຕັມ</a></div>
        <img class="proof-thumb" src="/api/admin/proofs/${p.id}" alt="ຫຼັກຖານການໂອນ" loading="lazy"></div>`).join('') : '<p class="muted">ຍັງບໍ່ມີຫຼັກຖານ</p>') : '';

    view.innerHTML = `<p><a href="#/regs">← ກັບລາຍການ</a></p>
      <h1>${esc(r.reference)} ${payBadge(r.payment_status)} ${active ? '' : '<span class="badge b-cancelled">ຍົກເລີກແລ້ວ</span>'}</h1>
      ${!active ? `<div class="alert err">ຍົກເລີກເມື່ອ ${laoDateTime(r.cancelled_at)} · ເຫດຜົນ: ${esc(r.cancel_reason)}</div>` : ''}
      <div class="cards two">
        <div class="card"><h2>${CAT[r.category_code]} · ${r.distance_km} KM</h2><dl class="kv">
          ${r.team_name ? kv('ທີມ', esc(r.team_name)) : ''}${kv('ຜູ້ຕິດຕໍ່', esc(r.contact_name))}${kv('ເບີ WhatsApp', esc(r.contact_phone))}
          ${kv('ສຸກເສີນ', `${esc(r.emergency_name || '—')} ${esc(r.emergency_phone || '')}`)}${kv('ໝາຍເຫດ', esc(r.note || '—'))}
          ${kv('ລົງທະບຽນເມື່ອ', laoDateTime(r.created_at))}${kv('ຍິນຍອມເມື່ອ', laoDateTime(r.consent_at))}</dl>
          <div class="btn-row">${can('reg.edit') && active ? '<button class="btn small secondary" data-act="editReg">ແກ້ໄຂຂໍ້ມູນຕິດຕໍ່</button>' : ''}
          ${can('reg.edit') ? '<button class="btn small secondary" data-act="newCode">ອອກລະຫັດເຂົ້າເບິ່ງໃໝ່</button>' : ''}</div></div>
        <div class="card"><h2>ຄ່າລົງທະບຽນ</h2><table class="fee-table">
          <tr><td>ຄ່າພື້ນຖານ (${r.fee_base_members} ຄົນ)</td><td>${lak(r.fee_base)}</td></tr>
          ${r.reg_type === 'family' ? `<tr><td>ຄົນເພີ່ມ ${r.fee_extra_count} × ${lak(r.fee_extra_each)}</td><td>${lak(r.fee_extra_count * r.fee_extra_each)}</td></tr>` : ''}
          <tr class="total"><td>ລວມ (${r.member_count} ຄົນ)</td><td>${lak(r.total_amount)}</td></tr></table>
          <p class="small muted">ຄິດລາຄາເມື່ອ ${laoDateTime(r.priced_at)}.${priceLocked ? ' 🔒 ລາຄາຖືກລັອກ (ມີການຈ່າຍ/ຫຼັກຖານແລ້ວ).' : ''}</p>
          ${r.payment_status === 'confirmed' ? `<p>ຢືນຢັນ ${lak(r.confirmed_amount)} ໂດຍ ${esc(r.confirmed_by_name || '')} · ${laoDateTime(r.confirmed_at)}</p>` : ''}
          ${r.payment_note ? `<p class="small">ໝາຍເຫດການຈ່າຍ: ${esc(r.payment_note)}</p>` : ''}
          <div class="btn-row">
          ${can('reg.edit') && active && !priceLocked ? '<button class="btn small secondary" data-act="recalc">ຄິດລາຄາໃໝ່ຕາມລາຄາປັດຈຸບັນ</button>' : ''}
          ${can('reg.edit') && active && !priceLocked && r.reg_type === 'individual' ? `<button class="btn small secondary" data-act="changeCat">ປ່ຽນເປັນ${r.category_code === 'general' ? CAT.senior : CAT.general}</button>` : ''}
          </div></div>
      </div>
      ${can('pay.review') ? `<div class="card"><h2>ການກວດສອບການຈ່າຍ</h2>${proofs}<div class="btn-row">
        ${active && r.payment_status !== 'confirmed' ? `<button class="btn" data-act="confirmPay">ຢືນຢັນໄດ້ຮັບເງິນ ${lak(r.total_amount)}</button>` : ''}
        ${r.payment_status === 'awaiting_review' ? '<button class="btn danger" data-act="rejectPay">ປະຕິເສດຫຼັກຖານ</button>' : ''}
        ${r.payment_status === 'confirmed' && can('pay.reopen') ? '<button class="btn small ghost" data-act="reopenPay">ຍົກເລີກການຢືນຢັນ (ແກ້ຂໍ້ຜິດພາດ)</button>' : ''}</div>
        ${r.payment_events.length ? `<h3 class="mt">ປະຫວັດການຈ່າຍ</h3>${r.payment_events.map((e) => `<div class="audit-item">${laoDateTime(e.created_at)} · <b>${{ proof_uploaded: 'ສົ່ງຫຼັກຖານ', confirmed: 'ຢືນຢັນ', rejected: 'ປະຕິເສດ', reopened: 'ຍົກເລີກການຢືນຢັນ' }[e.action]}</b> ${e.amount !== null ? lak(e.amount) : ''} ${esc(e.staff || 'ຜູ້ລົງທະບຽນ')} ${e.note ? '· ' + esc(e.note) : ''}</div>`).join('')}` : ''}
      </div>` : ''}
      <div class="card"><h2>ຜູ້ເຂົ້າຮ່ວມ (${r.member_count} ຄົນ)</h2>${members}
        ${can('reg.edit') && active && r.reg_type === 'family' ? `<button class="btn small secondary" data-act="addMember" ${priceLocked ? 'disabled title="ລາຄາຖືກລັອກ"' : ''}>+ ເພີ່ມສະມາຊິກ (ຈະຄິດລາຄາໃໝ່)</button>` : ''}
        <p class="small muted">ຮັບເຄື່ອງ ແລະ ເຊັກອິນ ບັນທຶກແຍກແຕ່ລະຄົນ — ສະມາຊິກໃນທີມສາມາດມາຮັບບໍ່ພ້ອມກັນໄດ້.</p></div>
      <div class="card"><h2>ປະຫວັດການແກ້ໄຂ</h2>${r.audit.map((a) => `<div class="audit-item">${laoDateTime(a.created_at)} · <b>${esc(actionLabel(a.action))}</b> · ${esc(a.staff || '')}<br><code>${esc(JSON.stringify(a.details))}</code></div>`).join('') || '<p class="muted">ຍັງບໍ່ມີ</p>'}</div>
      <div class="btn-row">${active && can('reg.cancel') ? '<button class="btn danger" data-act="cancel">ຍົກເລີກການລົງທະບຽນ</button>' : ''}
        ${!active && can('settings') ? '<button class="btn secondary" data-act="reinstate">ກູ້ຄືນການລົງທະບຽນ</button>' : ''}</div>`;

    const reload = () => regDetail(id).catch(fail);
    const post = (path, body, method = 'POST') => api(path, { method, body });
    view.querySelectorAll('[data-act]').forEach((el) => {
      const evt = el.type === 'checkbox' ? 'change' : 'click';
      el.addEventListener(evt, async () => {
        const tr = el.closest('[data-pid]');
        const pid = tr && tr.dataset.pid;
        const p = pid && r.participants.find((x) => String(x.id) === pid);
        try {
          switch (el.dataset.act) {
            case 'saveBib': await post(`/participants/${pid}/bib`, { bib: tr.querySelector('[data-bib]').value }); toast('ບັນທຶກ BIB ແລ້ວ'); break;
            case 'autoBib': { const x = await post(`/participants/${pid}/bib`, { auto: true }); toast(`BIB: ${x.bib}`); break; }
            case 'clearBib': if (!(await ask('ລຶບ BIB ຂອງ ' + p.full_name + '?'))) return; await api(`/participants/${pid}/bib`, { method: 'DELETE' }); break;
            case 'kit': await post(`/participants/${pid}/kit`, { value: el.checked }); toast(el.checked ? 'ບັນທຶກຮັບເຄື່ອງແລ້ວ' : 'ຍົກເລີກການຮັບເຄື່ອງ'); break;
            case 'checkin': await post(`/participants/${pid}/checkin`, { value: el.checked }); toast(el.checked ? 'ເຊັກອິນແລ້ວ' : 'ຍົກເລີກເຊັກອິນ'); break;
            case 'confirmPay': {
              const pending = r.proofs.some((x) => x.review_status === 'pending');
              const note = pending ? await ask(`ຢືນຢັນວ່າໄດ້ຮັບເງິນ ${lak(r.total_amount)}?`, { input: true, placeholder: 'ໝາຍເຫດ (ບໍ່ບັງຄັບ) — ພິມ - ຖ້າບໍ່ມີ' })
                : await ask(`ບໍ່ມີຫຼັກຖານລໍຖ້າກວດ. ຢືນຢັນໄດ້ຮັບເງິນ ${lak(r.total_amount)}?`, { input: true, placeholder: 'ຈຳເປັນ: ເຊັ່ນ ຮັບເງິນສົດ, ເລກໃບຮັບເງິນ' });
              if (note === null) return;
              await post(`/registrations/${id}/payment`, { action: 'confirm', note: note === '-' ? '' : note }); toast('ຢືນຢັນການຈ່າຍແລ້ວ'); break;
            }
            case 'rejectPay': { const note = await ask('ເຫດຜົນທີ່ປະຕິເສດ (ຜູ້ລົງທະບຽນຈະເຫັນ)', { input: true, danger: true, okText: 'ປະຕິເສດ' }); if (note === null) return; await post(`/registrations/${id}/payment`, { action: 'reject', note }); break; }
            case 'reopenPay': { const note = await ask('ເຫດຜົນທີ່ຍົກເລີກການຢືນຢັນ', { input: true, danger: true }); if (note === null) return; await post(`/registrations/${id}/payment`, { action: 'reopen', note }); break; }
            case 'recalc': { const reason = await ask('ຄິດລາຄາໃໝ່ຕາມລາຄາປັດຈຸບັນ — ເຫດຜົນ', { input: true }); if (reason === null) return; const x = await post(`/registrations/${id}/recalculate`, { reason }); toast(`ລາຄາໃໝ່: ${lak(x.fee.total)}`); break; }
            case 'changeCat': {
              const to = r.category_code === 'general' ? 'senior' : 'general';
              const reason = await ask(`ປ່ຽນເປັນ ${CAT[to]} (ລາຄາຈະຖືກຄິດໃໝ່)`, { input: true, placeholder: 'ເຫດຜົນ' }); if (reason === null) return;
              await post(`/registrations/${id}/category`, { category: to, recalculate: true, reason }); break;
            }
            case 'addMember': await memberDialog(null, sizes, async (m, reason) => post(`/registrations/${id}/members`, { member: m, recalculate: true, reason })); break;
            case 'editMember': await memberDialog(p, sizes, async (m) => post(`/participants/${pid}`, m, 'PATCH')); break;
            case 'removeMember': { const reason = await ask(`ລຶບ ${p.full_name} ອອກຈາກທີມ? ລາຄາຈະຖືກຄິດໃໝ່`, { input: true, danger: true, placeholder: 'ເຫດຜົນ' }); if (reason === null) return; await api(`/participants/${pid}`, { method: 'DELETE', body: { recalculate: true, reason } }); break; }
            case 'editReg': await regDialog(r, async (b) => post(`/registrations/${id}`, b, 'PATCH')); break;
            case 'newCode': {
              if (!(await ask('ອອກລະຫັດເຂົ້າເບິ່ງໃໝ່? ລະຫັດ ແລະ ລິ້ງເກົ່າຈະໃຊ້ບໍ່ໄດ້ອີກ. ກວດຢືນຢັນຕົວຕົນຜູ້ລົງທະບຽນກ່ອນ.'))) return;
              const x = await post(`/registrations/${id}/access-code`);
              const link = `${location.origin}/status#r=${encodeURIComponent(x.reference)}&c=${encodeURIComponent(x.accessCode)}`;
              await ask('ລະຫັດໃໝ່ (ສະແດງຄັ້ງດຽວ)', { okText: 'ສຳເນົາລິ້ງ ແລະ ປິດ', body: `<p>ລະຫັດລົງທະບຽນ: <b>${esc(x.reference)}</b><br>ລະຫັດເຂົ້າເບິ່ງ: <span class="codebox">${esc(x.accessCode)}</span></p><div class="linkbox">${esc(link)}</div>` });
              await L.copyText(link); toast('ສຳເນົາລິ້ງແລ້ວ — ສົ່ງໃຫ້ຜູ້ລົງທະບຽນທາງ WhatsApp'); return;
            }
            case 'cancel': { const reason = await ask('ຍົກເລີກການລົງທະບຽນ — ເຫດຜົນ (ປະຫວັດການເງິນຈະຖືກເກັບໄວ້)', { input: true, danger: true }); if (reason === null) return; await post(`/registrations/${id}/cancel`, { reason }); break; }
            case 'reinstate': { const reason = await ask('ກູ້ຄືນການລົງທະບຽນ — ເຫດຜົນ', { input: true }); if (reason === null) return; await post(`/registrations/${id}/reinstate`, { reason }); break; }
            default: return;
          }
          reload();
        } catch (e) { fail(e); if (el.type === 'checkbox') el.checked = !el.checked; }
      });
    });
  }

  function memberDialog(p, sizes, save) {
    return new Promise((resolve) => {
      const bg = document.createElement('div');
      bg.className = 'modal-bg';
      bg.innerHTML = `<div class="modal"><h3>${p ? 'ແກ້ໄຂຂໍ້ມູນ' : 'ເພີ່ມສະມາຊິກ'}</h3>
        <label>ຊື່ ແລະ ນາມສະກຸນ</label><input id="mName" type="text" value="${esc(p ? p.full_name : '')}" maxlength="120">
        <label>ເພດ</label><select id="mGender"><option value="male" ${p && p.gender === 'male' ? 'selected' : ''}>ຊາຍ</option><option value="female" ${p && p.gender === 'female' ? 'selected' : ''}>ຍິງ</option></select>
        <label>ວັນເກີດ</label><input id="mDob" type="date" value="${esc(p ? p.dob : '')}">
        <label>ເສື້ອ</label><select id="mSize">${sizes.map((s) => `<option ${p && p.shirt_size === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
        ${p ? '' : '<label>ເຫດຜົນ (ລາຄາຈະຖືກຄິດໃໝ່)</label><input id="mReason" type="text" maxlength="300">'}
        <div id="mErr"></div><div class="btn-row"><button class="btn secondary" data-a="no">ຍົກເລີກ</button><button class="btn" data-a="ok">ບັນທຶກ</button></div></div>`;
      document.body.appendChild(bg);
      bg.addEventListener('click', async (e) => {
        const a = e.target.dataset.a;
        if (a === 'no') { bg.remove(); resolve(); }
        if (a !== 'ok') return;
        const m = { fullName: bg.querySelector('#mName').value, gender: bg.querySelector('#mGender').value, dob: bg.querySelector('#mDob').value, shirtSize: bg.querySelector('#mSize').value };
        try { await save(m, p ? undefined : bg.querySelector('#mReason').value); bg.remove(); resolve(); } catch (x) { bg.querySelector('#mErr').innerHTML = `<div class="alert err">${esc(x.message)}</div>`; }
      });
    });
  }
  function regDialog(r, save) {
    return new Promise((resolve) => {
      const bg = document.createElement('div');
      bg.className = 'modal-bg';
      const f = (id, label, v) => `<label>${label}</label><input id="${id}" type="text" value="${esc(v || '')}" maxlength="120">`;
      bg.innerHTML = `<div class="modal"><h3>ແກ້ໄຂຂໍ້ມູນຕິດຕໍ່</h3>
        ${r.reg_type === 'family' ? f('rTeam', 'ຊື່ທີມ', r.team_name) : ''}${f('rName', 'ຜູ້ຕິດຕໍ່', r.contact_name)}${f('rPhone', 'ເບີ WhatsApp', r.contact_phone)}
        ${f('rEName', 'ຜູ້ຕິດຕໍ່ສຸກເສີນ', r.emergency_name)}${f('rEPhone', 'ເບີສຸກເສີນ', r.emergency_phone)}
        <label>ໝາຍເຫດ</label><textarea id="rNote" maxlength="500">${esc(r.note || '')}</textarea>
        <div id="rErr"></div><div class="btn-row"><button class="btn secondary" data-a="no">ຍົກເລີກ</button><button class="btn" data-a="ok">ບັນທຶກ</button></div></div>`;
      document.body.appendChild(bg);
      bg.addEventListener('click', async (e) => {
        const a = e.target.dataset.a;
        if (a === 'no') { bg.remove(); resolve(); }
        if (a !== 'ok') return;
        const v = (id) => { const el = bg.querySelector('#' + id); return el ? el.value : undefined; };
        try {
          await save({ teamName: v('rTeam'), contactName: v('rName'), contactPhone: v('rPhone'), emergencyName: v('rEName'), emergencyPhone: v('rEPhone'), note: v('rNote') });
          bg.remove(); resolve();
        } catch (x) { bg.querySelector('#rErr').innerHTML = `<div class="alert err">${esc(x.message)}</div>`; }
      });
    });
  }

  // ---------- reports ----------
  async function reports() {
    const d = await api('/reports');
    const totalShirts = d.shirts.reduce((a, x) => a + x.n, 0);
    view.innerHTML = `<h1>ລາຍງານ & Export</h1>
      <div class="card"><h2>ດາວໂຫຼດ (CSV ສຳລັບ Excel, UTF-8)</h2><div class="btn-row">
        ${can('export.participants') ? '<a class="btn secondary" href="/api/admin/export/participants.csv">ລາຍຊື່ຜູ້ເຂົ້າຮ່ວມ (1 ຄົນ/ແຖວ)</a>' : ''}
        ${can('export.payments') ? '<a class="btn secondary" href="/api/admin/export/payments.csv">ການຈ່າຍເງິນ (1 ການລົງທະບຽນ/ແຖວ)</a>' : ''}</div>
        <p class="small muted">ໄຟລ໌ຈ່າຍເງິນນັບທີມ Family ເປັນ 1 ແຖວ ເພື່ອບໍ່ໃຫ້ຍອດເງິນຊ້ຳກັນ.</p></div>
      <div class="cards two">
        <div class="card"><h2>ຈຳນວນເສື້ອຕາມຂະໜາດ</h2><table class="list"><tr><th>ຂະໜາດ</th><th>ຈຳນວນ</th></tr>
          ${d.shirts.map((x) => `<tr><td>${esc(x.shirt_size)}</td><td>${x.n}</td></tr>`).join('')}<tr><td><b>ລວມ</b></td><td><b>${totalShirts}</b></td></tr></table></div>
        <div class="card"><h2>ຜູ້ເຂົ້າຮ່ວມຕາມປະເພດ</h2><table class="list"><tr><th>ລຸ້ນ</th><th>ເພດ</th><th>ຈຳນວນ</th></tr>
          ${d.divisions.map((x) => `<tr><td>${CAT[x.category_code]}</td><td>${GENDER[x.gender]}</td><td>${x.n}</td></tr>`).join('')}</table></div>
      </div>
      ${d.revenue ? `<div class="card"><h2>ລາຍຮັບທີ່ຢືນຢັນແລ້ວ</h2><table class="list"><tr><th>ລຸ້ນ</th><th>ການລົງທະບຽນ</th><th>ຍອດ</th></tr>
        ${d.revenue.map((x) => `<tr><td>${CAT[x.category_code]}</td><td>${x.registrations}</td><td>${lak(x.confirmed)}</td></tr>`).join('')}
        <tr><td colspan="2"><b>ລວມ</b></td><td><b>${lak(d.revenue.reduce((a, x) => a + x.confirmed, 0))}</b></td></tr></table></div>
      <div class="card"><h2>ຍັງບໍ່ໄດ້ຢືນຢັນການຈ່າຍ (${d.unpaid.length})</h2><div class="table-scroll"><table class="list"><tr><th>ລະຫັດ</th><th>ລຸ້ນ</th><th>ຊື່</th><th>ເບີ</th><th>ຄົນ</th><th>ຍອດ</th><th>ສະຖານະ</th></tr>
        ${d.unpaid.map((x) => `<tr><td><a href="#/reg/${x.id}">${esc(x.reference)}</a></td><td>${CAT[x.category_code]}</td><td>${esc(x.team_name || x.contact_name)}</td><td>${esc(x.contact_phone)}</td><td>${x.member_count}</td><td>${lak(x.total_amount)}</td><td>${payBadge(x.payment_status)}</td></tr>`).join('')}</table></div></div>` : ''}`;
  }

  // ---------- settings ----------
  async function settings() {
    const { settings: s, categories } = await api('/settings');
    const t = (k, label, hint) => `<label for="s-${k}">${label}</label><input id="s-${k}" data-s="${k}" type="text" value="${esc(s[k] || '')}">${hint ? `<div class="hint">${hint}</div>` : ''}`;
    const ta = (k, label) => `<label for="s-${k}">${label}</label><textarea id="s-${k}" data-s="${k}">${esc(s[k] || '')}</textarea>`;
    const bib = s.bibStart || { general: 1001, senior: 3001, family: 5001 };
    view.innerHTML = `<h1>ຕັ້ງຄ່າງານ</h1>
      <form class="card" id="setForm"><h2>ຂໍ້ມູນງານ</h2>
        ${t('eventName', 'ຊື່ງານ')}<label for="s-eventDate">ວັນແຂ່ງຂັນ</label><input id="s-eventDate" data-s="eventDate" type="date" value="${esc(s.eventDate)}">
        <div class="hint">ອາຍຸລຸ້ນອາວຸໂສ ຄິດໄລ່ຕາມວັນນີ້</div>
        ${t('province', 'ສະຖານທີ່ / ແຂວງ')}${t('meetingPoint', 'ຈຸດນັດພົບ', 'ປ່ອຍວ່າງ = ສະແດງ “ຈະແຈ້ງໃຫ້ຊາບພາຍຫຼັງ”')}${t('meetingTime', 'ເວລານັດພົບ', 'ເຊັ່ນ 05:30 ໂມງ')}
        <h2 class="mt">ການລົງທະບຽນ</h2>
        <label class="check"><input type="checkbox" data-s="registrationOpen" ${s.registrationOpen ? 'checked' : ''}> ເປີດຮັບລົງທະບຽນ</label>
        <label for="s-dl">ກຳນົດປິດລົງທະບຽນ (ເວລາລາວ)</label><input id="s-dl" data-s="registrationDeadline" type="datetime-local" value="${esc(s.registrationDeadline || '')}">
        <label for="s-cap">ຈຳນວນຮັບສູງສຸດ (ຄົນ)</label><input id="s-cap" data-s="capacity" type="number" min="1" step="1" value="${esc(s.capacity || '')}">
        <div class="hint">ນັບ <b>ຈຳນວນຜູ້ເຂົ້າຮ່ວມແຕ່ລະຄົນ</b> (ທີມ Family 5 ຄົນ = 5) ໃນທຸກການລົງທະບຽນທີ່ບໍ່ຖືກຍົກເລີກ ທັງຈ່າຍແລ້ວ ແລະ ຍັງບໍ່ຈ່າຍ. ປ່ອຍວ່າງ = ບໍ່ຈຳກັດ.</div>
        <label for="s-sizes">ຂະໜາດເສື້ອ (ຂັ້ນດ້ວຍ ,)</label><input id="s-sizes" data-s="shirtSizes" type="text" value="${esc((s.shirtSizes || []).join(', '))}">
        <label>ເລກ BIB ເລີ່ມຕົ້ນ (ໃຊ້ກັບປຸ່ມ “ອັດຕະໂນມັດ”)</label><div class="choice dob-grid">
          <input data-bib="general" type="number" value="${bib.general}" aria-label="ທົ່ວໄປ"><input data-bib="senior" type="number" value="${bib.senior}" aria-label="ອາວຸໂສ"><input data-bib="family" type="number" value="${bib.family}" aria-label="Family"></div>
        <div class="hint">ທົ່ວໄປ / ອາວຸໂສ / Family</div>
        <h2 class="mt">ການຈ່າຍເງິນ ແລະ ຕິດຕໍ່</h2>
        ${t('bankName', 'ທະນາຄານ')}${t('bankAccountName', 'ຊື່ບັນຊີ')}${t('bankAccountNumber', 'ເລກບັນຊີ')}${t('whatsapp', 'ເບີ WhatsApp ຜູ້ຈັດງານ')}${ta('contactNote', 'ຂໍ້ມູນຕິດຕໍ່ເພີ່ມເຕີມ')}
        <h2 class="mt">ເນື້ອຫາໜ້າເວັບ</h2>${ta('benefits', 'ສິ່ງທີ່ຜູ້ເຂົ້າຮ່ວມຈະໄດ້ຮັບ')}${ta('instructions', 'ຄຳແນະນຳກ່ຽວກັບງານ')}
        <div class="btn-row"><button class="btn" type="submit">ບັນທຶກການຕັ້ງຄ່າ</button></div></form>
      <div class="card"><h2>ຮູບພາບ</h2>
        <p>QR ຈ່າຍເງິນ: ${s.paymentQrAssetId ? `<img class="qr" src="/assets/${s.paymentQrAssetId}" alt=""> <button class="btn small ghost" data-clear="paymentQrAssetId">ລຶບ</button>` : '<span class="muted">ຍັງບໍ່ໄດ້ຕັ້ງ</span>'}</p>
        <p>ໂລໂກ້: ${s.logoAssetId ? `<img class="qr" src="/assets/${s.logoAssetId}" alt=""> <button class="btn small ghost" data-clear="logoAssetId">ລຶບ</button>` : '<span class="muted">ຍັງບໍ່ໄດ້ຕັ້ງ</span>'}</p>
        <p>ຮູບງານ: ${(s.eventImageAssetIds || []).map((i) => `<img class="qr" src="/assets/${i}" alt=""> <button class="btn small ghost" data-rmimg="${i}">ລຶບ</button>`).join(' ') || '<span class="muted">ບໍ່ມີ</span>'}</p>
        <label>ອັບໂຫຼດຮູບ (JPG/PNG/WebP ≤ 5 MB)</label><div class="inline-form"><select id="assetKind"><option value="payment_qr">QR ຈ່າຍເງິນ</option><option value="logo">ໂລໂກ້</option><option value="event_image">ຮູບງານ</option></select>
        <input type="file" id="assetFile" accept="image/jpeg,image/png,image/webp"><button class="btn small" id="assetUp">ອັບໂຫຼດ</button></div></div>
      <div class="card"><h2>ລາຄາ (ກີບ, ຈຳນວນເຕັມ)</h2><p class="small muted">ລາຄາໃໝ່ໃຊ້ກັບການລົງທະບຽນໃໝ່ເທົ່ານັ້ນ. ການລົງທະບຽນເກົ່າທີ່ຍັງບໍ່ຈ່າຍ ຈະປ່ຽນລາຄາກໍຕໍ່ເມື່ອກົດ “ຄິດລາຄາໃໝ່” ໃນແຕ່ລະລາຍການ.</p>
        ${categories.map((c) => `<form class="inline-form" data-cat="${c.code}"><b>${esc(c.name_lo)} ${c.distance_km} KM</b>
          <label class="small">ພື້ນຖານ <input name="baseFee" type="number" min="0" step="1" value="${c.base_fee}"></label>
          ${c.code === 'family' ? `<label class="small">ຄົນເພີ່ມ <input name="extraFee" type="number" min="0" step="1" value="${c.extra_fee}"></label><label class="small">ສູງສຸດ <input name="maxMembers" type="number" min="3" value="${c.max_members}"></label>` : ''}
          <label class="small"><input name="active" type="checkbox" ${c.active ? 'checked' : ''}> ເປີດ</label><button class="btn small">ບັນທຶກ</button></form><hr>`).join('')}</div>`;

    document.getElementById('setForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const b = {};
      view.querySelectorAll('#setForm [data-s]').forEach((el) => {
        const k = el.dataset.s;
        if (el.type === 'checkbox') b[k] = el.checked;
        else if (k === 'shirtSizes') b[k] = el.value.split(',').map((x) => x.trim()).filter(Boolean);
        else if (k === 'capacity') b[k] = el.value ? Number(el.value) : null;
        else b[k] = el.value;
      });
      b.bibStart = {}; view.querySelectorAll('[data-bib]').forEach((el) => { b.bibStart[el.dataset.bib] = Number(el.value); });
      try { await api('/settings', { method: 'PUT', body: b }); toast('ບັນທຶກແລ້ວ'); settings(); } catch (x) { fail(x); }
    });
    view.querySelectorAll('[data-cat]').forEach((f) => f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const b = { baseFee: Number(f.baseFee.value), active: f.active.checked };
      if (f.extraFee) { b.extraFee = Number(f.extraFee.value); b.maxMembers = Number(f.maxMembers.value); }
      if (!(await ask('ປ່ຽນລາຄາ? ມີຜົນກັບການລົງທະບຽນໃໝ່ເທົ່ານັ້ນ'))) return;
      try { await api(`/categories/${f.dataset.cat}`, { method: 'PUT', body: b }); toast('ບັນທຶກລາຄາແລ້ວ'); settings(); } catch (x) { fail(x); }
    }));
    view.querySelectorAll('[data-clear]').forEach((b) => b.addEventListener('click', async () => {
      try { await api('/settings', { method: 'PUT', body: { [b.dataset.clear]: null } }); settings(); } catch (x) { fail(x); }
    }));
    view.querySelectorAll('[data-rmimg]').forEach((b) => b.addEventListener('click', async () => {
      const keep = (s.eventImageAssetIds || []).filter((i) => String(i) !== b.dataset.rmimg);
      try { await api('/settings', { method: 'PUT', body: { eventImageAssetIds: keep } }); settings(); } catch (x) { fail(x); }
    }));
    document.getElementById('assetUp').addEventListener('click', async () => {
      const f = document.getElementById('assetFile').files[0];
      if (!f) return toast('ກະລຸນາເລືອກຮູບ', true);
      try { await L.upload('/api/admin/assets?kind=' + document.getElementById('assetKind').value, f, { 'X-Requested-With': 'lnt-admin' }); toast('ອັບໂຫຼດແລ້ວ'); settings(); } catch (x) { fail(x); }
    });
  }

  // ---------- staff ----------
  async function staff() {
    const { staff: list } = await api('/staff');
    view.innerHTML = `<h1>ພະນັກງານ</h1>
      <div class="card table-scroll"><table class="list"><tr><th>ຊື່ຜູ້ໃຊ້</th><th>ຊື່</th><th>ບົດບາດ</th><th>ສະຖານະ</th><th>ເຂົ້າລະບົບຫຼ້າສຸດ</th><th></th></tr>
        ${list.map((s) => `<tr data-sid="${s.id}"><td>${esc(s.username)}</td><td>${esc(s.display_name)}</td>
          <td><select data-role ${s.id === me.id ? 'disabled' : ''}>${Object.entries(ROLE).map(([k, v]) => `<option value="${k}" ${s.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
          <td>${s.active ? 'ໃຊ້ງານ' : '<span class="badge b-no">ປິດ</span>'}</td><td class="small">${laoDateTime(s.last_login_at) || '—'}</td>
          <td>${s.id === me.id ? '' : `<button class="btn small ghost" data-toggle>${s.active ? 'ປິດບັນຊີ' : 'ເປີດບັນຊີ'}</button>`} <button class="btn small ghost" data-pw>ປ່ຽນລະຫັດ</button></td></tr>`).join('')}
      </table></div>
      <form class="card" id="newStaff"><h2>ເພີ່ມພະນັກງານ</h2>
        <label>ຊື່ຜູ້ໃຊ້ (ອັງກິດ/ຕົວເລກ)</label><input name="username" type="text" autocapitalize="none" required>
        <label>ຊື່ສະແດງ</label><input name="displayName" type="text" required>
        <label>ບົດບາດ</label><select name="role">${Object.entries(ROLE).map(([k, v]) => `<option value="${k}" ${k === 'staff' ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <div class="hint">ເຈົ້າຂອງງານ: ທຸກຢ່າງ · ບັນຊີ: ກວດການຈ່າຍ ແລະ ລາຍງານການເງິນ · ພະນັກງານລົງທະບຽນ: ຂໍ້ມູນຜູ້ເຂົ້າຮ່ວມ, BIB, ຮັບເຄື່ອງ, ເຊັກອິນ</div>
        <label>ລະຫັດຜ່ານເບື້ອງຕົ້ນ (ຢ່າງໜ້ອຍ 10 ຕົວ)</label><input name="password" type="password" autocomplete="new-password" required>
        <div class="btn-row"><button class="btn">ເພີ່ມ</button></div></form>`;
    document.getElementById('newStaff').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      try { await api('/staff', { method: 'POST', body: { username: f.username.value, displayName: f.displayName.value, role: f.role.value, password: f.password.value } }); toast('ເພີ່ມແລ້ວ'); staff(); } catch (x) { fail(x); }
    });
    view.querySelectorAll('tr[data-sid]').forEach((tr) => {
      const sid = tr.dataset.sid;
      const s = list.find((x) => String(x.id) === sid);
      tr.querySelector('[data-role]').addEventListener('change', async (e) => { try { await api(`/staff/${sid}`, { method: 'PATCH', body: { role: e.target.value } }); toast('ປ່ຽນບົດບາດແລ້ວ'); } catch (x) { fail(x); staff(); } });
      const tg = tr.querySelector('[data-toggle]');
      if (tg) tg.addEventListener('click', async () => { try { await api(`/staff/${sid}`, { method: 'PATCH', body: { active: !s.active } }); staff(); } catch (x) { fail(x); } });
      tr.querySelector('[data-pw]').addEventListener('click', async () => {
        const pw = await ask(`ລະຫັດຜ່ານໃໝ່ສຳລັບ ${s.username} (ຢ່າງໜ້ອຍ 10 ຕົວ)`, { input: true });
        if (pw === null) return;
        try { await api(`/staff/${sid}`, { method: 'PATCH', body: { password: pw } }); toast('ປ່ຽນລະຫັດແລ້ວ'); } catch (x) { fail(x); }
      });
    });
  }

  async function audit() {
    const { rows } = await api('/audit');
    view.innerHTML = `<h1>ປະຫວັດການແກ້ໄຂ (300 ລາຍການຫຼ້າສຸດ)</h1><div class="card">${rows.map((a) => `<div class="audit-item">${laoDateTime(a.created_at)} · <b>${esc(actionLabel(a.action))}</b> · ${esc(a.staff || '')}
      ${a.entity_type === 'registration' ? `· <a href="#/reg/${esc(a.entity_id)}">ລາຍການ #${esc(a.entity_id)}</a>` : `· ${esc(a.entity_type)} ${esc(a.entity_id || '')}`}<br><code>${esc(JSON.stringify(a.details))}</code></div>`).join('') || '<p class="muted">ບໍ່ມີ</p>'}</div>`;
  }

  boot();
})();

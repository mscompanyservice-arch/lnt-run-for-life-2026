'use strict';
(async function () {
  const { esc, lak, laoDate, api, waLink } = window.LNT;
  const $ = (id) => document.getElementById(id);
  let cfg;
  try {
    cfg = await api('/api/public/config');
  } catch (e) {
    $('loadError').hidden = false;
    $('loadError').textContent = e.message;
    $('categories').innerHTML = '';
    return;
  }
  document.title = `${cfg.eventName} — ລົງທະບຽນ`;
  $('eventName').textContent = cfg.eventName;
  $('eventDate').textContent = laoDate(cfg.eventDate);
  $('province').textContent = cfg.province || '';
  if (cfg.meetingPoint || cfg.meetingTime) {
    $('meeting').textContent = [cfg.meetingPoint, cfg.meetingTime].filter(Boolean).join(' · ');
  } else {
    $('meeting').textContent = 'ຈະແຈ້ງໃຫ້ຊາບພາຍຫຼັງ';
  }
  if (cfg.logoUrl) { $('logo').src = cfg.logoUrl; $('logo').hidden = false; }
  if (cfg.imageUrls.length) {
    $('gallery').hidden = false;
    $('gallery').innerHTML = cfg.imageUrls.map((u) => `<img src="${esc(u)}" alt="ຮູບງານ" loading="lazy">`).join('');
  }
  if (!cfg.registration.open) {
    $('closedBanner').hidden = false;
    $('closedBanner').textContent = cfg.registration.reason;
    $('registerBtn').hidden = true;
  } else {
    const notes = [];
    if (cfg.registrationDeadline) notes.push(`ປິດຮັບລົງທະບຽນ: ${laoDate(cfg.registrationDeadline)} ເວລາ ${cfg.registrationDeadline.slice(11, 16)} ໂມງ`);
    if (cfg.registration.remaining !== null && cfg.registration.remaining !== undefined) notes.push(`ບ່ອນວ່າງເຫຼືອ ${cfg.registration.remaining} ຄົນ`);
    if (notes.length) { $('closedBanner').hidden = false; $('closedBanner').className = 'alert info'; $('closedBanner').textContent = notes.join(' · '); }
  }

  $('categories').innerHTML = cfg.categories.map((c) => {
    let detail;
    if (c.code === 'family') {
      detail = `<div class="price">${lak(c.baseFee)} <span class="small muted">/ ທີມ ${c.baseMembers} ຄົນ</span></div>
        <p class="small">ຄົນທີ ${c.baseMembers + 1} ເປັນຕົ້ນໄປ ເພີ່ມຄົນລະ <b>${lak(c.extraFee)}</b>. ຢ່າງໜ້ອຍ ${c.minMembers} ຄົນຕໍ່ທີມ.</p>`;
    } else {
      detail = `<div class="price">${lak(c.baseFee)} <span class="small muted">/ ຄົນ</span></div>
        <p class="small">ແບ່ງປະເພດ ຊາຍ ແລະ ຍິງ.${c.minAge ? ` ອາຍຸ ${c.minAge} ປີຂຶ້ນໄປ ໃນວັນແຂ່ງຂັນ.` : ''}</p>`;
    }
    return `<div class="card cat-card"><h3>${esc(c.name)}</h3><span class="dist">${c.distanceKm} KM</span>${detail}</div>`;
  }).join('');

  if (cfg.benefits) { $('benefitsCard').hidden = false; $('benefits').textContent = cfg.benefits; }
  if (cfg.instructions) { $('instructionsCard').hidden = false; $('instructions').textContent = cfg.instructions; }

  const p = cfg.payment;
  $('paymentInfo').innerHTML = p.configured
    ? `<p>ຂໍ້ມູນບັນຊີ ແລະ QR ສຳລັບໂອນເງິນ ຈະສະແດງໃຫ້ຫຼັງຈາກລົງທະບຽນສຳເລັດ ພ້ອມຍອດທີ່ຕ້ອງຈ່າຍ.</p>
       <p class="muted small">ລະບົບນີ້ບໍ່ໄດ້ເຊື່ອມຕໍ່ກັບທະນາຄານໂດຍອັດຕະໂນມັດ. ພະນັກງານຈະກວດຫຼັກຖານການໂອນ ແລະ ຢືນຢັນດ້ວຍຕົນເອງ.</p>`
    : `<div class="alert warn">ຂໍ້ມູນບັນຊີສຳລັບໂອນເງິນ ກຳລັງຈະແຈ້ງໃຫ້ຊາບ. ທ່ານສາມາດລົງທະບຽນໄວ້ກ່ອນໄດ້ ແລະ ກັບມາຈ່າຍພາຍຫຼັງຜ່ານລິ້ງສ່ວນຕົວ.</div>`;

  const wa = waLink(cfg.whatsapp);
  $('contact').innerHTML = (wa
    ? `<p>WhatsApp: <a href="${esc(wa)}" rel="noopener">${esc(cfg.whatsapp)}</a></p>`
    : '<p class="muted">ຂໍ້ມູນຕິດຕໍ່ ກຳລັງຈະແຈ້ງໃຫ້ຊາບ.</p>') +
    (cfg.contactNote ? `<p class="prewrap">${esc(cfg.contactNote)}</p>` : '');

  $('faq').innerHTML = cfg.faq.map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
})();

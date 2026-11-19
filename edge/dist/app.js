var ft=Object.create;var we=Object.defineProperty;var gt=Object.getOwnPropertyDescriptor;var bt=Object.getOwnPropertyNames;var ht=Object.getPrototypeOf,yt=Object.prototype.hasOwnProperty;var ne=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,c)=>(typeof require<"u"?require:n)[c]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var M=(e,n)=>()=>{try{return n||e((n={exports:{}}).exports,n),n.exports}catch(c){throw n=0,c}};var vt=(e,n,c,o)=>{if(n&&typeof n=="object"||typeof n=="function")for(let p of bt(n))!yt.call(e,p)&&p!==c&&we(e,p,{get:()=>n[p],enumerable:!(o=gt(n,p))||o.enumerable});return e};var Ee=(e,n,c)=>(c=e!=null?ft(ht(e)):{},vt(n||!e||!e.__esModule?we(c,"default",{value:e,enumerable:!0}):c,e));var ae=M((yn,xe)=>{xe.exports=globalThis.__lntExt.path});var Z=M((vn,Ae)=>{Ae.exports=globalThis.__lntExt.express});var ke=M((wn,Ne)=>{Ne.exports=globalThis.__lntExt.fs});var Te=M((En,Se)=>{Se.exports=globalThis.__lntExt.pg});var G=M((xn,Ie)=>{"use strict";var _e=ke(),$e=ae(),{Pool:wt,types:Re}=Te();Re.setTypeParser(20,e=>{let n=Number(e);if(!Number.isSafeInteger(n))throw new Error("int8 value exceeds safe integer range");return n});Re.setTypeParser(1082,e=>e);function Et(e){let n=process.env.DATABASE_SSL==="true"?{rejectUnauthorized:process.env.DATABASE_SSL_REJECT_UNAUTHORIZED!=="false"}:void 0;return new wt({connectionString:e,max:Number(process.env.DATABASE_POOL_MAX||10),ssl:n})}async function Le(e,n){let c=await e.connect();try{await c.query("BEGIN");let o=await n(c);return await c.query("COMMIT"),o}catch(o){try{await c.query("ROLLBACK")}catch{}throw o}finally{c.release()}}async function xt(e,n=console.log){await e.query("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");let c=$e.join(__dirname,"..","migrations"),o=_e.readdirSync(c).filter(p=>/^\d+_.*\.sql$/.test(p)).sort();for(let p of o){if((await e.query("SELECT 1 FROM schema_migrations WHERE version=$1",[p])).rowCount)continue;let h=_e.readFileSync($e.join(c,p),"utf8");await Le(e,async S=>{await S.query(h),await S.query("INSERT INTO schema_migrations (version) VALUES ($1)",[p])}),n(`migration applied: ${p}`)}}Ie.exports={createPool:Et,tx:Le,migrate:xt}});var V=M((An,Be)=>{"use strict";var De=["male","female"],At=["general","senior","family"],Ce={general:10,senior:5,family:5},Nt=["unpaid","awaiting_review","confirmed","rejected"],K=class extends Error{constructor(n,c,o,p){super(o),this.status=n,this.code=c,this.extra=p}},P=(e,n,c)=>new K(400,e,n,c);function Oe(e){return Number.isSafeInteger(e)&&e>=0}function Me(e,n){let c=Number(e.base_fee),o=Number(e.extra_fee),p=Number(e.base_members);if(![c,o,p,n].every(Oe))throw new K(500,"BAD_PRICE_CONFIG","ການຕັ້ງຄ່າລາຄາບໍ່ຖືກຕ້ອງ");let f=Math.max(0,n-p),h=c+f*o;if(!Oe(h))throw new K(500,"BAD_PRICE_CONFIG","ການຄຳນວນລາຄາຜິດພາດ");return{base:c,extraEach:o,extraCount:f,total:h,baseMembers:p}}function Q(e){if(typeof e!="string"||!/^\d{4}-\d{2}-\d{2}$/.test(e))return null;let[n,c,o]=e.split("-").map(Number),p=new Date(Date.UTC(n,c-1,o));return p.getUTCFullYear()!==n||p.getUTCMonth()!==c-1||p.getUTCDate()!==o?null:{y:n,m:c,d:o}}function Fe(e,n){let c=Q(e),o=Q(n);if(!c||!o)return null;let p=o.y-c.y;return(o.m<c.m||o.m===c.m&&o.d<c.d)&&(p-=1),p}function se(e){if(typeof e!="string")return null;let n=e.trim(),c=n.replace(/\D/g,"");return n.startsWith("+")&&!c.startsWith("856")?c.length>=8&&c.length<=15?"+"+c:null:(c.startsWith("00856")?c=c.slice(5):c.startsWith("856")&&(c=c.slice(3)),c.startsWith("0")&&(c=c.slice(1)),c.length<8||c.length>11?null:c)}function H(e,n){if(e==null)return"";if(typeof e!="string")return null;let c=e.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();return c.length>n?null:c}function kt(e){return String(e||"").toLowerCase().replace(/\s+/g," ").trim()}function St(e,{categories:n,settings:c}){let o={},p=(r,u)=>{o[r]||(o[r]=u)};if(!e||typeof e!="object")throw P("INVALID","ຂໍ້ມູນບໍ່ຖືກຕ້ອງ");let f=n.find(r=>r.code===e.category&&r.active);if(!f)throw P("INVALID_CATEGORY","ກະລຸນາເລືອກລຸ້ນການແຂ່ງຂັນ");let h=f.code==="family",S=Ce[f.code];if(e.distanceKm!==void 0&&Number(e.distanceKm)!==S)throw P("DISTANCE_MISMATCH","ໄລຍະທາງບໍ່ກົງກັບລຸ້ນທີ່ເລືອກ. ລຸ້ນທົ່ວໄປ 10 KM, ລຸ້ນອາວຸໂສ ແລະ Family 5 KM");let y=c.shirtSizes||[],w=c.eventDate,k=H(e.contactName,120),E=H(e.contactPhone,30),T=se(E||""),R=H(e.emergencyName,120),C=H(e.emergencyPhone,30),_=C?se(C):null,L=H(e.note,500),a=H(e.teamName,120);k||p("contactName",h?"ກະລຸນາໃສ່ຊື່ຜູ້ຕິດຕໍ່ຂອງທີມ":"ກະລຸນາໃສ່ຊື່ ແລະ ນາມສະກຸນ"),T||p("contactPhone","ກະລຸນາໃສ່ເບີ WhatsApp ທີ່ຖືກຕ້ອງ (ຕົວຢ່າງ 020 5555 1234)"),L===null&&p("note","ໝາຍເຫດຍາວເກີນ 500 ຕົວອັກສອນ"),h?(a||p("teamName","ກະລຸນາໃສ່ຊື່ທີມ"),C&&!_&&p("emergencyPhone","ເບີໂທສຸກເສີນບໍ່ຖືກຕ້ອງ")):(R||p("emergencyName","ກະລຸນາໃສ່ຊື່ຜູ້ຕິດຕໍ່ກໍລະນີສຸກເສີນ"),_||p("emergencyPhone","ກະລຸນາໃສ່ເບີໂທຜູ້ຕິດຕໍ່ກໍລະນີສຸກເສີນ")),e.consent!==!0&&p("consent","ກະລຸນາຢືນຢັນການຍິນຍອມໃຫ້ໃຊ້ຂໍ້ມູນເພື່ອການຈັດງານ");let d;if(h)d=Array.isArray(e.members)?e.members:[];else{let r=Array.isArray(e.members)&&e.members[0]?e.members[0]:{};if(d=[{...r,fullName:r.fullName!==void 0?r.fullName:e.contactName}],Array.isArray(e.members)&&e.members.length>1)throw P("TOO_MANY_MEMBERS","ການລົງທະບຽນລາຍບຸກຄົນມີໄດ້ 1 ຄົນເທົ່ານັ້ນ")}let t=Number(f.min_members),s=Number(f.max_members);if(d.length<t)throw P("TOO_FEW_MEMBERS",`ລຸ້ນ Family ຕ້ອງມີຢ່າງໜ້ອຍ ${t} ຄົນ`,{min:t});if(d.length>s)throw P("TOO_MANY_MEMBERS",`ມີສະມາຊິກໄດ້ສູງສຸດ ${s} ຄົນຕໍ່ການລົງທະບຽນ`,{max:s});let l=d.map((r,u)=>{let m=`members.${u}.`;r=r&&typeof r=="object"?r:{};let g=H(r.fullName,120);g||p(m+"fullName","ກະລຸນາໃສ່ຊື່ ແລະ ນາມສະກຸນ");let v=De.includes(r.gender)?r.gender:null;v||p(m+"gender","ກະລຸນາເລືອກ ຊາຍ ຫຼື ຍິງ");let A=Q(r.dob)?r.dob:null,$=null;A?($=Fe(A,w),$===null||$<0||r.dob<"1900-01-01"?p(m+"dob","ວັນເດືອນປີເກີດບໍ່ຖືກຕ້ອງ"):f.min_age!==null&&f.min_age!==void 0&&$<Number(f.min_age)&&p(m+"dob",`ລຸ້ນອາວຸໂສ ຕ້ອງມີອາຍຸ ${f.min_age} ປີຂຶ້ນໄປ ໃນວັນແຂ່ງຂັນ (${w}). ອາຍຸໃນວັນແຂ່ງ: ${$} ປີ`)):p(m+"dob","ກະລຸນາໃສ່ວັນເດືອນປີເກີດ");let W=y.includes(r.shirtSize)?r.shirtSize:null;return W||p(m+"shirtSize","ກະລຸນາເລືອກຂະໜາດເສື້ອ"),{fullName:g,gender:v,dob:A,shirtSize:W,age:$}});if(Object.keys(o).length)throw P("VALIDATION","ກະລຸນາກວດສອບຂໍ້ມູນທີ່ໝາຍໄວ້",{fields:o});let i=Me(f,l.length);if(e.clientTotal!==void 0&&e.clientTotal!==null&&Number(e.clientTotal)!==i.total)throw P("PRICE_MISMATCH","ລາຄາບໍ່ກົງກັບລະບົບ. ກະລຸນາໂຫຼດໜ້າໃໝ່ ແລ້ວລອງອີກຄັ້ງ",{serverTotal:i.total});return{type:h?"family":"individual",category:f.code,distanceKm:S,teamName:h?a:null,contactName:k,contactPhone:E,contactPhoneNorm:T,emergencyName:R||null,emergencyPhone:C||null,note:L||null,members:l,fee:i}}var Tt="23456789ABCDEFGHJKMNPQRSTUVWXYZ";Be.exports={AppError:K,bad:P,GENDERS:De,CATEGORY_CODES:At,CATEGORY_DISTANCE:Ce,PAYMENT_STATUSES:Nt,computeFee:Me,parseDate:Q,ageOn:Fe,normalizePhone:se,cleanText:H,normName:kt,validateRegistration:St,REF_ALPHABET:Tt}});var ee=M((Nn,qe)=>{qe.exports=globalThis.__lntExt.crypto});var ie=M((kn,ze)=>{"use strict";var U=ee(),{REF_ALPHABET:te,AppError:Pe}=V(),Ue=e=>U.createHash("sha256").update(e).digest("hex");function He(e,n=te){let c=[],o=256-256%n.length;for(;c.length<e;)for(let p of U.randomBytes(e*2))p<o&&c.length<e&&c.push(n[p%n.length]);return c.join("")}var _t=()=>"LNT26-"+He(6);function We(e){return e.match(/.{1,4}/g).join("-")}function $t(e,n){let c=U.createHmac("sha256",e).update("access:"+n).digest(),o=[],p=256-256%te.length,f=0,h=c;for(;o.length<12;){f>=h.length&&(h=U.createHmac("sha256",e).update(h).digest(),f=0);let S=h[f++];S<p&&o.push(te[S%te.length])}return We(o.join(""))}var Rt=()=>We(He(12)),je=e=>String(e||"").toUpperCase().replace(/[^0-9A-Z]/g,""),Lt=e=>Ue("acc:"+je(e));function It(e,n){let c=Buffer.from(String(e),"hex"),o=Buffer.from(String(n),"hex");return c.length===o.length&&c.length>0&&U.timingSafeEqual(c,o)}function Ot(e){let n=U.randomBytes(16),c=U.scryptSync(e,n,64,{N:16384,r:8,p:1});return`scrypt$16384$${n.toString("base64")}$${c.toString("base64")}`}function Dt(e,n){let c=String(n).split("$");if(c.length!==4||c[0]!=="scrypt")return!1;let o=Number(c[1]),p=Buffer.from(c[2],"base64"),f=Buffer.from(c[3],"base64"),h=U.scryptSync(String(e),p,f.length,{N:o,r:8,p:1});return U.timingSafeEqual(h,f)}function Ct(e){if(typeof e!="string"||e.length<10)throw new Pe(400,"WEAK_PASSWORD","ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 10 ຕົວອັກສອນ");if(e.length>200)throw new Pe(400,"WEAK_PASSWORD","ລະຫັດຜ່ານຍາວເກີນໄປ")}function Mt(e){return!Buffer.isBuffer(e)||e.length<12?null:e[0]===255&&e[1]===216&&e[2]===255?"image/jpeg":e.slice(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?"image/png":e.slice(0,4).toString("latin1")==="RIFF"&&e.slice(8,12).toString("latin1")==="WEBP"?"image/webp":null}function Ft({windowMs:e,max:n,name:c}){let o=new Map,p=setInterval(()=>{let f=Date.now();for(let[h,S]of o)S.reset<=f&&o.delete(h)},Math.min(e,6e4));return p&&typeof p.unref=="function"&&p.unref(),(f,h,S)=>{if(process.env.DISABLE_RATE_LIMIT==="true")return S();let y=`${c}:${f.ip}`,w=Date.now(),k=o.get(y);if((!k||k.reset<=w)&&(k={count:0,reset:w+e},o.set(y,k)),k.count+=1,k.count>n)return h.set("Retry-After",String(Math.ceil((k.reset-w)/1e3))),h.status(429).json({error:"RATE_LIMITED",message:"ມີການສົ່ງຄຳຂໍຫຼາຍເກີນໄປ. ກະລຸນາລໍຖ້າບໍ່ເທົ່າໃດນາທີ ແລ້ວລອງໃໝ່"});S()}}function re(e){if(e==null)return"";let n=String(e);return/^[=+\-@\t\r]/.test(n)&&(n="'"+n),/[",\r\n]/.test(n)&&(n='"'+n.replace(/"/g,'""')+'"'),n}function Bt(e,n){let c=[e.map(re).join(",")];for(let o of n)c.push(o.map(re).join(","));return"\uFEFF"+c.join(`\r
`)+`\r
`}ze.exports={sha256:Ue,newReference:_t,accessCodeFor:$t,randomAccessCode:Rt,hashAccessCode:Lt,normalizeCode:je,safeEqualHex:It,hashPassword:Ot,verifyPassword:Dt,checkPasswordStrength:Ct,sniffImage:Mt,rateLimiter:Ft,csvCell:re,toCsv:Bt}});var ce=M((Sn,Ge)=>{"use strict";var{AppError:qt}=V(),Ke={unpaid:"ຍັງບໍ່ໄດ້ຈ່າຍ",awaiting_review:"ລໍຖ້າກວດສອບການຈ່າຍ",confirmed:"ຢືນຢັນການຈ່າຍແລ້ວ",rejected:"ຫຼັກຖານບໍ່ຜ່ານ — ກະລຸນາສົ່ງໃໝ່"},Pt={male:"ຊາຍ",female:"ຍິງ"},Ut={active:"ປົກກະຕິ",cancelled:"ຍົກເລີກແລ້ວ"};async function Ht(e,{lock:n=!1}={}){let c=await e.query(`SELECT data FROM settings WHERE id=1${n?" FOR UPDATE":""}`);if(!c.rowCount)throw new qt(500,"NO_SETTINGS","ລະບົບຍັງບໍ່ໄດ້ຕັ້ງຄ່າ");return c.rows[0].data}async function Wt(e){return(await e.query("SELECT * FROM categories ORDER BY sort_order")).rows}function oe(e){if(!e)return null;let n=Date.parse(`${e}:00+07:00`);return Number.isNaN(n)?null:new Date(n)}function jt(e){return e?new Date(e).toLocaleString("sv-SE",{timeZone:"Asia/Vientiane",hour12:!1}).slice(0,16):""}async function zt(e){return(await e.query("SELECT count(*)::int AS n FROM participants p JOIN registrations r ON r.id=p.registration_id WHERE r.status='active'")).rows[0].n}function Kt(e,n,c=new Date){if(!e.registrationOpen)return{open:!1,reason:"ປິດຮັບລົງທະບຽນແລ້ວ"};let o=oe(e.registrationDeadline);if(o&&c>o)return{open:!1,reason:"ໝົດເວລາລົງທະບຽນແລ້ວ"};let p=oe(`${e.eventDate}T23:59`);if(p&&c>p)return{open:!1,reason:"ງານແລ່ນໄດ້ຈັດຂຶ້ນແລ້ວ"};let f=e.capacity?Number(e.capacity):null,h=f?Math.max(0,f-n):null;return f&&h<=0?{open:!1,reason:"ບ່ອນວ່າງເຕັມແລ້ວ",remaining:0,capacity:f}:{open:!0,remaining:h,capacity:f}}async function Vt(e,n){let c=await e.query(`SELECT r.*, c.name_lo AS category_name, s.display_name AS confirmed_by_name
       FROM registrations r JOIN categories c ON c.code=r.category_code
       LEFT JOIN staff s ON s.id=r.confirmed_by WHERE r.id=$1`,[n]);if(!c.rowCount)return null;let o=c.rows[0];return o.participants=(await e.query("SELECT * FROM participants WHERE registration_id=$1 ORDER BY position",[n])).rows,o.proofs=(await e.query("SELECT id, content_type, byte_size, review_status, uploaded_at, reviewed_at FROM payment_proofs WHERE registration_id=$1 ORDER BY uploaded_at DESC",[n])).rows,o}function Ve(e){return{base:e.fee_base,baseMembers:e.fee_base_members,extraEach:e.fee_extra_each,extraCount:e.fee_extra_count,total:e.total_amount}}function Yt(e,n){return{reference:e.reference,type:e.reg_type,category:e.category_code,categoryName:e.category_name,distanceKm:e.distance_km,teamName:e.team_name,contactName:e.contact_name,contactPhone:e.contact_phone,emergencyName:e.emergency_name,emergencyPhone:e.emergency_phone,note:e.note,memberCount:e.member_count,fee:Ve(e),paymentStatus:e.payment_status,paymentStatusLabel:Ke[e.payment_status],paymentNote:e.payment_status==="rejected"?e.payment_note:null,status:e.status,createdAt:e.created_at,canUploadProof:e.status==="active"&&e.payment_status!=="confirmed",proofs:e.proofs.map(c=>({uploadedAt:c.uploaded_at,reviewStatus:c.review_status})),participants:e.participants.map(c=>({position:c.position,fullName:c.full_name,gender:c.gender,dob:c.dob,shirtSize:c.shirt_size,bib:c.bib,kitCollected:!!c.kit_collected_at,checkedIn:!!c.checked_in_at})),payment:Ye(n)}}function Ye(e){return{configured:!!(e.bankName&&e.bankAccountName&&e.bankAccountNumber)||!!e.paymentQrAssetId,bankName:e.bankName||null,accountName:e.bankAccountName||null,accountNumber:e.bankAccountNumber||null,qrUrl:e.paymentQrAssetId?`/assets/${e.paymentQrAssetId}`:null}}async function Gt(e,n,c,o,p,f={}){await e.query("INSERT INTO audit_log (staff_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)",[n,c,o,p==null?null:String(p),f])}Ge.exports={PAYMENT_LABELS:Ke,GENDER_LABELS:Pt,STATUS_LABELS:Ut,loadSettings:Ht,loadCategories:Wt,vientianeToDate:oe,fmtVientiane:jt,activeParticipantCount:zt,openState:Kt,getRegistrationFull:Vt,publicRegistrationView:Yt,paymentInfo:Ye,feeView:Ve,audit:Gt}});var et=M((Tn,Qe)=>{"use strict";var de=Z(),Jt=ee(),{AppError:q,validateRegistration:Xt,normName:Je}=V(),F=ie(),O=ce(),{tx:Xe}=G(),Zt=5*1024*1024,Qt=10,Ze=e=>String(e).replace(/\B(?=(\d{3})+(?!\d))/g,",");function en(e,n){let c=n.find(w=>w.code==="senior"),o=n.find(w=>w.code==="family"),[p,f,h]=e.eventDate.split("-").map(Number),S=["ມັງກອນ","ກຸມພາ","ມີນາ","ເມສາ","ພຶດສະພາ","ມິຖຸນາ","ກໍລະກົດ","ສິງຫາ","ກັນຍາ","ຕຸລາ","ພະຈິກ","ທັນວາ"],y=[{q:"ລົງທະບຽນແລ້ວ ໝາຍຄວາມວ່າຈ່າຍເງິນແລ້ວບໍ?",a:"ບໍ່. ການລົງທະບຽນແມ່ນບັນທຶກຂໍ້ມູນເທົ່ານັ້ນ. ການຈ່າຍເງິນຈະສົມບູນເມື່ອພະນັກງານກວດສອບຫຼັກຖານ ແລະ ຢືນຢັນແລ້ວ."},{q:"ກວດສະຖານະການລົງທະບຽນແນວໃດ?",a:"ໃຊ້ລິ້ງສ່ວນຕົວທີ່ໄດ້ຮັບຫຼັງລົງທະບຽນ ຫຼື ໃສ່ລະຫັດລົງທະບຽນ ແລະ ລະຫັດເຂົ້າເບິ່ງ ຢູ່ໜ້າ “ກວດສະຖານະ”."},{q:"ເຮັດລິ້ງ ຫຼື ລະຫັດເຂົ້າເບິ່ງເສຍ ຕ້ອງເຮັດແນວໃດ?",a:"ຕິດຕໍ່ຜູ້ຈັດງານ. ພະນັກງານຈະກວດຢືນຢັນຕົວຕົນ ແລະ ອອກລະຫັດໃໝ່ໃຫ້. ເບີໂທຢ່າງດຽວບໍ່ພຽງພໍສຳລັບການຢືນຢັນຕົວຕົນ."}];return c&&c.active&&c.min_age&&y.push({q:"ລຸ້ນອາວຸໂສ ນັບອາຍຸແນວໃດ?",a:`ນັບອາຍຸໃນວັນແຂ່ງຂັນ. ຕ້ອງມີອາຍຸ ${c.min_age} ປີຂຶ້ນໄປ ໃນວັນທີ ${h} ${S[f-1]} ${p}.`}),o&&o.active&&y.push({q:"ລຸ້ນ Family ຄິດເງິນແນວໃດ?",a:`${o.base_members} ຄົນທຳອິດ ${Ze(o.base_fee)} ກີບຕໍ່ທີມ. ຕັ້ງແຕ່ຄົນທີ ${o.base_members+1} ເປັນຕົ້ນໄປ ເພີ່ມຄົນລະ ${Ze(o.extra_fee)} ກີບ. ຈ່າຍຄັ້ງດຽວສຳລັບທັງທີມໄດ້.`}),y}Qe.exports=function({pool:n,config:c}){let o=de.Router(),p=de.json({limit:"64kb"}),f=F.rateLimiter({name:"create",windowMs:3600*1e3,max:40}),h=F.rateLimiter({name:"lookup",windowMs:900*1e3,max:60}),S=F.rateLimiter({name:"upload",windowMs:3600*1e3,max:20});o.get("/config",async(w,k)=>{let E=await O.loadSettings(n),T=await O.loadCategories(n),R=await O.activeParticipantCount(n),C=O.openState(E,R);k.set("Cache-Control","no-store"),k.json({eventName:E.eventName,eventDate:E.eventDate,timezone:"Asia/Vientiane",province:E.province,meetingPoint:E.meetingPoint||null,meetingTime:E.meetingTime||null,registrationDeadline:E.registrationDeadline||null,registration:C,whatsapp:E.whatsapp||null,contactNote:E.contactNote||null,benefits:E.benefits||null,instructions:E.instructions||null,logoUrl:E.logoAssetId?`/assets/${E.logoAssetId}`:null,imageUrls:(E.eventImageAssetIds||[]).map(_=>`/assets/${_}`),shirtSizes:E.shirtSizes||[],faq:en(E,T),payment:O.paymentInfo(E),categories:T.filter(_=>_.active).map(_=>({code:_.code,name:_.name_lo,distanceKm:_.distance_km,baseFee:_.base_fee,baseMembers:_.base_members,extraFee:_.extra_fee,minMembers:_.min_members,maxMembers:_.max_members,minAge:_.min_age}))})}),o.post("/registrations",f,p,async(w,k)=>{let E=w.body||{},T=E.idempotencyKey;if(typeof T!="string"||!/^[A-Za-z0-9_-]{16,100}$/.test(T))throw new q(400,"BAD_IDEMPOTENCY_KEY","ຄຳຂໍບໍ່ຖືກຕ້ອງ. ກະລຸນາໂຫຼດໜ້າໃໝ່");let R=await Xe(n,async L=>{let a=await O.loadSettings(L,{lock:!0}),d=await O.loadCategories(L),t=Xt(E,{categories:d,settings:a}),s=F.sha256(JSON.stringify({c:t.category,t:t.teamName,n:t.contactName,p:t.contactPhoneNorm,e:t.emergencyName,ep:t.emergencyPhone,note:t.note,m:t.members.map(A=>[A.fullName,A.gender,A.dob,A.shirtSize])})),l=await L.query("SELECT id, reference, request_fingerprint FROM registrations WHERE idempotency_key=$1",[T]);if(l.rowCount){if(l.rows[0].request_fingerprint!==s)throw new q(409,"IDEMPOTENCY_CONFLICT","ຄຳຂໍນີ້ຖືກໃຊ້ກັບຂໍ້ມູນອື່ນແລ້ວ. ກະລຸນາໂຫຼດໜ້າໃໝ່ ແລ້ວລົງທະບຽນອີກຄັ້ງ");return{id:l.rows[0].id,reference:l.rows[0].reference,replay:!0}}let i=await O.activeParticipantCount(L),r=O.openState(a,i);if(!r.open)throw new q(409,"REGISTRATION_CLOSED",r.reason);if(r.remaining!==null&&r.remaining<t.members.length)throw new q(409,"CAPACITY",`ບ່ອນວ່າງເຫຼືອ ${r.remaining} ຄົນ ບໍ່ພຽງພໍສຳລັບ ${t.members.length} ຄົນ`);if(E.acknowledgeDuplicate!==!0){let A=t.members.map(j=>Je(j.fullName)),$=t.members.map(j=>j.dob),W=await L.query(`SELECT DISTINCT lower(regexp_replace(p.full_name,'\\s+',' ','g')) AS n, p.dob::text AS d
             FROM participants p JOIN registrations r ON r.id=p.registration_id
            WHERE r.status='active' AND (lower(regexp_replace(p.full_name,'\\s+',' ','g')), p.dob::text) IN
                  (SELECT * FROM unnest($1::text[], $2::text[]))`,[A,$]);if(W.rowCount){let j=new Set(W.rows.map(z=>`${z.n}|${z.d}`)),ut=t.members.filter(z=>j.has(`${Je(z.fullName)}|${z.dob}`)).map(z=>z.fullName);throw new q(409,"POSSIBLE_DUPLICATE","ອາດມີການລົງທະບຽນຊ້ຳ: ມີຜູ້ລົງທະບຽນທີ່ມີຊື່ ແລະ ວັນເກີດດຽວກັນແລ້ວ. ຖ້າແນ່ໃຈວ່າບໍ່ແມ່ນການລົງທະບຽນຊ້ຳ ກົດ “ຢືນຢັນສົ່ງຕໍ່”",{names:ut})}}let u=F.accessCodeFor(c.appSecret,T),m;for(let A=0;A<10&&(m=F.newReference(),!!(await L.query("SELECT 1 FROM registrations WHERE reference=$1",[m])).rowCount);A++);let v=(await L.query(`INSERT INTO registrations (reference, access_hash, idempotency_key, request_fingerprint, reg_type, category_code, distance_km,
           team_name, contact_name, contact_phone, contact_phone_norm, emergency_name, emergency_phone, note, consent_at,
           member_count, fee_base, fee_base_members, fee_extra_each, fee_extra_count, total_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),$15,$16,$17,$18,$19,$20) RETURNING id`,[m,F.hashAccessCode(u),T,s,t.type,t.category,t.distanceKm,t.teamName,t.contactName,t.contactPhone,t.contactPhoneNorm,t.emergencyName,t.emergencyPhone,t.note,t.members.length,t.fee.base,t.fee.baseMembers,t.fee.extraEach,t.fee.extraCount,t.fee.total])).rows[0].id;for(let A=0;A<t.members.length;A++){let $=t.members[A];await L.query("INSERT INTO participants (registration_id, position, full_name, gender, dob, shirt_size) VALUES ($1,$2,$3,$4,$5,$6)",[v,A+1,$.fullName,$.gender,$.dob,$.shirtSize])}return{id:v,reference:m,replay:!1}}),C=await O.loadSettings(n),_=await O.getRegistrationFull(n,R.id);k.status(R.replay?200:201).json({reference:R.reference,accessCode:F.accessCodeFor(c.appSecret,T),replay:R.replay,registration:O.publicRegistrationView(_,C)})});async function y(w){let k=String(w.get("X-Reg-Ref")||"").trim().toUpperCase(),E=w.get("X-Reg-Code")||"",T=new q(404,"NOT_FOUND","ບໍ່ພົບການລົງທະບຽນ ຫຼື ລະຫັດເຂົ້າເບິ່ງບໍ່ຖືກຕ້ອງ");if(!/^LNT26-[0-9A-Z]{6}$/.test(k)||F.normalizeCode(E).length!==12)throw T;let R=await n.query("SELECT id, access_hash FROM registrations WHERE reference=$1",[k]),C=R.rowCount?R.rows[0].access_hash:"0".repeat(64),_=F.safeEqualHex(C,F.hashAccessCode(E));if(!R.rowCount||!_)throw T;return R.rows[0].id}return o.get("/my",h,async(w,k)=>{let E=await y(w),T=await O.loadSettings(n),R=await O.getRegistrationFull(n,E);k.set("Cache-Control","no-store"),k.json({registration:O.publicRegistrationView(R,T)})}),o.post("/my/proof",S,de.raw({type:()=>!0,limit:Zt}),async(w,k)=>{let E=await y(w),T=w.body;if(!Buffer.isBuffer(T)||!T.length)throw new q(400,"EMPTY_FILE","ບໍ່ພົບໄຟລ໌. ກະລຸນາເລືອກຮູບຫຼັກຖານການໂອນ");let R=F.sniffImage(T);if(!R)throw new q(415,"BAD_FILE_TYPE","ຮັບສະເພາະຮູບ JPG, PNG ຫຼື WebP ເທົ່ານັ້ນ");await Xe(n,async L=>{let a=(await L.query("SELECT status, payment_status FROM registrations WHERE id=$1 FOR UPDATE",[E])).rows[0];if(a.status!=="active")throw new q(409,"CANCELLED","ການລົງທະບຽນນີ້ຖືກຍົກເລີກແລ້ວ. ກະລຸນາຕິດຕໍ່ຜູ້ຈັດງານ");if(a.payment_status==="confirmed")throw new q(409,"ALREADY_CONFIRMED","ການຈ່າຍເງິນໄດ້ຮັບການຢືນຢັນແລ້ວ ບໍ່ຈຳເປັນຕ້ອງສົ່ງຫຼັກຖານອີກ");if((await L.query("SELECT count(*)::int AS n FROM payment_proofs WHERE registration_id=$1",[E])).rows[0].n>=Qt)throw new q(409,"TOO_MANY_PROOFS","ສົ່ງຫຼັກຖານຄົບຈຳນວນສູງສຸດແລ້ວ. ກະລຸນາຕິດຕໍ່ຜູ້ຈັດງານ");await L.query("UPDATE payment_proofs SET review_status='superseded' WHERE registration_id=$1 AND review_status='pending'",[E]),await L.query("INSERT INTO payment_proofs (registration_id, content_type, byte_size, sha256, data) VALUES ($1,$2,$3,$4,$5)",[E,R,T.length,Jt.createHash("sha256").update(T).digest("hex"),T]),await L.query("UPDATE registrations SET payment_status='awaiting_review', updated_at=now() WHERE id=$1",[E]),await L.query("INSERT INTO payment_events (registration_id, action) VALUES ($1,'proof_uploaded')",[E])});let C=await O.loadSettings(n),_=await O.getRegistrationFull(n,E);k.status(201).json({registration:O.publicRegistrationView(_,C)})}),o}});var st=M((_n,fe)=>{"use strict";var le=Z(),tn=ee(),{AppError:N,bad:x,cleanText:B,normalizePhone:pe,parseDate:tt,ageOn:J,computeFee:nn,GENDERS:an,CATEGORY_DISTANCE:sn}=V(),I=ie(),b=ce(),{tx:D}=G(),me="lnt_admin",nt=12,ue={"reg.read":["owner","accountant","staff"],"reg.edit":["owner","staff"],"reg.cancel":["owner","staff"],"pay.read":["owner","accountant"],"pay.review":["owner","accountant"],"pay.reopen":["owner"],"race.ops":["owner","staff"],"export.participants":["owner","staff","accountant"],"export.payments":["owner","accountant"],"reports.finance":["owner","accountant"],"reports.ops":["owner","staff","accountant"],settings:["owner"],"staff.manage":["owner"],"audit.read":["owner"]},Y=(e,n)=>!!e&&ue[n].includes(e.role);function at(e){let n={};for(let c of String(e||"").split(";")){let o=c.indexOf("=");o>0&&(n[c.slice(0,o).trim()]=decodeURIComponent(c.slice(o+1).trim()))}return n}var rn=new Set(["confirmed","awaiting_review"]);fe.exports=function({pool:n,config:c}){let o=le.Router(),p=le.json({limit:"64kb"}),f=I.rateLimiter({name:"login",windowMs:900*1e3,max:10});function h(a,d,t){let s=[`${me}=${d}`,"Path=/","HttpOnly","SameSite=Strict",`Max-Age=${t}`];c.cookieSecure&&s.push("Secure"),a.set("Set-Cookie",s.join("; "))}o.use((a,d,t)=>{if(d.set("Cache-Control","no-store"),!["GET","HEAD"].includes(a.method)&&a.get("X-Requested-With")!=="lnt-admin")return t(new N(403,"CSRF","ຄຳຂໍຖືກປະຕິເສດ"));t()});async function S(a){let d=at(a.headers.cookie)[me];return!d||d.length>100?null:(await n.query(`SELECT s.id, s.username, s.display_name, s.role FROM sessions x JOIN staff s ON s.id=x.staff_id
        WHERE x.token_hash=$1 AND x.expires_at > now() AND s.active`,[I.sha256(d)])).rows[0]||null}let y=a=>async(d,t,s)=>{let l=await S(d);if(!l)return s(new N(401,"UNAUTHENTICATED","ກະລຸນາເຂົ້າສູ່ລະບົບ"));if(a&&!Y(l,a))return s(new N(403,"FORBIDDEN","ທ່ານບໍ່ມີສິດເຮັດລາຍການນີ້"));d.staff=l,s()},w=a=>{let d=Number(a);if(!Number.isSafeInteger(d)||d<=0)throw new N(404,"NOT_FOUND","ບໍ່ພົບຂໍ້ມູນ");return d};o.post("/login",f,p,async(a,d)=>{let{username:t,password:s}=a.body||{},l=new N(401,"BAD_LOGIN","ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ");if(typeof t!="string"||typeof s!="string"||s.length>200)throw l;let i=await n.query("SELECT * FROM staff WHERE lower(username)=lower($1) AND active",[t.trim()]);if(!(i.rowCount?I.verifyPassword(s,i.rows[0].password_hash):(I.verifyPassword(s,I.hashPassword("x".repeat(12))),!1)))throw l;let u=i.rows[0],m=tn.randomBytes(32).toString("base64url");await n.query(`INSERT INTO sessions (token_hash, staff_id, expires_at) VALUES ($1,$2, now() + interval '${nt} hours')`,[I.sha256(m),u.id]),await n.query("UPDATE staff SET last_login_at=now() WHERE id=$1",[u.id]),await n.query("DELETE FROM sessions WHERE expires_at < now()"),h(d,m,nt*3600),await b.audit(n,u.id,"login","staff",u.id),d.json({staff:{id:u.id,username:u.username,displayName:u.display_name,role:u.role}})}),o.get("/setup-status",async(a,d)=>{let t=(await n.query("SELECT count(*)::int n FROM staff WHERE role='owner' AND active")).rows[0].n,s=(await n.query("SELECT 1 FROM setup_code WHERE used_at IS NULL")).rowCount;d.json({needed:t===0&&s>0})}),o.post("/setup",f,p,async(a,d)=>{let t=a.body||{},s=String(t.username||"").trim();if(!/^[A-Za-z0-9._-]{3,40}$/.test(s))throw x("VALIDATION","ຊື່ຜູ້ໃຊ້: ຕົວອັກສອນອັງກິດ/ຕົວເລກ 3–40 ຕົວ");let l=B(t.displayName,80)||s;I.checkPasswordStrength(t.password);let i=await D(n,async r=>{let u=(await r.query("SELECT code_hash FROM setup_code WHERE used_at IS NULL FOR UPDATE")).rows[0],m=(await r.query("SELECT count(*)::int n FROM staff WHERE role='owner'")).rows[0].n;if(!u||m>0)throw new N(409,"SETUP_DONE","ການຕັ້ງຄ່າຄັ້ງທຳອິດສຳເລັດແລ້ວ. ກະລຸນາເຂົ້າສູ່ລະບົບ");if(!I.safeEqualHex(u.code_hash,I.sha256("setup:"+String(t.code||"").trim().toUpperCase())))throw new N(403,"BAD_SETUP_CODE","ລະຫັດຕັ້ງຄ່າບໍ່ຖືກຕ້ອງ");let g=(await r.query("INSERT INTO staff (username, display_name, password_hash, role) VALUES ($1,$2,$3,'owner') RETURNING id",[s,l,I.hashPassword(t.password)])).rows[0];return await r.query("UPDATE setup_code SET used_at=now()"),await b.audit(r,g.id,"staff.create","staff",g.id,{username:s,role:"owner",via:"setup"}),g.id});d.status(201).json({id:i})}),o.post("/logout",async(a,d)=>{let t=at(a.headers.cookie)[me];t&&await n.query("DELETE FROM sessions WHERE token_hash=$1",[I.sha256(t)]),h(d,"",0),d.json({ok:!0})}),o.get("/me",y(null),(a,d)=>{let t=a.staff;d.json({staff:{id:t.id,username:t.username,displayName:t.display_name,role:t.role},permissions:Object.keys(ue).filter(s=>Y(t,s))})}),o.get("/dashboard",y("reg.read"),async(a,d)=>{let t=await b.loadSettings(n),s=await n.query(`
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
      FROM registrations`),l=await n.query(`
      SELECT count(*)::int AS participants,
             count(*) FILTER (WHERE p.kit_collected_at IS NOT NULL)::int AS kit_collected,
             count(*) FILTER (WHERE p.checked_in_at IS NOT NULL)::int AS checked_in,
             count(*) FILTER (WHERE p.bib IS NOT NULL)::int AS with_bib
        FROM participants p JOIN registrations r ON r.id=p.registration_id WHERE r.status='active'`),i=await n.query(`
      SELECT r.category_code, count(DISTINCT r.id)::int AS registrations, count(p.id)::int AS participants
        FROM registrations r JOIN participants p ON p.registration_id=r.id WHERE r.status='active' GROUP BY 1`),r={...s.rows[0],...l.rows[0],byCategory:i.rows};Y(a.staff,"reports.finance")||(delete r.confirmed_revenue,delete r.outstanding),r.capacity=t.capacity||null,r.registration=b.openState(t,r.participants),d.json(r)}),o.get("/registrations",y("reg.read"),async(a,d)=>{let t=[],s=[],l=(g,v)=>{s.push(v),t.push(g.replace(/\?/g,`$${s.length}`))},i=String(a.query.q||"").trim().slice(0,100);if(i){let g="%"+i.replace(/[\\%_]/g,j=>"\\"+j)+"%",v=pe(i)||(i.replace(/\D/g,"").length>=4?i.replace(/\D/g,""):null);s.push(g);let A=`$${s.length}`,$="";v&&(s.push("%"+v.replace(/^\+/,"")+"%"),$=` OR r.contact_phone_norm LIKE $${s.length}`),s.push(i.toUpperCase());let W=`$${s.length}`;t.push(`(r.reference ILIKE ${A} OR r.team_name ILIKE ${A} OR r.contact_name ILIKE ${A}${$}
        OR EXISTS (SELECT 1 FROM participants p WHERE p.registration_id=r.id AND (p.full_name ILIKE ${A} OR upper(p.bib)=${W})))`)}a.query.category&&l("r.category_code=?",String(a.query.category)),a.query.payment&&l("r.payment_status=?",String(a.query.payment)),a.query.status&&l("r.status=?",String(a.query.status)),a.query.distance&&l("r.distance_km=?",Number(a.query.distance)||0),a.query.gender&&l("EXISTS (SELECT 1 FROM participants p WHERE p.registration_id=r.id AND p.gender=?)",String(a.query.gender));let r=Math.max(1,Math.min(1e3,Number(a.query.page)||1)),u=`
      SELECT r.id, r.reference, r.reg_type, r.category_code, r.distance_km, r.team_name, r.contact_name, r.contact_phone,
             r.member_count, r.total_amount, r.payment_status, r.status, r.created_at,
             (SELECT string_agg(p.full_name || coalesce(' #' || p.bib, ''), ', ' ORDER BY p.position) FROM participants p WHERE p.registration_id=r.id) AS members,
             count(*) OVER()::int AS total_rows
        FROM registrations r ${t.length?"WHERE "+t.join(" AND "):""}
       ORDER BY r.created_at DESC LIMIT 50 OFFSET ${(r-1)*50}`,m=(await n.query(u,s)).rows;d.json({rows:m.map(({total_rows:g,...v})=>v),total:m[0]?m[0].total_rows:0,page:r})}),o.get("/registrations/:id",y("reg.read"),async(a,d)=>{let t=w(a.params.id),s=await b.getRegistrationFull(n,t);if(!s)throw new N(404,"NOT_FOUND","ບໍ່ພົບການລົງທະບຽນ");delete s.access_hash,delete s.idempotency_key,delete s.request_fingerprint;let l=await b.loadSettings(n);s.participants.forEach(i=>{i.age_on_event=J(i.dob,l.eventDate)}),Y(a.staff,"pay.read")||(s.proofs=s.proofs.map(i=>({id:i.id,review_status:i.review_status,uploaded_at:i.uploaded_at}))),s.payment_events=(await n.query(`SELECT e.action, e.amount, e.note, e.created_at, s.display_name AS staff FROM payment_events e LEFT JOIN staff s ON s.id=e.staff_id
        WHERE e.registration_id=$1 ORDER BY e.created_at`,[t])).rows,s.audit=(await n.query(`SELECT a.action, a.details, a.created_at, s.display_name AS staff FROM audit_log a LEFT JOIN staff s ON s.id=a.staff_id
        WHERE a.entity_type='registration' AND a.entity_id=$1 ORDER BY a.created_at DESC LIMIT 100`,[String(t)])).rows,d.json({registration:s})});async function k(a,d){let t=await a.query("SELECT * FROM registrations WHERE id=$1 FOR UPDATE",[d]);if(!t.rowCount)throw new N(404,"NOT_FOUND","ບໍ່ພົບການລົງທະບຽນ");return t.rows[0]}let E=a=>{let d=B(a&&a.reason,300);if(!d)throw x("REASON_REQUIRED","ກະລຸນາໃສ່ເຫດຜົນ");return d};o.patch("/registrations/:id",y("reg.edit"),p,async(a,d)=>{let t=w(a.params.id),s=a.body||{};await D(n,async l=>{let i=await k(l,t),r={},u=(g,v)=>{v!==i[g]&&(r[g]={from:i[g],to:v})};if(s.contactName!==void 0){let g=B(s.contactName,120);if(!g)throw x("VALIDATION","ຊື່ຜູ້ຕິດຕໍ່ບໍ່ຖືກຕ້ອງ");u("contact_name",g)}if(s.contactPhone!==void 0){let g=B(s.contactPhone,30),v=pe(g||"");if(!v)throw x("VALIDATION","ເບີ WhatsApp ບໍ່ຖືກຕ້ອງ");u("contact_phone",g),r.contact_phone&&(r.contact_phone_norm={from:i.contact_phone_norm,to:v})}if(s.emergencyName!==void 0&&u("emergency_name",B(s.emergencyName,120)||null),s.emergencyPhone!==void 0){let g=B(s.emergencyPhone,30)||null;if(g&&!pe(g))throw x("VALIDATION","ເບີສຸກເສີນບໍ່ຖືກຕ້ອງ");u("emergency_phone",g)}if(s.teamName!==void 0&&i.reg_type==="family"){let g=B(s.teamName,120);if(!g)throw x("VALIDATION","ຊື່ທີມບໍ່ຖືກຕ້ອງ");u("team_name",g)}if(s.note!==void 0){let g=B(s.note,500);if(g===null)throw x("VALIDATION","ໝາຍເຫດຍາວເກີນ");u("note",g||null)}let m=Object.keys(r);m.length&&(await l.query(`UPDATE registrations SET ${m.map((g,v)=>`${g}=$${v+2}`).join(", ")}, updated_at=now() WHERE id=$1`,[t,...m.map(g=>r[g].to)]),await b.audit(l,a.staff.id,"registration.edit","registration",t,{changes:r}))}),d.json({ok:!0})});async function T(a,d,t,s,l,i,r){if(d.status!=="active")throw new N(409,"CANCELLED","ການລົງທະບຽນນີ້ຖືກຍົກເລີກແລ້ວ");if(rn.has(d.payment_status))throw new N(409,"PRICE_LOCKED",d.payment_status==="confirmed"?"ການລົງທະບຽນນີ້ຈ່າຍເງິນແລ້ວ. ບໍ່ອະນຸຍາດໃຫ້ປ່ຽນລາຄາ":"ມີຫຼັກຖານການຈ່າຍລໍຖ້າກວດ. ກະລຸນາກວດ ແລະ ປະຕິເສດຫຼັກຖານກ່ອນ ຈຶ່ງປ່ຽນລາຄາໄດ້");let u=(await a.query("SELECT * FROM categories WHERE code=$1",[t])).rows[0],m=nn(u,s);return await a.query(`UPDATE registrations SET category_code=$2, distance_km=$3, member_count=$4, fee_base=$5, fee_base_members=$6,
        fee_extra_each=$7, fee_extra_count=$8, total_amount=$9, priced_at=now(), updated_at=now() WHERE id=$1`,[d.id,t,sn[t],s,m.base,m.baseMembers,m.extraEach,m.extraCount,m.total]),await b.audit(a,l,r,"registration",d.id,{reason:i,from:{category:d.category_code,members:d.member_count,total:d.total_amount},to:{category:t,members:s,total:m.total}}),m}let R=a=>{if(a.recalculate!==!0)throw new N(409,"RECALC_REQUIRED","ການປ່ຽນນີ້ຈະປ່ຽນລາຄາ. ກະລຸນາຢືນຢັນການຄິດໄລ່ລາຄາໃໝ່");return E(a)};o.post("/registrations/:id/recalculate",y("reg.edit"),p,async(a,d)=>{let t=w(a.params.id),s=E(a.body),l=await D(n,async i=>{let r=await k(i,t);return T(i,r,r.category_code,r.member_count,a.staff.id,s,"registration.recalculate")});d.json({ok:!0,fee:l})}),o.post("/registrations/:id/category",y("reg.edit"),p,async(a,d)=>{let t=w(a.params.id),s=a.body||{},l=R(s),i=await D(n,async r=>{let u=await k(r,t);if(u.reg_type!=="individual"||!["general","senior"].includes(s.category))throw x("BAD_CATEGORY_CHANGE","ປ່ຽນລຸ້ນໄດ້ສະເພາະ ລຸ້ນທົ່ວໄປ ↔ ລຸ້ນອາວຸໂສ");if(s.category===u.category_code)throw x("NO_CHANGE","ລຸ້ນນີ້ຖືກເລືອກຢູ່ແລ້ວ");let m=(await r.query("SELECT * FROM categories WHERE code=$1",[s.category])).rows[0];if(m.min_age){let g=await b.loadSettings(r),v=(await r.query("SELECT dob FROM participants WHERE registration_id=$1",[t])).rows[0];if(J(v.dob,g.eventDate)<m.min_age)throw x("AGE",`ອາຍຸບໍ່ເຖິງ ${m.min_age} ປີ ໃນວັນແຂ່ງຂັນ`)}return T(r,u,s.category,u.member_count,a.staff.id,l,"registration.category_change")});d.json({ok:!0,fee:i})});function C(a,d,t){let s=B(a.fullName,120);if(!s)throw x("VALIDATION","ກະລຸນາໃສ່ຊື່");if(!an.includes(a.gender))throw x("VALIDATION","ກະລຸນາເລືອກເພດ");if(!tt(a.dob)||a.dob<"1900-01-01"||J(a.dob,d.eventDate)<0)throw x("VALIDATION","ວັນເກີດບໍ່ຖືກຕ້ອງ");if(t&&J(a.dob,d.eventDate)<t)throw x("AGE",`ອາຍຸບໍ່ເຖິງ ${t} ປີ ໃນວັນແຂ່ງຂັນ`);if(!(d.shirtSizes||[]).includes(a.shirtSize))throw x("VALIDATION","ຂະໜາດເສື້ອບໍ່ຖືກຕ້ອງ");return{fullName:s,gender:a.gender,dob:a.dob,shirtSize:a.shirtSize}}o.post("/registrations/:id/members",y("reg.edit"),p,async(a,d)=>{let t=w(a.params.id),s=a.body||{},l=R(s);await D(n,async i=>{let r=await k(i,t);if(r.reg_type!=="family")throw x("NOT_FAMILY","ເພີ່ມສະມາຊິກໄດ້ສະເພາະລຸ້ນ Family");let u=await b.loadSettings(i,{lock:!0}),m=(await i.query("SELECT * FROM categories WHERE code=$1",[r.category_code])).rows[0];if(r.member_count+1>m.max_members)throw x("TOO_MANY_MEMBERS",`ສູງສຸດ ${m.max_members} ຄົນ`);let g=await b.activeParticipantCount(i);if(u.capacity&&g+1>Number(u.capacity))throw new N(409,"CAPACITY","ບ່ອນວ່າງເຕັມແລ້ວ");let v=C(s.member||{},u,m.min_age),A=(await i.query("SELECT coalesce(max(position),0)+1 AS n FROM participants WHERE registration_id=$1",[t])).rows[0].n;await T(i,r,r.category_code,r.member_count+1,a.staff.id,l,"registration.member_add"),await i.query("INSERT INTO participants (registration_id, position, full_name, gender, dob, shirt_size) VALUES ($1,$2,$3,$4,$5,$6)",[t,A,v.fullName,v.gender,v.dob,v.shirtSize]),await b.audit(i,a.staff.id,"participant.add","registration",t,{member:v.fullName})}),d.json({ok:!0})}),o.delete("/participants/:pid",y("reg.edit"),p,async(a,d)=>{let t=w(a.params.pid),s=a.body||{},l=R(s);await D(n,async i=>{let r=(await i.query("SELECT * FROM participants WHERE id=$1",[t])).rows[0];if(!r)throw new N(404,"NOT_FOUND","ບໍ່ພົບຜູ້ເຂົ້າຮ່ວມ");let u=await k(i,r.registration_id);if(u.reg_type!=="family")throw x("NOT_FAMILY","ລຶບສະມາຊິກໄດ້ສະເພາະລຸ້ນ Family");let m=(await i.query("SELECT * FROM categories WHERE code=$1",[u.category_code])).rows[0];if(u.member_count-1<m.min_members)throw x("TOO_FEW_MEMBERS",`ລຸ້ນ Family ຕ້ອງມີຢ່າງໜ້ອຍ ${m.min_members} ຄົນ`);await T(i,u,u.category_code,u.member_count-1,a.staff.id,l,"registration.member_remove"),await i.query("DELETE FROM participants WHERE id=$1",[t]),await b.audit(i,a.staff.id,"participant.remove","registration",u.id,{member:{name:r.full_name,gender:r.gender,dob:r.dob,shirt:r.shirt_size,bib:r.bib}})}),d.json({ok:!0})}),o.patch("/participants/:pid",y("reg.edit"),p,async(a,d)=>{let t=w(a.params.pid);await D(n,async s=>{let l=(await s.query("SELECT * FROM participants WHERE id=$1 FOR UPDATE",[t])).rows[0];if(!l)throw new N(404,"NOT_FOUND","ບໍ່ພົບຜູ້ເຂົ້າຮ່ວມ");let i=(await s.query("SELECT category_code FROM registrations WHERE id=$1",[l.registration_id])).rows[0],r=(await s.query("SELECT min_age FROM categories WHERE code=$1",[i.category_code])).rows[0],u=await b.loadSettings(s),m=a.body||{},g=C({fullName:m.fullName??l.full_name,gender:m.gender??l.gender,dob:m.dob??l.dob,shirtSize:m.shirtSize??l.shirt_size},u,r.min_age),v={};for(let[A,$]of[["fullName","full_name"],["gender","gender"],["dob","dob"],["shirtSize","shirt_size"]])g[A]!==l[$]&&(v[$]={from:l[$],to:g[A]});Object.keys(v).length&&(await s.query("UPDATE participants SET full_name=$2, gender=$3, dob=$4, shirt_size=$5 WHERE id=$1",[t,g.fullName,g.gender,g.dob,g.shirtSize]),await b.audit(s,a.staff.id,"participant.edit","registration",l.registration_id,{participant:t,changes:v}))}),d.json({ok:!0})}),o.post("/registrations/:id/cancel",y("reg.cancel"),p,async(a,d)=>{let t=w(a.params.id),s=E(a.body);await D(n,async l=>{let i=await k(l,t);if(i.status==="cancelled")throw new N(409,"ALREADY","ຍົກເລີກແລ້ວ");if(i.payment_status==="confirmed"&&a.staff.role!=="owner")throw new N(403,"FORBIDDEN","ການລົງທະບຽນທີ່ຈ່າຍແລ້ວ ຕ້ອງໃຫ້ເຈົ້າຂອງງານເປັນຜູ້ຍົກເລີກ");await l.query("UPDATE registrations SET status='cancelled', cancelled_at=now(), cancelled_by=$2, cancel_reason=$3, updated_at=now() WHERE id=$1",[t,a.staff.id,s]),await b.audit(l,a.staff.id,"registration.cancel","registration",t,{reason:s,paymentStatus:i.payment_status,total:i.total_amount})}),d.json({ok:!0})}),o.post("/registrations/:id/reinstate",y("settings"),p,async(a,d)=>{let t=w(a.params.id),s=E(a.body);await D(n,async l=>{let i=await b.loadSettings(l,{lock:!0}),r=await k(l,t);if(r.status!=="cancelled")throw new N(409,"NOT_CANCELLED","ການລົງທະບຽນນີ້ບໍ່ໄດ້ຖືກຍົກເລີກ");let u=await b.activeParticipantCount(l);if(i.capacity&&u+r.member_count>Number(i.capacity))throw new N(409,"CAPACITY","ບ່ອນວ່າງບໍ່ພໍ");await l.query("UPDATE registrations SET status='active', updated_at=now() WHERE id=$1",[t]),await b.audit(l,a.staff.id,"registration.reinstate","registration",t,{reason:s})}),d.json({ok:!0})}),o.post("/registrations/:id/access-code",y("reg.edit"),async(a,d)=>{let t=w(a.params.id),s=I.randomAccessCode(),l=await n.query("UPDATE registrations SET access_hash=$2, updated_at=now() WHERE id=$1 RETURNING reference",[t,I.hashAccessCode(s)]);if(!l.rowCount)throw new N(404,"NOT_FOUND","ບໍ່ພົບການລົງທະບຽນ");await b.audit(n,a.staff.id,"registration.access_code_reset","registration",t,{}),d.json({reference:l.rows[0].reference,accessCode:s})}),o.get("/proofs/:pid",y("pay.read"),async(a,d)=>{let t=w(a.params.pid),s=await n.query("SELECT content_type, data FROM payment_proofs WHERE id=$1",[t]);if(!s.rowCount)throw new N(404,"NOT_FOUND","ບໍ່ພົບໄຟລ໌");d.set({"Content-Type":s.rows[0].content_type,"Content-Disposition":"inline","Cache-Control":"private, no-store","Content-Security-Policy":"default-src 'none'; sandbox"}),d.send(s.rows[0].data)}),o.post("/registrations/:id/payment",y("pay.review"),p,async(a,d)=>{let t=w(a.params.id),s=a.body||{},l=B(s.note,500)||null,i=await D(n,async r=>{let u=await k(r,t),m=(await r.query("SELECT id FROM payment_proofs WHERE registration_id=$1 AND review_status='pending' ORDER BY uploaded_at DESC LIMIT 1",[t])).rows[0];if(s.action==="confirm"){if(u.status!=="active")throw new N(409,"CANCELLED","ການລົງທະບຽນນີ້ຖືກຍົກເລີກແລ້ວ");if(u.payment_status==="confirmed")throw new N(409,"ALREADY_CONFIRMED","ຢືນຢັນການຈ່າຍແລ້ວ");if(!m&&!l)throw x("NOTE_REQUIRED","ບໍ່ມີຫຼັກຖານລໍຖ້າກວດ. ກະລຸນາໃສ່ໝາຍເຫດ (ເຊັ່ນ: ຮັບເງິນສົດ)");await r.query(`UPDATE registrations SET payment_status='confirmed', confirmed_amount=total_amount, confirmed_at=now(), confirmed_by=$2,
            payment_note=$3, updated_at=now() WHERE id=$1`,[t,a.staff.id,l]),m&&await r.query("UPDATE payment_proofs SET review_status='accepted', reviewed_by=$2, reviewed_at=now() WHERE id=$1",[m.id,a.staff.id]),await r.query("INSERT INTO payment_events (registration_id, action, amount, note, staff_id) VALUES ($1,'confirmed',$2,$3,$4)",[t,u.total_amount,l,a.staff.id])}else if(s.action==="reject"){if(u.payment_status!=="awaiting_review")throw new N(409,"BAD_STATE","ປະຕິເສດໄດ້ສະເພາະລາຍການທີ່ລໍຖ້າກວດສອບ");if(!l)throw x("NOTE_REQUIRED","ກະລຸນາໃສ່ເຫດຜົນທີ່ປະຕິເສດ (ຜູ້ລົງທະບຽນຈະເຫັນຂໍ້ຄວາມນີ້)");await r.query("UPDATE registrations SET payment_status='rejected', payment_note=$2, updated_at=now() WHERE id=$1",[t,l]),await r.query("UPDATE payment_proofs SET review_status='rejected', reviewed_by=$2, reviewed_at=now() WHERE registration_id=$1 AND review_status='pending'",[t,a.staff.id]),await r.query("INSERT INTO payment_events (registration_id, action, note, staff_id) VALUES ($1,'rejected',$2,$3)",[t,l,a.staff.id])}else if(s.action==="reopen"){if(!Y(a.staff,"pay.reopen"))throw new N(403,"FORBIDDEN","ສະເພາະເຈົ້າຂອງງານເທົ່ານັ້ນ");if(u.payment_status!=="confirmed")throw new N(409,"BAD_STATE","ລາຍການນີ້ຍັງບໍ່ໄດ້ຢືນຢັນການຈ່າຍ");if(!l)throw x("NOTE_REQUIRED","ກະລຸນາໃສ່ເຫດຜົນ");await r.query(`UPDATE registrations SET payment_status='awaiting_review', confirmed_amount=NULL, confirmed_at=NULL, confirmed_by=NULL,
            payment_note=$2, updated_at=now() WHERE id=$1`,[t,l]),await r.query("INSERT INTO payment_events (registration_id, action, amount, note, staff_id) VALUES ($1,'reopened',$2,$3,$4)",[t,u.confirmed_amount,l,a.staff.id])}else throw x("BAD_ACTION","ຄຳສັ່ງບໍ່ຖືກຕ້ອງ");return await b.audit(r,a.staff.id,`payment.${s.action}`,"registration",t,{note:l,total:u.total_amount,from:u.payment_status}),(await r.query("SELECT payment_status FROM registrations WHERE id=$1",[t])).rows[0]});d.json({ok:!0,paymentStatus:i.payment_status})});async function _(a,d){let t=(await a.query("SELECT p.*, r.status AS reg_status, r.category_code FROM participants p JOIN registrations r ON r.id=p.registration_id WHERE p.id=$1 FOR UPDATE OF p",[d])).rows[0];if(!t)throw new N(404,"NOT_FOUND","ບໍ່ພົບຜູ້ເຂົ້າຮ່ວມ");return t}o.post("/participants/:pid/bib",y("race.ops"),p,async(a,d)=>{let t=w(a.params.pid),s=a.body||{};try{let l=await D(n,async i=>{await i.query("SELECT pg_advisory_xact_lock(7262026)");let r=await _(i,t);if(r.reg_status!=="active")throw new N(409,"CANCELLED","ການລົງທະບຽນນີ້ຖືກຍົກເລີກແລ້ວ");let u;if(s.auto===!0){let m=await b.loadSettings(i),g=Number((m.bibStart||{})[r.category_code])||{general:1001,senior:3001,family:5001}[r.category_code],v=(await i.query(`SELECT max(p.bib::int) AS m FROM participants p JOIN registrations r ON r.id=p.registration_id
              WHERE r.category_code=$1 AND p.bib ~ '^[0-9]{1,9}$' AND p.bib::int >= $2`,[r.category_code,g])).rows[0].m,A=v?v+1:g;for(;(await i.query("SELECT 1 FROM participants WHERE upper(bib)=$1",[String(A)])).rowCount;)A++;u=String(A)}else if(u=String(s.bib||"").trim().toUpperCase(),!/^[0-9A-Z-]{1,10}$/.test(u))throw x("BAD_BIB","BIB ຕ້ອງເປັນຕົວເລກ/ຕົວອັກສອນອັງກິດ ບໍ່ເກີນ 10 ຕົວ");return r.bib&&r.bib.toUpperCase()===u||(await i.query("UPDATE participants SET bib=$2, bib_assigned_at=now() WHERE id=$1",[t,u]),await b.audit(i,a.staff.id,"participant.bib","registration",r.registration_id,{participant:t,name:r.full_name,from:r.bib,to:u})),u});d.json({ok:!0,bib:l})}catch(l){throw l.code==="23505"?new N(409,"BIB_TAKEN","BIB ນີ້ຖືກໃຊ້ແລ້ວ"):l}}),o.delete("/participants/:pid/bib",y("race.ops"),async(a,d)=>{let t=w(a.params.pid);await D(n,async s=>{let l=await _(s,t);await s.query("UPDATE participants SET bib=NULL, bib_assigned_at=NULL WHERE id=$1",[t]),await b.audit(s,a.staff.id,"participant.bib_remove","registration",l.registration_id,{participant:t,name:l.full_name,from:l.bib})}),d.json({ok:!0})});for(let[a,d,t,s]of[["kit","kit_collected_at","kit_collected_by","participant.kit"],["checkin","checked_in_at","checked_in_by","participant.checkin"]])o.post(`/participants/:pid/${a}`,y("race.ops"),p,async(l,i)=>{let r=w(l.params.pid),u=(l.body||{}).value===!0;await D(n,async m=>{let g=await _(m,r);if(u&&g.reg_status!=="active")throw new N(409,"CANCELLED","ການລົງທະບຽນນີ້ຖືກຍົກເລີກແລ້ວ");u!==!!g[d]&&(await m.query(`UPDATE participants SET ${d}=${u?"now()":"NULL"}, ${t}=$2 WHERE id=$1`,[r,u?l.staff.id:null]),await b.audit(m,l.staff.id,s,"registration",g.registration_id,{participant:r,name:g.full_name,value:u}))}),i.json({ok:!0})});o.get("/reports",y("reports.ops"),async(a,d)=>{let t=(await n.query(`SELECT p.shirt_size, count(*)::int AS n FROM participants p JOIN registrations r ON r.id=p.registration_id
      WHERE r.status='active' GROUP BY 1 ORDER BY 1`)).rows,s=(await n.query(`SELECT r.category_code, p.gender, count(*)::int AS n FROM participants p JOIN registrations r ON r.id=p.registration_id
      WHERE r.status='active' GROUP BY 1,2 ORDER BY 1,2`)).rows,l={shirts:t,divisions:s};Y(a.staff,"reports.finance")&&(l.revenue=(await n.query(`SELECT category_code, count(*)::int AS registrations, coalesce(sum(confirmed_amount),0)::bigint AS confirmed
        FROM registrations WHERE payment_status='confirmed' GROUP BY 1 ORDER BY 1`)).rows,l.unpaid=(await n.query(`SELECT id, reference, category_code, team_name, contact_name, contact_phone, member_count, total_amount, payment_status, created_at
        FROM registrations WHERE status='active' AND payment_status<>'confirmed' ORDER BY created_at`)).rows),d.json(l)});let L=a=>a?"ແມ່ນ":"ບໍ່";return o.get("/export/participants.csv",y("export.participants"),async(a,d)=>{let t=await b.loadSettings(n),s=(await n.query(`
      SELECT r.reference, r.reg_type, c.name_lo, r.team_name, p.position, p.full_name, p.gender, p.dob, r.distance_km, p.shirt_size,
             r.contact_name, r.contact_phone, r.emergency_name, r.emergency_phone, r.payment_status, p.bib,
             p.kit_collected_at, p.checked_in_at, r.status, r.created_at
        FROM participants p JOIN registrations r ON r.id=p.registration_id JOIN categories c ON c.code=r.category_code
       ORDER BY r.created_at, r.id, p.position`)).rows,l=["ລະຫັດລົງທະບຽນ","ປະເພດ","ລຸ້ນ","ຊື່ທີມ","ລຳດັບໃນທີມ","ຊື່ ແລະ ນາມສະກຸນ","ເພດ","ວັນເດືອນປີເກີດ","ອາຍຸໃນວັນແຂ່ງ","ໄລຍະທາງ (KM)","ຂະໜາດເສື້ອ","ຜູ້ຕິດຕໍ່","ເບີ WhatsApp","ຜູ້ຕິດຕໍ່ສຸກເສີນ","ເບີສຸກເສີນ","ສະຖານະການຈ່າຍ","BIB","ຮັບເຄື່ອງແລ້ວ","ເວລາຮັບເຄື່ອງ","ເຊັກອິນແລ້ວ","ເວລາເຊັກອິນ","ສະຖານະລົງທະບຽນ","ວັນທີລົງທະບຽນ"],i=s.map(r=>[r.reference,r.reg_type==="family"?"Family":"ບຸກຄົນ",r.name_lo,r.team_name,r.position,r.full_name,b.GENDER_LABELS[r.gender],r.dob,J(r.dob,t.eventDate),r.distance_km,r.shirt_size,r.contact_name,r.contact_phone,r.emergency_name,r.emergency_phone,b.PAYMENT_LABELS[r.payment_status],r.bib,L(r.kit_collected_at),b.fmtVientiane(r.kit_collected_at),L(r.checked_in_at),b.fmtVientiane(r.checked_in_at),b.STATUS_LABELS[r.status],b.fmtVientiane(r.created_at)]);await b.audit(n,a.staff.id,"export.participants","export",null,{rows:i.length}),d.set({"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="lnt-2026-participants.csv"'}),d.send(I.toCsv(l,i))}),o.get("/export/payments.csv",y("export.payments"),async(a,d)=>{let t=(await n.query(`
      SELECT r.reference, r.reg_type, c.name_lo, r.team_name, r.contact_name, r.contact_phone, r.member_count, r.fee_base, r.fee_extra_each,
             r.fee_extra_count, r.total_amount, r.payment_status, r.confirmed_amount, r.confirmed_at, s.display_name AS confirmed_by, r.payment_note,
             r.status, r.created_at
        FROM registrations r JOIN categories c ON c.code=r.category_code LEFT JOIN staff s ON s.id=r.confirmed_by
       ORDER BY r.created_at, r.id`)).rows,s=["ລະຫັດລົງທະບຽນ","ປະເພດ","ລຸ້ນ","ຊື່ທີມ","ຜູ້ຕິດຕໍ່","ເບີ WhatsApp","ຈຳນວນຄົນ","ຄ່າພື້ນຖານ (ກີບ)","ຄ່າເພີ່ມຕໍ່ຄົນ (ກີບ)","ຈຳນວນຄົນເພີ່ມ","ຍອດຕ້ອງຈ່າຍ (ກີບ)","ສະຖານະການຈ່າຍ","ຍອດຢືນຢັນແລ້ວ (ກີບ)","ເວລາຢືນຢັນ","ຢືນຢັນໂດຍ","ໝາຍເຫດການຈ່າຍ","ສະຖານະລົງທະບຽນ","ວັນທີລົງທະບຽນ"],l=t.map(i=>[i.reference,i.reg_type==="family"?"Family":"ບຸກຄົນ",i.name_lo,i.team_name,i.contact_name,i.contact_phone,i.member_count,i.fee_base,i.fee_extra_each,i.fee_extra_count,i.total_amount,b.PAYMENT_LABELS[i.payment_status],i.confirmed_amount,b.fmtVientiane(i.confirmed_at),i.confirmed_by,i.payment_note,b.STATUS_LABELS[i.status],b.fmtVientiane(i.created_at)]);await b.audit(n,a.staff.id,"export.payments","export",null,{rows:l.length}),d.set({"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="lnt-2026-payments.csv"'}),d.send(I.toCsv(s,l))}),o.get("/settings",y("settings"),async(a,d)=>{d.json({settings:await b.loadSettings(n),categories:await b.loadCategories(n)})}),o.put("/settings",y("settings"),p,async(a,d)=>{let t=a.body||{};await D(n,async s=>{let l=await b.loadSettings(s,{lock:!0}),i={...l},r=(m,g)=>{if(t[m]===void 0)return;let v=t[m]===null?"":typeof t[m]=="string"?t[m].replace(/\r\n/g,`
`).trim():null;if(v===null||v.length>g)throw x("VALIDATION",`ຂໍ້ມູນ ${m} ບໍ່ຖືກຕ້ອງ ຫຼື ຍາວເກີນ`);i[m]=v||null};if(["eventName","province","meetingPoint","meetingTime","bankName","bankAccountName","bankAccountNumber","whatsapp"].forEach(m=>r(m,200)),["contactNote","benefits","instructions"].forEach(m=>r(m,3e3)),!i.eventName)throw x("VALIDATION","ກະລຸນາໃສ່ຊື່ງານ");if(t.eventDate!==void 0){if(!tt(t.eventDate))throw x("VALIDATION","ວັນທີງານບໍ່ຖືກຕ້ອງ");i.eventDate=t.eventDate}if(t.registrationOpen!==void 0&&(i.registrationOpen=t.registrationOpen===!0),t.registrationDeadline!==void 0){if(t.registrationDeadline&&!(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t.registrationDeadline)&&b.vientianeToDate(t.registrationDeadline)))throw x("VALIDATION","ກຳນົດປິດລົງທະບຽນບໍ່ຖືກຕ້ອງ");i.registrationDeadline=t.registrationDeadline||null}if(t.capacity!==void 0)if(t.capacity===null||t.capacity==="")i.capacity=null;else{let m=Number(t.capacity);if(!Number.isSafeInteger(m)||m<1||m>1e5)throw x("VALIDATION","ຈຳນວນຮັບສູງສຸດບໍ່ຖືກຕ້ອງ");i.capacity=m}if(t.shirtSizes!==void 0){if(!Array.isArray(t.shirtSizes)||!t.shirtSizes.length||t.shirtSizes.length>20||!t.shirtSizes.every(m=>typeof m=="string"&&m.trim()&&m.trim().length<=12))throw x("VALIDATION","ຂະໜາດເສື້ອບໍ່ຖືກຕ້ອງ");i.shirtSizes=[...new Set(t.shirtSizes.map(m=>m.trim()))]}if(t.bibStart!==void 0){let m={};for(let g of["general","senior","family"]){let v=Number((t.bibStart||{})[g]);if(!Number.isSafeInteger(v)||v<1||v>99999999)throw x("VALIDATION","ເລກ BIB ເລີ່ມຕົ້ນບໍ່ຖືກຕ້ອງ");m[g]=v}i.bibStart=m}for(let m of["paymentQrAssetId","logoAssetId"])t[m]===null&&(i[m]=null);Array.isArray(t.eventImageAssetIds)&&(i.eventImageAssetIds=(l.eventImageAssetIds||[]).filter(m=>t.eventImageAssetIds.includes(m))),await s.query("UPDATE settings SET data=$1, updated_at=now(), updated_by=$2 WHERE id=1",[i,a.staff.id]);let u=Object.keys(i).filter(m=>JSON.stringify(i[m])!==JSON.stringify(l[m]));await b.audit(s,a.staff.id,"settings.update","settings",1,{changed:Object.fromEntries(u.map(m=>[m,{from:l[m],to:i[m]}]))})}),d.json({settings:await b.loadSettings(n)})}),o.put("/categories/:code",y("settings"),p,async(a,d)=>{let t=a.params.code,s=a.body||{};await D(n,async l=>{let i=(await l.query("SELECT * FROM categories WHERE code=$1 FOR UPDATE",[t])).rows[0];if(!i)throw new N(404,"NOT_FOUND","ບໍ່ພົບລຸ້ນ");let r=(m,g,v,A)=>{if(m===void 0)return g;let $=Number(m);if(!Number.isSafeInteger($)||$<v||$>A)throw x("VALIDATION","ຕົວເລກບໍ່ຖືກຕ້ອງ (ໃຊ້ຈຳນວນເຕັມ)");return $},u={base_fee:r(s.baseFee,i.base_fee,0,1e8),extra_fee:t==="family"?r(s.extraFee,i.extra_fee,0,1e8):0,max_members:t==="family"?r(s.maxMembers,i.max_members,i.min_members,100):i.max_members,active:s.active===void 0?i.active:s.active===!0};await l.query("UPDATE categories SET base_fee=$2, extra_fee=$3, max_members=$4, active=$5, updated_at=now() WHERE code=$1",[t,u.base_fee,u.extra_fee,u.max_members,u.active]),await b.audit(l,a.staff.id,"category.update","category",t,{from:{base_fee:i.base_fee,extra_fee:i.extra_fee,max_members:i.max_members,active:i.active},to:u,note:"ລາຄາໃໝ່ໃຊ້ກັບການລົງທະບຽນໃໝ່ເທົ່ານັ້ນ"})}),d.json({categories:await b.loadCategories(n)})}),o.post("/assets",y("settings"),le.raw({type:()=>!0,limit:5*1024*1024}),async(a,d)=>{let t=String(a.query.kind||"");if(!["logo","event_image","payment_qr"].includes(t))throw x("BAD_KIND","ປະເພດຮູບບໍ່ຖືກຕ້ອງ");let s=a.body,l=I.sniffImage(s);if(!l)throw new N(415,"BAD_FILE_TYPE","ຮັບສະເພາະຮູບ JPG, PNG ຫຼື WebP");let i=await D(n,async r=>{let u=await b.loadSettings(r,{lock:!0}),m=(await r.query("INSERT INTO assets (kind, content_type, byte_size, data) VALUES ($1,$2,$3,$4) RETURNING id",[t,l,s.length,s])).rows[0].id;if(t==="payment_qr"&&(u.paymentQrAssetId=m),t==="logo"&&(u.logoAssetId=m),t==="event_image"){let g=u.eventImageAssetIds||[];if(g.length>=6)throw x("TOO_MANY","ຮູບງານໄດ້ສູງສຸດ 6 ຮູບ");u.eventImageAssetIds=[...g,m]}return await r.query("UPDATE settings SET data=$1, updated_at=now(), updated_by=$2 WHERE id=1",[u,a.staff.id]),await b.audit(r,a.staff.id,"asset.upload","asset",m,{kind:t}),m});d.status(201).json({id:i,url:`/assets/${i}`})}),o.get("/staff",y("staff.manage"),async(a,d)=>{d.json({staff:(await n.query("SELECT id, username, display_name, role, active, created_at, last_login_at FROM staff ORDER BY id")).rows})}),o.post("/staff",y("staff.manage"),p,async(a,d)=>{let t=a.body||{},s=String(t.username||"").trim();if(!/^[A-Za-z0-9._-]{3,40}$/.test(s))throw x("VALIDATION","ຊື່ຜູ້ໃຊ້: ຕົວອັກສອນອັງກິດ/ຕົວເລກ 3–40 ຕົວ");let l=B(t.displayName,80);if(!l)throw x("VALIDATION","ກະລຸນາໃສ່ຊື່ສະແດງ");if(!["owner","accountant","staff"].includes(t.role))throw x("VALIDATION","ບົດບາດບໍ່ຖືກຕ້ອງ");I.checkPasswordStrength(t.password);try{let i=await n.query("INSERT INTO staff (username, display_name, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id",[s,l,I.hashPassword(t.password),t.role]);await b.audit(n,a.staff.id,"staff.create","staff",i.rows[0].id,{username:s,role:t.role}),d.status(201).json({id:i.rows[0].id})}catch(i){throw i.code==="23505"?new N(409,"USERNAME_TAKEN","ຊື່ຜູ້ໃຊ້ນີ້ມີແລ້ວ"):i}}),o.patch("/staff/:sid",y("staff.manage"),p,async(a,d)=>{let t=w(a.params.sid),s=a.body||{};if(!(await n.query("SELECT * FROM staff WHERE id=$1",[t])).rows[0])throw new N(404,"NOT_FOUND","ບໍ່ພົບພະນັກງານ");if(t===a.staff.id&&(s.active===!1||s.role&&s.role!=="owner"))throw x("SELF_LOCKOUT","ບໍ່ສາມາດປິດບັນຊີ ຫຼື ລົດສິດຂອງຕົນເອງໄດ້");let i={};if(s.role!==void 0){if(!["owner","accountant","staff"].includes(s.role))throw x("VALIDATION","ບົດບາດບໍ່ຖືກຕ້ອງ");i.role=s.role}if(s.active!==void 0&&(i.active=s.active===!0),s.displayName!==void 0){let u=B(s.displayName,80);if(!u)throw x("VALIDATION","ຊື່ບໍ່ຖືກຕ້ອງ");i.display_name=u}s.password!==void 0&&(I.checkPasswordStrength(s.password),i.password_hash=I.hashPassword(s.password));let r=Object.keys(i);if(r.length){await n.query(`UPDATE staff SET ${r.map((m,g)=>`${m}=$${g+2}`).join(", ")} WHERE id=$1`,[t,...r.map(m=>i[m])]),(i.active===!1||i.password_hash||i.role)&&await n.query("DELETE FROM sessions WHERE staff_id=$1 AND staff_id<>$2",[t,a.staff.id]);let u={...i};u.password_hash&&(u.password_hash="(changed)"),await b.audit(n,a.staff.id,"staff.update","staff",t,u)}d.json({ok:!0})}),o.get("/audit",y("audit.read"),async(a,d)=>{let t=(await n.query(`SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at, s.display_name AS staff
      FROM audit_log a LEFT JOIN staff s ON s.id=a.staff_id ORDER BY a.created_at DESC, a.id DESC LIMIT 300`)).rows;d.json({rows:t})}),o};fe.exports.PERMS=ue});var ot=M(($n,he)=>{"use strict";var X=ae(),ge=Z(),{createPool:on,migrate:cn}=G(),{AppError:be}=V(),dn=et(),ln=st();function rt(e=process.env){let n=e.APP_SECRET||"";if(n.length<32)throw new Error("APP_SECRET must be set (at least 32 random characters). See .env.example");if(!e.DATABASE_URL)throw new Error("DATABASE_URL must be set. See .env.example");return{port:Number(e.PORT||3e3),databaseUrl:e.DATABASE_URL,appSecret:n,cookieSecure:e.COOKIE_SECURE!=="false",trustProxy:e.TRUST_PROXY||!1}}function it({pool:e,config:n,staticFiles:c}){let o=ge();if(o.disable("x-powered-by"),n.trustProxy&&o.set("trust proxy",/^\d+$/.test(n.trustProxy)?Number(n.trustProxy):n.trustProxy),o.use((p,f,h)=>{f.set({"X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","X-Frame-Options":"DENY","Permissions-Policy":"camera=(), microphone=(), geolocation=()","Content-Security-Policy":"default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}),n.cookieSecure&&f.set("Strict-Transport-Security","max-age=15552000");let S=Date.now();f.on("finish",()=>{process.env.ACCESS_LOG!=="false"&&console.log(`${p.method} ${p.originalUrl.split("?")[0]} ${f.statusCode} ${Date.now()-S}ms`)}),h()}),o.get("/healthz",async(p,f)=>{await e.query("SELECT 1"),f.set("Cache-Control","no-store").json({ok:!0,time:new Date().toISOString()})}),o.use("/api/public",dn({pool:e,config:n})),o.use("/api/admin",ln({pool:e,config:n})),o.get("/assets/:id",async(p,f)=>{let h=Number(p.params.id);if(!Number.isSafeInteger(h)||h<=0)throw new be(404,"NOT_FOUND","ບໍ່ພົບຮູບ");let S=await e.query("SELECT content_type, data FROM assets WHERE id=$1",[h]);if(!S.rowCount)throw new be(404,"NOT_FOUND","ບໍ່ພົບຮູບ");f.set({"Content-Type":S.rows[0].content_type,"Cache-Control":"public, max-age=3600"}).send(S.rows[0].data)}),c){let p={"/":"index.html","/register":"register.html","/status":"status.html","/admin":"admin.html"};o.use((f,h,S)=>{if(f.method!=="GET"&&f.method!=="HEAD")return S();let y=p[f.path]||(f.path.startsWith("/static/")||f.path.startsWith("/fonts/")?f.path.slice(1):null),w=y&&c[y];if(!w)return S();w.type.startsWith("text/html")?h.set({"Cache-Control":"no-cache","X-LNT-HTML":"1"}):h.set("Cache-Control",y.startsWith("fonts/")?"public, max-age=2592000, immutable":"public, max-age=3600"),h.set("Content-Type",w.type).send(w.body)})}else{o.use("/fonts",ge.static(X.join(X.dirname(ne.resolve("@fontsource/noto-sans-lao/package.json")),"files"),{maxAge:"30d",immutable:!0}));let p=X.join(__dirname,"..","public"),f=h=>(S,y)=>y.set("Cache-Control","no-cache").sendFile(X.join(p,h));o.get("/",f("index.html")),o.get("/register",f("register.html")),o.get("/status",f("status.html")),o.get("/admin",f("admin.html")),o.use("/static",ge.static(X.join(p,"static"),{maxAge:"1h"}))}return o.use("/api",(p,f)=>f.status(404).json({error:"NOT_FOUND",message:"ບໍ່ພົບ"})),o.use((p,f)=>f.status(404).set("Content-Type","text/html; charset=utf-8").send('<!doctype html><meta charset="utf-8"><title>404</title><p style="font-family:sans-serif">ບໍ່ພົບໜ້ານີ້. <a href="/">ກັບໜ້າຫຼັກ</a></p>')),o.use((p,f,h,S)=>{if(p instanceof be)return h.status(p.status).json({error:p.code,message:p.message,...p.extra||{}});if(p.type==="entity.too.large")return h.status(413).json({error:"TOO_LARGE",message:"ໄຟລ໌ ຫຼື ຂໍ້ມູນໃຫຍ່ເກີນໄປ. ຮູບຫຼັກຖານຕ້ອງບໍ່ເກີນ 5 MB"});if(p.type==="entity.parse.failed")return h.status(400).json({error:"BAD_JSON",message:"ຂໍ້ມູນບໍ່ຖືກຕ້ອງ"});p.type!=="request.aborted"&&(console.error("unhandled error:",p.code||"",p.message),h.status(500).json({error:"SERVER_ERROR",message:"ລະບົບມີບັນຫາຊົ່ວຄາວ. ຂໍ້ມູນຂອງທ່ານຍັງຢູ່ໃນແບບຟອມ — ກະລຸນາລອງໃໝ່"}))}),o}async function pn(){let e=rt(),n=on(e.databaseUrl);process.env.MIGRATE_ON_START!=="false"&&await cn(n);let o=it({pool:n,config:e}).listen(e.port,()=>console.log(`LNT registration listening on :${e.port}`));o.requestTimeout=12e4;let p=()=>o.close(()=>n.end().then(()=>process.exit(0)));process.on("SIGTERM",p),process.on("SIGINT",p)}ne.main===he&&pn().catch(e=>{console.error(e.message),process.exit(1)});he.exports={createApp:it,loadConfig:rt}});var dt=Ee(ot(),1),lt=Ee(G(),1);var ct={"index.html":{type:"text/html; charset=utf-8",text:`<!doctype html>
<html lang="lo">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LNT RUN FOR LIFE 2026 — ລົງທະບຽນ</title>
<meta name="description" content="ລົງທະບຽນງານແລ່ນ LNT RUN FOR LIFE 2026, ແຂວງຫຼວງນ້ຳທາ, 26 ທັນວາ 2026">
<meta name="theme-color" content="#14532d">
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/style.css">
<script src="/static/common.js" defer></script>
<script src="/static/landing.js" defer></script>
</head>
<body>
<header class="topbar"><div class="wrap">
  <a class="brand" href="/"><img id="logo" alt="" hidden><span>LNT RUN FOR LIFE 2026</span></a>
  <nav><a href="/status">ກວດສະຖານະ</a></nav>
</div></header>

<div class="hero"><div class="wrap">
  <h1 id="eventName">LNT RUN FOR LIFE 2026</h1>
  <div class="meta">
    <div>📅 <span id="eventDate">26 ທັນວາ 2026</span></div>
    <div>📍 <span id="province">ແຂວງຫຼວງນ້ຳທາ, ສປປ ລາວ</span></div>
    <div id="meetingRow">🏁 ຈຸດນັດພົບ: <span id="meeting"></span></div>
  </div>
  <div id="closedBanner" class="alert warn" hidden></div>
  <div class="btn-row">
    <a class="btn" id="registerBtn" href="/register">ລົງທະບຽນ</a>
    <a class="btn secondary" href="/status">ກວດການລົງທະບຽນຂອງຂ້ອຍ</a>
  </div>
  <div class="gallery" id="gallery" hidden></div>
</div></div>

<main><div class="wrap">
  <noscript><div class="alert warn">ກະລຸນາເປີດ JavaScript ໃນໂປຣແກຣມທ່ອງເວັບ ເພື່ອລົງທະບຽນ</div></noscript>
  <div id="loadError" class="alert err" hidden></div>

  <section>
    <h2>ລຸ້ນການແຂ່ງຂັນ ແລະ ຄ່າລົງທະບຽນ</h2>
    <div class="cards three" id="categories"><div class="loading">ກຳລັງໂຫຼດ…</div></div>
  </section>

  <section class="card">
    <h2>ວິທີລົງທະບຽນ</h2>
    <ol class="steps">
      <li>ກົດ <b>“ລົງທະບຽນ”</b> ແລະ ເລືອກລຸ້ນ. ໄລຍະທາງຈະຖືກກຳນົດອັດຕະໂນມັດຕາມລຸ້ນ.</li>
      <li>ຕື່ມຂໍ້ມູນ, ກວດຄືນ ແລ້ວກົດຢືນຢັນ. ທ່ານຈະໄດ້ຮັບ <b>ລະຫັດລົງທະບຽນ</b> ແລະ <b>ລິ້ງສ່ວນຕົວ</b> — ກະລຸນາບັນທຶກໄວ້.</li>
      <li>ໂອນເງິນຕາມຂໍ້ມູນການຈ່າຍ ແລ້ວອັບໂຫຼດຮູບຫຼັກຖານການໂອນ.</li>
      <li>ພະນັກງານຈະກວດ ແລະ ຢືນຢັນການຈ່າຍ. ກວດສະຖານະໄດ້ທຸກເວລາຜ່ານລິ້ງສ່ວນຕົວ.</li>
    </ol>
    <p class="muted small">ບໍ່ຕ້ອງຕິດຕັ້ງແອັບ ແລະ ບໍ່ຕ້ອງສ້າງບັນຊີ. ໃຊ້ໄດ້ທັງ Android, iPhone ແລະ ຄອມພິວເຕີ.</p>
  </section>

  <section class="card" id="benefitsCard" hidden><h2>ສິ່ງທີ່ຜູ້ເຂົ້າຮ່ວມຈະໄດ້ຮັບ</h2><div id="benefits" class="prewrap"></div></section>
  <section class="card" id="instructionsCard" hidden><h2>ຄຳແນະນຳກ່ຽວກັບງານ</h2><div id="instructions" class="prewrap"></div></section>

  <section class="card">
    <h2>ການຈ່າຍເງິນ</h2>
    <div id="paymentInfo"></div>
  </section>

  <section class="card">
    <h2>ຕິດຕໍ່ຜູ້ຈັດງານ</h2>
    <div id="contact"></div>
  </section>

  <section class="card">
    <h2>ຄຳຖາມທີ່ພົບເລື້ອຍ</h2>
    <div id="faq"></div>
  </section>
</div></main>
<footer>LNT RUN FOR LIFE 2026 · ແຂວງຫຼວງນ້ຳທາ</footer>
</body>
</html>
`},"register.html":{type:"text/html; charset=utf-8",text:`<!doctype html>
<html lang="lo">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ລົງທະບຽນ — LNT RUN FOR LIFE 2026</title>
<meta name="theme-color" content="#14532d">
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/style.css">
<script src="/static/common.js" defer></script>
<script src="/static/register.js" defer></script>
</head>
<body>
<header class="topbar"><div class="wrap">
  <a class="brand" href="/"><span>LNT RUN FOR LIFE 2026</span></a>
  <nav><a href="/status">ກວດສະຖານະ</a></nav>
</div></header>
<main><div class="wrap">
  <h1>ລົງທະບຽນ</h1>
  <noscript><div class="alert warn">ກະລຸນາເປີດ JavaScript ໃນໂປຣແກຣມທ່ອງເວັບ ເພື່ອລົງທະບຽນ</div></noscript>
  <div id="globalMsg" role="alert" aria-live="assertive"></div>
  <div id="app"><div class="loading">ກຳລັງໂຫຼດ…</div></div>
</div></main>
<footer>ຂໍ້ມູນທີ່ທ່ານໃສ່ ຈະໃຊ້ເພື່ອການຈັດງານເທົ່ານັ້ນ</footer>
</body>
</html>
`},"status.html":{type:"text/html; charset=utf-8",text:`<!doctype html>
<html lang="lo">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>ສະຖານະການລົງທະບຽນ — LNT RUN FOR LIFE 2026</title>
<meta name="theme-color" content="#14532d">
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/style.css">
<script src="/static/common.js" defer></script>
<script src="/static/status.js" defer></script>
</head>
<body>
<header class="topbar"><div class="wrap">
  <a class="brand" href="/"><span>LNT RUN FOR LIFE 2026</span></a>
  <nav><a href="/register">ລົງທະບຽນ</a></nav>
</div></header>
<main><div class="wrap">
  <noscript><div class="alert warn">ກະລຸນາເປີດ JavaScript ໃນໂປຣແກຣມທ່ອງເວັບ</div></noscript>
  <div id="app"><div class="loading">ກຳລັງໂຫຼດ…</div></div>
</div></main>
<footer>LNT RUN FOR LIFE 2026 · ໜ້ານີ້ເປັນຂໍ້ມູນສ່ວນຕົວ ຢ່າແບ່ງປັນລິ້ງໃຫ້ຄົນອື່ນ</footer>
</body>
</html>
`},"admin.html":{type:"text/html; charset=utf-8",text:`<!doctype html>
<html lang="lo">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>ລະບົບຈັດການ — LNT RUN FOR LIFE 2026</title>
<meta name="theme-color" content="#14532d">
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/style.css">
<script src="/static/common.js" defer></script>
<script src="/static/admin.js" defer></script>
</head>
<body>
<header class="topbar"><div class="wrap wide">
  <a class="brand" href="/admin"><span>LNT 2026 · ລະບົບຈັດການ</span></a>
  <nav id="who"></nav>
</div></header>
<div class="admin-nav" id="nav" hidden><div class="wrap wide" id="navLinks"></div></div>
<main><div class="wrap wide">
  <noscript><div class="alert warn">ກະລຸນາເປີດ JavaScript</div></noscript>
  <div id="view"><div class="loading">ກຳລັງໂຫຼດ…</div></div>
</div></main>
</body>
</html>
`},"static/admin.js":{type:"text/javascript; charset=utf-8",text:`'use strict';
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
      bg.innerHTML = \`<div class="modal" role="dialog" aria-modal="true"><h3>\${esc(title)}</h3>\${body}
        \${input ? \`<textarea id="askIn" placeholder="\${esc(placeholder)}" maxlength="500"></textarea>\` : ''}
        <div class="btn-row"><button class="btn secondary" data-a="no">ຍົກເລີກ</button><button class="btn \${danger ? 'danger' : ''}" data-a="ok">\${esc(okText)}</button></div></div>\`;
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
    view.innerHTML = \`<div class="wrap"><div class="card"><h1>ເຂົ້າສູ່ລະບົບພະນັກງານ</h1>
      \${err ? \`<div class="alert err">\${esc(err)}</div>\` : ''}
      <form id="loginForm"><label for="u">ຊື່ຜູ້ໃຊ້</label><input id="u" type="text" autocomplete="username" autocapitalize="none" required>
      <label for="p">ລະຫັດຜ່ານ</label><input id="p" type="password" autocomplete="current-password" required>
      <div class="btn-row"><button class="btn block" type="submit">ເຂົ້າສູ່ລະບົບ</button></div></form></div></div>\`;
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
    view.innerHTML = \`<div class="wrap"><div class="card"><h1>ຕັ້ງຄ່າຄັ້ງທຳອິດ: ສ້າງບັນຊີເຈົ້າຂອງງານ</h1>
      <p>ໃຊ້ໄດ້ຄັ້ງດຽວ. ໃສ່ <b>ລະຫັດຕັ້ງຄ່າ</b> ທີ່ໄດ້ຮັບຈາກຜູ້ຕິດຕັ້ງລະບົບ ແລ້ວຕັ້ງຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານຂອງທ່ານເອງ.</p>
      \${err ? \`<div class="alert err">\${esc(err)}</div>\` : ''}
      <form id="setupForm"><label for="sc">ລະຫັດຕັ້ງຄ່າ</label><input id="sc" type="text" autocomplete="off" autocapitalize="characters" required>
      <label for="su">ຊື່ຜູ້ໃຊ້ (ອັງກິດ/ຕົວເລກ)</label><input id="su" type="text" autocomplete="username" autocapitalize="none" required>
      <label for="sn">ຊື່ສະແດງ</label><input id="sn" type="text" value="ເຈົ້າຂອງງານ">
      <label for="sp">ລະຫັດຜ່ານ (ຢ່າງໜ້ອຍ 10 ຕົວ)</label><input id="sp" type="password" autocomplete="new-password" required>
      <label for="sp2">ຢືນຢັນລະຫັດຜ່ານ</label><input id="sp2" type="password" autocomplete="new-password" required>
      <div class="btn-row"><button class="btn block" type="submit">ສ້າງບັນຊີເຈົ້າຂອງງານ</button></div></form></div></div>\`;
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
      view.innerHTML = \`<div class="alert err">\${esc(e.message)}</div>\`; return;
    }
    document.getElementById('who').innerHTML = \`<span class="small">\${esc(me.displayName)} (\${ROLE[me.role]})</span> <a href="#" id="logout">ອອກ</a>\`;
    document.getElementById('logout').onclick = async (e) => { e.preventDefault(); await api('/logout', { method: 'POST' }).catch(() => {}); me = null; renderLogin(); };
    const links = [['dashboard', 'ພາບລວມ', 'reg.read'], ['regs', 'ການລົງທະບຽນ', 'reg.read'], ['payments', 'ກວດການຈ່າຍ', 'pay.review'],
      ['reports', 'ລາຍງານ & Export', 'reports.ops'], ['settings', 'ຕັ້ງຄ່າງານ', 'settings'], ['staff', 'ພະນັກງານ', 'staff.manage'], ['audit', 'ປະຫວັດການແກ້ໄຂ', 'audit.read']];
    document.getElementById('navLinks').innerHTML = links.filter((l) => can(l[2])).map((l) => \`<a href="#/\${l[0]}" data-nav="\${l[0]}">\${l[1]}</a>\`).join('');
    document.getElementById('nav').hidden = false;
    route();
  }

  function route() {
    if (!me) return;
    const [path, qs] = location.hash.replace(/^#\\/?/, '').split('?');
    const parts = path.split('/');
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === (parts[0] === 'reg' ? 'regs' : parts[0] || 'dashboard')));
    const params = new URLSearchParams(qs || '');
    view.innerHTML = '<div class="loading">ກຳລັງໂຫຼດ…</div>';
    const routes = { '': dashboard, dashboard, regs: () => regs(params), payments: () => regs(new URLSearchParams('payment=awaiting_review&status=active'), true), reg: () => regDetail(Number(parts[1])), reports, settings, staff, audit };
    (routes[parts[0]] || dashboard)().catch((e) => { if (e.status !== 401) view.innerHTML = \`<div class="alert err">\${esc(e.message)}</div>\`; });
  }
  window.addEventListener('hashchange', route);

  // ---------- dashboard ----------
  async function dashboard() {
    const d = await api('/dashboard');
    const stat = (n, l) => \`<div class="stat"><div class="n">\${n}</div><div class="l">\${l}</div></div>\`;
    const byCat = (code) => d.byCategory.find((x) => x.category_code === code) || { registrations: 0, participants: 0 };
    view.innerHTML = \`<h1>ພາບລວມ</h1>
      <div class="alert \${d.registration.open ? 'ok' : 'warn'}">\${d.registration.open ? 'ເປີດຮັບລົງທະບຽນຢູ່' : esc(d.registration.reason)}
        \${d.capacity ? \` · ໃຊ້ບ່ອນແລ້ວ \${d.participants} / \${d.capacity} ຄົນ (ນັບຜູ້ເຂົ້າຮ່ວມໃນການລົງທະບຽນທີ່ບໍ່ຖືກຍົກເລີກ)\` : ' · ບໍ່ໄດ້ກຳນົດຈຳນວນຮັບສູງສຸດ'}</div>
      <div class="stats">
        \${stat(d.registrations, 'ການລົງທະບຽນ (ບໍ່ລວມຍົກເລີກ)')}\${stat(d.participants, 'ຜູ້ເຂົ້າຮ່ວມທັງໝົດ (ຄົນ)')}
        \${stat(d.family_teams, 'ທີມ Family')}\${stat(\`<a href="#/payments">\${d.awaiting_review}</a>\`, 'ລໍຖ້າກວດການຈ່າຍ')}
        \${d.confirmed_revenue !== undefined ? stat(lak(d.confirmed_revenue), \`ລາຍຮັບທີ່ຢືນຢັນແລ້ວ (\${d.confirmed_count} ລາຍການ)\`) : ''}
        \${d.outstanding !== undefined ? stat(lak(d.outstanding), \`ຍັງບໍ່ໄດ້ຮັບ (\${d.unpaid + d.awaiting_review} ລາຍການ)\`) : ''}
        \${stat(\`\${d.with_bib} / \${d.participants}\`, 'ອອກ BIB ແລ້ວ')}\${stat(\`\${d.kit_collected} / \${d.checked_in}\`, 'ຮັບເຄື່ອງແລ້ວ / ເຊັກອິນແລ້ວ')}
      </div>
      <div class="card mt"><h2>ຕາມລຸ້ນ</h2><table class="list"><tr><th>ລຸ້ນ</th><th>ການລົງທະບຽນ</th><th>ຜູ້ເຂົ້າຮ່ວມ</th></tr>
        \${['general', 'senior', 'family'].map((c) => \`<tr><td>\${CAT[c]}</td><td>\${byCat(c).registrations}</td><td>\${byCat(c).participants}</td></tr>\`).join('')}</table>
        \${d.cancelled ? \`<p class="small muted">ຍົກເລີກແລ້ວ \${d.cancelled} ລາຍການ\${d.cancelled_paid ? \` (ໃນນັ້ນ \${d.cancelled_paid} ລາຍການເຄີຍຈ່າຍແລ້ວ — ລາຍຮັບຍັງນັບຢູ່ ຈົນກວ່າຈະຈັດການຄືນເງິນ)\` : ''}</p>\` : ''}</div>\`;
  }


  // ---------- registration list ----------
  async function regs(params, paymentsMode) {
    const q = params.toString();
    const data = await api('/registrations?' + q);
    const opt = (name, list, cur) => \`<select data-f="\${name}">\${list.map(([v, l]) => \`<option value="\${v}" \${cur === v ? 'selected' : ''}>\${l}</option>\`).join('')}</select>\`;
    const p = Object.fromEntries(params);
    view.innerHTML = \`<h1>\${paymentsMode ? 'ລໍຖ້າກວດການຈ່າຍ' : 'ການລົງທະບຽນ'} <span class="muted small">(\${data.total})</span></h1>
      \${paymentsMode ? '' : \`<form class="filters card" id="filters">
        <input type="search" data-f="q" placeholder="ຄົ້ນຫາ: ລະຫັດ, ຊື່, ທີມ, ເບີໂທ, BIB" value="\${esc(p.q || '')}">
        \${opt('category', [['', 'ທຸກລຸ້ນ'], ['general', CAT.general], ['senior', CAT.senior], ['family', CAT.family]], p.category || '')}
        \${opt('gender', [['', 'ທຸກເພດ'], ['male', 'ຊາຍ'], ['female', 'ຍິງ']], p.gender || '')}
        \${opt('distance', [['', 'ທຸກໄລຍະ'], ['10', '10 KM'], ['5', '5 KM']], p.distance || '')}
        \${opt('payment', [['', 'ທຸກສະຖານະຈ່າຍ'], ...Object.entries(PAY)], p.payment || '')}
        \${opt('status', [['', 'ທັງໝົດ'], ['active', 'ປົກກະຕິ'], ['cancelled', 'ຍົກເລີກ']], p.status || '')}
        <button class="btn small" type="submit">ຄົ້ນຫາ</button></form>\`}
      <div class="card table-scroll"><table class="list"><tr><th>ລະຫັດ</th><th>ລຸ້ນ</th><th>ຊື່ / ທີມ</th><th>ຜູ້ເຂົ້າຮ່ວມ (BIB)</th><th>ເບີໂທ</th><th>ຍອດ</th><th>ການຈ່າຍ</th><th>ວັນທີ</th></tr>
      \${data.rows.map((r) => \`<tr class="row-link" data-id="\${r.id}"><td><a href="#/reg/\${r.id}">\${esc(r.reference)}</a>\${r.status === 'cancelled' ? ' <span class="badge b-cancelled">ຍົກເລີກ</span>' : ''}</td>
        <td>\${CAT[r.category_code]}<br><span class="small muted">\${r.distance_km} KM</span></td><td>\${esc(r.team_name || r.contact_name)}</td>
        <td class="small">\${r.member_count} ຄົນ: \${esc(r.members)}</td><td>\${esc(r.contact_phone)}</td><td>\${lak(r.total_amount)}</td>
        <td>\${payBadge(r.payment_status)}</td><td class="small">\${laoDateTime(r.created_at)}</td></tr>\`).join('') || '<tr><td colspan="8" class="center muted">ບໍ່ພົບຂໍ້ມູນ</td></tr>'}
      </table></div>
      <div class="btn-row">\${data.page > 1 ? '<button class="btn small secondary" data-page="-1">← ກ່ອນໜ້າ</button>' : ''}\${data.page * 50 < data.total ? '<button class="btn small secondary" data-page="1">ຕໍ່ໄປ →</button>' : ''}</div>\`;
    const f = document.getElementById('filters');
    if (f) f.addEventListener('submit', (e) => {
      e.preventDefault();
      const np = new URLSearchParams();
      f.querySelectorAll('[data-f]').forEach((el) => { if (el.value) np.set(el.dataset.f, el.value); });
      location.hash = '#/regs?' + np.toString();
    });
    view.querySelectorAll('.row-link').forEach((tr) => tr.addEventListener('click', (e) => { if (e.target.tagName !== 'A') location.hash = \`#/reg/\${tr.dataset.id}\`; }));
    view.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => {
      params.set('page', String(data.page + Number(b.dataset.page)));
      if (paymentsMode) regs(params, true); else location.hash = '#/regs?' + params.toString();
    }));
  }

  // ---------- registration detail ----------
  async function regDetail(id) {
    const { registration: r } = await api(\`/registrations/\${id}\`);
    const active = r.status === 'active';
    const priceLocked = ['confirmed', 'awaiting_review'].includes(r.payment_status);
    const sizes = (await L.api('/api/public/config')).shirtSizes;
    const kv = (k, v) => \`<dt>\${k}</dt><dd>\${v}</dd>\`;

    const tick = (act, at) => (can('race.ops')
      ? \`<label class="check"><input type="checkbox" data-act="\${act}" \${at ? 'checked' : ''} \${!active && !at ? 'disabled' : ''}> \${act === 'kit' ? 'ຮັບເຄື່ອງ' : 'ເຊັກອິນ'}\${at ? \` <span class="small muted">\${laoDateTime(at)}</span>\` : ''}</label>\`
      : \`\${act === 'kit' ? 'ຮັບເຄື່ອງ' : 'ເຊັກອິນ'}: \${at ? laoDateTime(at) : 'ຍັງ'}\`);
    const members = r.participants.map((p) => \`<div class="pcard" data-pid="\${p.id}">
      <div class="pname">\${p.position}. \${esc(p.full_name)} \${p.bib ? \`<span class="badge b-confirmed">BIB \${esc(p.bib)}</span>\` : ''}</div>
      <div class="pmeta">\${GENDER[p.gender]} · \${laoDate(p.dob)} · ອາຍຸໃນວັນແຂ່ງ \${p.age_on_event} ປີ · ເສື້ອ \${esc(p.shirt_size)}</div>
      <div class="pops">
        <div>\${can('race.ops') && active ? \`<div class="inline-form"><input value="\${esc(p.bib || '')}" data-bib placeholder="BIB" maxlength="10" aria-label="BIB">
          <button class="btn small" data-act="saveBib">ບັນທຶກ BIB</button><button class="btn small secondary" data-act="autoBib">ອັດຕະໂນມັດ</button>
          \${p.bib ? '<button class="btn small ghost" data-act="clearBib">ລຶບ BIB</button>' : ''}</div>\` : \`BIB: \${esc(p.bib || '—')}\`}</div>
        <div>\${tick('kit', p.kit_collected_at)}</div><div>\${tick('checkin', p.checked_in_at)}</div>
      </div>
      \${can('reg.edit') ? \`<div class="btn-row"><button class="btn small ghost" data-act="editMember">ແກ້ໄຂຂໍ້ມູນ</button>
        \${r.reg_type === 'family' && active ? '<button class="btn small ghost" data-act="removeMember">ລຶບສະມາຊິກອອກຈາກທີມ</button>' : ''}</div>\` : ''}
      </div>\`).join('');

    const proofs = can('pay.read') ? (r.proofs.length ? r.proofs.map((p) => \`<div class="card"><div class="small">\${laoDateTime(p.uploaded_at)} · \${Math.round(p.byte_size / 1024)} KB ·
        <b>\${{ pending: 'ລໍຖ້າກວດ', accepted: 'ຮັບແລ້ວ', rejected: 'ປະຕິເສດ', superseded: 'ຖືກແທນທີ່ດ້ວຍຮູບໃໝ່' }[p.review_status]}</b>
        · <a href="/api/admin/proofs/\${p.id}" target="_blank" rel="noopener">ເປີດຮູບເຕັມ</a></div>
        <img class="proof-thumb" src="/api/admin/proofs/\${p.id}" alt="ຫຼັກຖານການໂອນ" loading="lazy"></div>\`).join('') : '<p class="muted">ຍັງບໍ່ມີຫຼັກຖານ</p>') : '';

    view.innerHTML = \`<p><a href="#/regs">← ກັບລາຍການ</a></p>
      <h1>\${esc(r.reference)} \${payBadge(r.payment_status)} \${active ? '' : '<span class="badge b-cancelled">ຍົກເລີກແລ້ວ</span>'}</h1>
      \${!active ? \`<div class="alert err">ຍົກເລີກເມື່ອ \${laoDateTime(r.cancelled_at)} · ເຫດຜົນ: \${esc(r.cancel_reason)}</div>\` : ''}
      <div class="cards two">
        <div class="card"><h2>\${CAT[r.category_code]} · \${r.distance_km} KM</h2><dl class="kv">
          \${r.team_name ? kv('ທີມ', esc(r.team_name)) : ''}\${kv('ຜູ້ຕິດຕໍ່', esc(r.contact_name))}\${kv('ເບີ WhatsApp', esc(r.contact_phone))}
          \${kv('ສຸກເສີນ', \`\${esc(r.emergency_name || '—')} \${esc(r.emergency_phone || '')}\`)}\${kv('ໝາຍເຫດ', esc(r.note || '—'))}
          \${kv('ລົງທະບຽນເມື່ອ', laoDateTime(r.created_at))}\${kv('ຍິນຍອມເມື່ອ', laoDateTime(r.consent_at))}</dl>
          <div class="btn-row">\${can('reg.edit') && active ? '<button class="btn small secondary" data-act="editReg">ແກ້ໄຂຂໍ້ມູນຕິດຕໍ່</button>' : ''}
          \${can('reg.edit') ? '<button class="btn small secondary" data-act="newCode">ອອກລະຫັດເຂົ້າເບິ່ງໃໝ່</button>' : ''}</div></div>
        <div class="card"><h2>ຄ່າລົງທະບຽນ</h2><table class="fee-table">
          <tr><td>ຄ່າພື້ນຖານ (\${r.fee_base_members} ຄົນ)</td><td>\${lak(r.fee_base)}</td></tr>
          \${r.reg_type === 'family' ? \`<tr><td>ຄົນເພີ່ມ \${r.fee_extra_count} × \${lak(r.fee_extra_each)}</td><td>\${lak(r.fee_extra_count * r.fee_extra_each)}</td></tr>\` : ''}
          <tr class="total"><td>ລວມ (\${r.member_count} ຄົນ)</td><td>\${lak(r.total_amount)}</td></tr></table>
          <p class="small muted">ຄິດລາຄາເມື່ອ \${laoDateTime(r.priced_at)}.\${priceLocked ? ' 🔒 ລາຄາຖືກລັອກ (ມີການຈ່າຍ/ຫຼັກຖານແລ້ວ).' : ''}</p>
          \${r.payment_status === 'confirmed' ? \`<p>ຢືນຢັນ \${lak(r.confirmed_amount)} ໂດຍ \${esc(r.confirmed_by_name || '')} · \${laoDateTime(r.confirmed_at)}</p>\` : ''}
          \${r.payment_note ? \`<p class="small">ໝາຍເຫດການຈ່າຍ: \${esc(r.payment_note)}</p>\` : ''}
          <div class="btn-row">
          \${can('reg.edit') && active && !priceLocked ? '<button class="btn small secondary" data-act="recalc">ຄິດລາຄາໃໝ່ຕາມລາຄາປັດຈຸບັນ</button>' : ''}
          \${can('reg.edit') && active && !priceLocked && r.reg_type === 'individual' ? \`<button class="btn small secondary" data-act="changeCat">ປ່ຽນເປັນ\${r.category_code === 'general' ? CAT.senior : CAT.general}</button>\` : ''}
          </div></div>
      </div>
      \${can('pay.review') ? \`<div class="card"><h2>ການກວດສອບການຈ່າຍ</h2>\${proofs}<div class="btn-row">
        \${active && r.payment_status !== 'confirmed' ? \`<button class="btn" data-act="confirmPay">ຢືນຢັນໄດ້ຮັບເງິນ \${lak(r.total_amount)}</button>\` : ''}
        \${r.payment_status === 'awaiting_review' ? '<button class="btn danger" data-act="rejectPay">ປະຕິເສດຫຼັກຖານ</button>' : ''}
        \${r.payment_status === 'confirmed' && can('pay.reopen') ? '<button class="btn small ghost" data-act="reopenPay">ຍົກເລີກການຢືນຢັນ (ແກ້ຂໍ້ຜິດພາດ)</button>' : ''}</div>
        \${r.payment_events.length ? \`<h3 class="mt">ປະຫວັດການຈ່າຍ</h3>\${r.payment_events.map((e) => \`<div class="audit-item">\${laoDateTime(e.created_at)} · <b>\${{ proof_uploaded: 'ສົ່ງຫຼັກຖານ', confirmed: 'ຢືນຢັນ', rejected: 'ປະຕິເສດ', reopened: 'ຍົກເລີກການຢືນຢັນ' }[e.action]}</b> \${e.amount !== null ? lak(e.amount) : ''} \${esc(e.staff || 'ຜູ້ລົງທະບຽນ')} \${e.note ? '· ' + esc(e.note) : ''}</div>\`).join('')}\` : ''}
      </div>\` : ''}
      <div class="card"><h2>ຜູ້ເຂົ້າຮ່ວມ (\${r.member_count} ຄົນ)</h2>\${members}
        \${can('reg.edit') && active && r.reg_type === 'family' ? \`<button class="btn small secondary" data-act="addMember" \${priceLocked ? 'disabled title="ລາຄາຖືກລັອກ"' : ''}>+ ເພີ່ມສະມາຊິກ (ຈະຄິດລາຄາໃໝ່)</button>\` : ''}
        <p class="small muted">ຮັບເຄື່ອງ ແລະ ເຊັກອິນ ບັນທຶກແຍກແຕ່ລະຄົນ — ສະມາຊິກໃນທີມສາມາດມາຮັບບໍ່ພ້ອມກັນໄດ້.</p></div>
      <div class="card"><h2>ປະຫວັດການແກ້ໄຂ</h2>\${r.audit.map((a) => \`<div class="audit-item">\${laoDateTime(a.created_at)} · <b>\${esc(actionLabel(a.action))}</b> · \${esc(a.staff || '')}<br><code>\${esc(JSON.stringify(a.details))}</code></div>\`).join('') || '<p class="muted">ຍັງບໍ່ມີ</p>'}</div>
      <div class="btn-row">\${active && can('reg.cancel') ? '<button class="btn danger" data-act="cancel">ຍົກເລີກການລົງທະບຽນ</button>' : ''}
        \${!active && can('settings') ? '<button class="btn secondary" data-act="reinstate">ກູ້ຄືນການລົງທະບຽນ</button>' : ''}</div>\`;

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
            case 'saveBib': await post(\`/participants/\${pid}/bib\`, { bib: tr.querySelector('[data-bib]').value }); toast('ບັນທຶກ BIB ແລ້ວ'); break;
            case 'autoBib': { const x = await post(\`/participants/\${pid}/bib\`, { auto: true }); toast(\`BIB: \${x.bib}\`); break; }
            case 'clearBib': if (!(await ask('ລຶບ BIB ຂອງ ' + p.full_name + '?'))) return; await api(\`/participants/\${pid}/bib\`, { method: 'DELETE' }); break;
            case 'kit': await post(\`/participants/\${pid}/kit\`, { value: el.checked }); toast(el.checked ? 'ບັນທຶກຮັບເຄື່ອງແລ້ວ' : 'ຍົກເລີກການຮັບເຄື່ອງ'); break;
            case 'checkin': await post(\`/participants/\${pid}/checkin\`, { value: el.checked }); toast(el.checked ? 'ເຊັກອິນແລ້ວ' : 'ຍົກເລີກເຊັກອິນ'); break;
            case 'confirmPay': {
              const pending = r.proofs.some((x) => x.review_status === 'pending');
              const note = pending ? await ask(\`ຢືນຢັນວ່າໄດ້ຮັບເງິນ \${lak(r.total_amount)}?\`, { input: true, placeholder: 'ໝາຍເຫດ (ບໍ່ບັງຄັບ) — ພິມ - ຖ້າບໍ່ມີ' })
                : await ask(\`ບໍ່ມີຫຼັກຖານລໍຖ້າກວດ. ຢືນຢັນໄດ້ຮັບເງິນ \${lak(r.total_amount)}?\`, { input: true, placeholder: 'ຈຳເປັນ: ເຊັ່ນ ຮັບເງິນສົດ, ເລກໃບຮັບເງິນ' });
              if (note === null) return;
              await post(\`/registrations/\${id}/payment\`, { action: 'confirm', note: note === '-' ? '' : note }); toast('ຢືນຢັນການຈ່າຍແລ້ວ'); break;
            }
            case 'rejectPay': { const note = await ask('ເຫດຜົນທີ່ປະຕິເສດ (ຜູ້ລົງທະບຽນຈະເຫັນ)', { input: true, danger: true, okText: 'ປະຕິເສດ' }); if (note === null) return; await post(\`/registrations/\${id}/payment\`, { action: 'reject', note }); break; }
            case 'reopenPay': { const note = await ask('ເຫດຜົນທີ່ຍົກເລີກການຢືນຢັນ', { input: true, danger: true }); if (note === null) return; await post(\`/registrations/\${id}/payment\`, { action: 'reopen', note }); break; }
            case 'recalc': { const reason = await ask('ຄິດລາຄາໃໝ່ຕາມລາຄາປັດຈຸບັນ — ເຫດຜົນ', { input: true }); if (reason === null) return; const x = await post(\`/registrations/\${id}/recalculate\`, { reason }); toast(\`ລາຄາໃໝ່: \${lak(x.fee.total)}\`); break; }
            case 'changeCat': {
              const to = r.category_code === 'general' ? 'senior' : 'general';
              const reason = await ask(\`ປ່ຽນເປັນ \${CAT[to]} (ລາຄາຈະຖືກຄິດໃໝ່)\`, { input: true, placeholder: 'ເຫດຜົນ' }); if (reason === null) return;
              await post(\`/registrations/\${id}/category\`, { category: to, recalculate: true, reason }); break;
            }
            case 'addMember': await memberDialog(null, sizes, async (m, reason) => post(\`/registrations/\${id}/members\`, { member: m, recalculate: true, reason })); break;
            case 'editMember': await memberDialog(p, sizes, async (m) => post(\`/participants/\${pid}\`, m, 'PATCH')); break;
            case 'removeMember': { const reason = await ask(\`ລຶບ \${p.full_name} ອອກຈາກທີມ? ລາຄາຈະຖືກຄິດໃໝ່\`, { input: true, danger: true, placeholder: 'ເຫດຜົນ' }); if (reason === null) return; await api(\`/participants/\${pid}\`, { method: 'DELETE', body: { recalculate: true, reason } }); break; }
            case 'editReg': await regDialog(r, async (b) => post(\`/registrations/\${id}\`, b, 'PATCH')); break;
            case 'newCode': {
              if (!(await ask('ອອກລະຫັດເຂົ້າເບິ່ງໃໝ່? ລະຫັດ ແລະ ລິ້ງເກົ່າຈະໃຊ້ບໍ່ໄດ້ອີກ. ກວດຢືນຢັນຕົວຕົນຜູ້ລົງທະບຽນກ່ອນ.'))) return;
              const x = await post(\`/registrations/\${id}/access-code\`);
              const link = \`\${location.origin}/status#r=\${encodeURIComponent(x.reference)}&c=\${encodeURIComponent(x.accessCode)}\`;
              await ask('ລະຫັດໃໝ່ (ສະແດງຄັ້ງດຽວ)', { okText: 'ສຳເນົາລິ້ງ ແລະ ປິດ', body: \`<p>ລະຫັດລົງທະບຽນ: <b>\${esc(x.reference)}</b><br>ລະຫັດເຂົ້າເບິ່ງ: <span class="codebox">\${esc(x.accessCode)}</span></p><div class="linkbox">\${esc(link)}</div>\` });
              await L.copyText(link); toast('ສຳເນົາລິ້ງແລ້ວ — ສົ່ງໃຫ້ຜູ້ລົງທະບຽນທາງ WhatsApp'); return;
            }
            case 'cancel': { const reason = await ask('ຍົກເລີກການລົງທະບຽນ — ເຫດຜົນ (ປະຫວັດການເງິນຈະຖືກເກັບໄວ້)', { input: true, danger: true }); if (reason === null) return; await post(\`/registrations/\${id}/cancel\`, { reason }); break; }
            case 'reinstate': { const reason = await ask('ກູ້ຄືນການລົງທະບຽນ — ເຫດຜົນ', { input: true }); if (reason === null) return; await post(\`/registrations/\${id}/reinstate\`, { reason }); break; }
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
      bg.innerHTML = \`<div class="modal"><h3>\${p ? 'ແກ້ໄຂຂໍ້ມູນ' : 'ເພີ່ມສະມາຊິກ'}</h3>
        <label>ຊື່ ແລະ ນາມສະກຸນ</label><input id="mName" type="text" value="\${esc(p ? p.full_name : '')}" maxlength="120">
        <label>ເພດ</label><select id="mGender"><option value="male" \${p && p.gender === 'male' ? 'selected' : ''}>ຊາຍ</option><option value="female" \${p && p.gender === 'female' ? 'selected' : ''}>ຍິງ</option></select>
        <label>ວັນເກີດ</label><input id="mDob" type="date" value="\${esc(p ? p.dob : '')}">
        <label>ເສື້ອ</label><select id="mSize">\${sizes.map((s) => \`<option \${p && p.shirt_size === s ? 'selected' : ''}>\${esc(s)}</option>\`).join('')}</select>
        \${p ? '' : '<label>ເຫດຜົນ (ລາຄາຈະຖືກຄິດໃໝ່)</label><input id="mReason" type="text" maxlength="300">'}
        <div id="mErr"></div><div class="btn-row"><button class="btn secondary" data-a="no">ຍົກເລີກ</button><button class="btn" data-a="ok">ບັນທຶກ</button></div></div>\`;
      document.body.appendChild(bg);
      bg.addEventListener('click', async (e) => {
        const a = e.target.dataset.a;
        if (a === 'no') { bg.remove(); resolve(); }
        if (a !== 'ok') return;
        const m = { fullName: bg.querySelector('#mName').value, gender: bg.querySelector('#mGender').value, dob: bg.querySelector('#mDob').value, shirtSize: bg.querySelector('#mSize').value };
        try { await save(m, p ? undefined : bg.querySelector('#mReason').value); bg.remove(); resolve(); } catch (x) { bg.querySelector('#mErr').innerHTML = \`<div class="alert err">\${esc(x.message)}</div>\`; }
      });
    });
  }
  function regDialog(r, save) {
    return new Promise((resolve) => {
      const bg = document.createElement('div');
      bg.className = 'modal-bg';
      const f = (id, label, v) => \`<label>\${label}</label><input id="\${id}" type="text" value="\${esc(v || '')}" maxlength="120">\`;
      bg.innerHTML = \`<div class="modal"><h3>ແກ້ໄຂຂໍ້ມູນຕິດຕໍ່</h3>
        \${r.reg_type === 'family' ? f('rTeam', 'ຊື່ທີມ', r.team_name) : ''}\${f('rName', 'ຜູ້ຕິດຕໍ່', r.contact_name)}\${f('rPhone', 'ເບີ WhatsApp', r.contact_phone)}
        \${f('rEName', 'ຜູ້ຕິດຕໍ່ສຸກເສີນ', r.emergency_name)}\${f('rEPhone', 'ເບີສຸກເສີນ', r.emergency_phone)}
        <label>ໝາຍເຫດ</label><textarea id="rNote" maxlength="500">\${esc(r.note || '')}</textarea>
        <div id="rErr"></div><div class="btn-row"><button class="btn secondary" data-a="no">ຍົກເລີກ</button><button class="btn" data-a="ok">ບັນທຶກ</button></div></div>\`;
      document.body.appendChild(bg);
      bg.addEventListener('click', async (e) => {
        const a = e.target.dataset.a;
        if (a === 'no') { bg.remove(); resolve(); }
        if (a !== 'ok') return;
        const v = (id) => { const el = bg.querySelector('#' + id); return el ? el.value : undefined; };
        try {
          await save({ teamName: v('rTeam'), contactName: v('rName'), contactPhone: v('rPhone'), emergencyName: v('rEName'), emergencyPhone: v('rEPhone'), note: v('rNote') });
          bg.remove(); resolve();
        } catch (x) { bg.querySelector('#rErr').innerHTML = \`<div class="alert err">\${esc(x.message)}</div>\`; }
      });
    });
  }

  // ---------- reports ----------
  async function reports() {
    const d = await api('/reports');
    const totalShirts = d.shirts.reduce((a, x) => a + x.n, 0);
    view.innerHTML = \`<h1>ລາຍງານ & Export</h1>
      <div class="card"><h2>ດາວໂຫຼດ (CSV ສຳລັບ Excel, UTF-8)</h2><div class="btn-row">
        \${can('export.participants') ? '<a class="btn secondary" href="/api/admin/export/participants.csv">ລາຍຊື່ຜູ້ເຂົ້າຮ່ວມ (1 ຄົນ/ແຖວ)</a>' : ''}
        \${can('export.payments') ? '<a class="btn secondary" href="/api/admin/export/payments.csv">ການຈ່າຍເງິນ (1 ການລົງທະບຽນ/ແຖວ)</a>' : ''}</div>
        <p class="small muted">ໄຟລ໌ຈ່າຍເງິນນັບທີມ Family ເປັນ 1 ແຖວ ເພື່ອບໍ່ໃຫ້ຍອດເງິນຊ້ຳກັນ.</p></div>
      <div class="cards two">
        <div class="card"><h2>ຈຳນວນເສື້ອຕາມຂະໜາດ</h2><table class="list"><tr><th>ຂະໜາດ</th><th>ຈຳນວນ</th></tr>
          \${d.shirts.map((x) => \`<tr><td>\${esc(x.shirt_size)}</td><td>\${x.n}</td></tr>\`).join('')}<tr><td><b>ລວມ</b></td><td><b>\${totalShirts}</b></td></tr></table></div>
        <div class="card"><h2>ຜູ້ເຂົ້າຮ່ວມຕາມປະເພດ</h2><table class="list"><tr><th>ລຸ້ນ</th><th>ເພດ</th><th>ຈຳນວນ</th></tr>
          \${d.divisions.map((x) => \`<tr><td>\${CAT[x.category_code]}</td><td>\${GENDER[x.gender]}</td><td>\${x.n}</td></tr>\`).join('')}</table></div>
      </div>
      \${d.revenue ? \`<div class="card"><h2>ລາຍຮັບທີ່ຢືນຢັນແລ້ວ</h2><table class="list"><tr><th>ລຸ້ນ</th><th>ການລົງທະບຽນ</th><th>ຍອດ</th></tr>
        \${d.revenue.map((x) => \`<tr><td>\${CAT[x.category_code]}</td><td>\${x.registrations}</td><td>\${lak(x.confirmed)}</td></tr>\`).join('')}
        <tr><td colspan="2"><b>ລວມ</b></td><td><b>\${lak(d.revenue.reduce((a, x) => a + x.confirmed, 0))}</b></td></tr></table></div>
      <div class="card"><h2>ຍັງບໍ່ໄດ້ຢືນຢັນການຈ່າຍ (\${d.unpaid.length})</h2><div class="table-scroll"><table class="list"><tr><th>ລະຫັດ</th><th>ລຸ້ນ</th><th>ຊື່</th><th>ເບີ</th><th>ຄົນ</th><th>ຍອດ</th><th>ສະຖານະ</th></tr>
        \${d.unpaid.map((x) => \`<tr><td><a href="#/reg/\${x.id}">\${esc(x.reference)}</a></td><td>\${CAT[x.category_code]}</td><td>\${esc(x.team_name || x.contact_name)}</td><td>\${esc(x.contact_phone)}</td><td>\${x.member_count}</td><td>\${lak(x.total_amount)}</td><td>\${payBadge(x.payment_status)}</td></tr>\`).join('')}</table></div></div>\` : ''}\`;
  }

  // ---------- settings ----------
  async function settings() {
    const { settings: s, categories } = await api('/settings');
    const t = (k, label, hint) => \`<label for="s-\${k}">\${label}</label><input id="s-\${k}" data-s="\${k}" type="text" value="\${esc(s[k] || '')}">\${hint ? \`<div class="hint">\${hint}</div>\` : ''}\`;
    const ta = (k, label) => \`<label for="s-\${k}">\${label}</label><textarea id="s-\${k}" data-s="\${k}">\${esc(s[k] || '')}</textarea>\`;
    const bib = s.bibStart || { general: 1001, senior: 3001, family: 5001 };
    view.innerHTML = \`<h1>ຕັ້ງຄ່າງານ</h1>
      <form class="card" id="setForm"><h2>ຂໍ້ມູນງານ</h2>
        \${t('eventName', 'ຊື່ງານ')}<label for="s-eventDate">ວັນແຂ່ງຂັນ</label><input id="s-eventDate" data-s="eventDate" type="date" value="\${esc(s.eventDate)}">
        <div class="hint">ອາຍຸລຸ້ນອາວຸໂສ ຄິດໄລ່ຕາມວັນນີ້</div>
        \${t('province', 'ສະຖານທີ່ / ແຂວງ')}\${t('meetingPoint', 'ຈຸດນັດພົບ', 'ປ່ອຍວ່າງ = ສະແດງ “ຈະແຈ້ງໃຫ້ຊາບພາຍຫຼັງ”')}\${t('meetingTime', 'ເວລານັດພົບ', 'ເຊັ່ນ 05:30 ໂມງ')}
        <h2 class="mt">ການລົງທະບຽນ</h2>
        <label class="check"><input type="checkbox" data-s="registrationOpen" \${s.registrationOpen ? 'checked' : ''}> ເປີດຮັບລົງທະບຽນ</label>
        <label for="s-dl">ກຳນົດປິດລົງທະບຽນ (ເວລາລາວ)</label><input id="s-dl" data-s="registrationDeadline" type="datetime-local" value="\${esc(s.registrationDeadline || '')}">
        <label for="s-cap">ຈຳນວນຮັບສູງສຸດ (ຄົນ)</label><input id="s-cap" data-s="capacity" type="number" min="1" step="1" value="\${esc(s.capacity || '')}">
        <div class="hint">ນັບ <b>ຈຳນວນຜູ້ເຂົ້າຮ່ວມແຕ່ລະຄົນ</b> (ທີມ Family 5 ຄົນ = 5) ໃນທຸກການລົງທະບຽນທີ່ບໍ່ຖືກຍົກເລີກ ທັງຈ່າຍແລ້ວ ແລະ ຍັງບໍ່ຈ່າຍ. ປ່ອຍວ່າງ = ບໍ່ຈຳກັດ.</div>
        <label for="s-sizes">ຂະໜາດເສື້ອ (ຂັ້ນດ້ວຍ ,)</label><input id="s-sizes" data-s="shirtSizes" type="text" value="\${esc((s.shirtSizes || []).join(', '))}">
        <label>ເລກ BIB ເລີ່ມຕົ້ນ (ໃຊ້ກັບປຸ່ມ “ອັດຕະໂນມັດ”)</label><div class="choice dob-grid">
          <input data-bib="general" type="number" value="\${bib.general}" aria-label="ທົ່ວໄປ"><input data-bib="senior" type="number" value="\${bib.senior}" aria-label="ອາວຸໂສ"><input data-bib="family" type="number" value="\${bib.family}" aria-label="Family"></div>
        <div class="hint">ທົ່ວໄປ / ອາວຸໂສ / Family</div>
        <h2 class="mt">ການຈ່າຍເງິນ ແລະ ຕິດຕໍ່</h2>
        \${t('bankName', 'ທະນາຄານ')}\${t('bankAccountName', 'ຊື່ບັນຊີ')}\${t('bankAccountNumber', 'ເລກບັນຊີ')}\${t('whatsapp', 'ເບີ WhatsApp ຜູ້ຈັດງານ')}\${ta('contactNote', 'ຂໍ້ມູນຕິດຕໍ່ເພີ່ມເຕີມ')}
        <h2 class="mt">ເນື້ອຫາໜ້າເວັບ</h2>\${ta('benefits', 'ສິ່ງທີ່ຜູ້ເຂົ້າຮ່ວມຈະໄດ້ຮັບ')}\${ta('instructions', 'ຄຳແນະນຳກ່ຽວກັບງານ')}
        <div class="btn-row"><button class="btn" type="submit">ບັນທຶກການຕັ້ງຄ່າ</button></div></form>
      <div class="card"><h2>ຮູບພາບ</h2>
        <p>QR ຈ່າຍເງິນ: \${s.paymentQrAssetId ? \`<img class="qr" src="/assets/\${s.paymentQrAssetId}" alt=""> <button class="btn small ghost" data-clear="paymentQrAssetId">ລຶບ</button>\` : '<span class="muted">ຍັງບໍ່ໄດ້ຕັ້ງ</span>'}</p>
        <p>ໂລໂກ້: \${s.logoAssetId ? \`<img class="qr" src="/assets/\${s.logoAssetId}" alt=""> <button class="btn small ghost" data-clear="logoAssetId">ລຶບ</button>\` : '<span class="muted">ຍັງບໍ່ໄດ້ຕັ້ງ</span>'}</p>
        <p>ຮູບງານ: \${(s.eventImageAssetIds || []).map((i) => \`<img class="qr" src="/assets/\${i}" alt=""> <button class="btn small ghost" data-rmimg="\${i}">ລຶບ</button>\`).join(' ') || '<span class="muted">ບໍ່ມີ</span>'}</p>
        <label>ອັບໂຫຼດຮູບ (JPG/PNG/WebP ≤ 5 MB)</label><div class="inline-form"><select id="assetKind"><option value="payment_qr">QR ຈ່າຍເງິນ</option><option value="logo">ໂລໂກ້</option><option value="event_image">ຮູບງານ</option></select>
        <input type="file" id="assetFile" accept="image/jpeg,image/png,image/webp"><button class="btn small" id="assetUp">ອັບໂຫຼດ</button></div></div>
      <div class="card"><h2>ລາຄາ (ກີບ, ຈຳນວນເຕັມ)</h2><p class="small muted">ລາຄາໃໝ່ໃຊ້ກັບການລົງທະບຽນໃໝ່ເທົ່ານັ້ນ. ການລົງທະບຽນເກົ່າທີ່ຍັງບໍ່ຈ່າຍ ຈະປ່ຽນລາຄາກໍຕໍ່ເມື່ອກົດ “ຄິດລາຄາໃໝ່” ໃນແຕ່ລະລາຍການ.</p>
        \${categories.map((c) => \`<form class="inline-form" data-cat="\${c.code}"><b>\${esc(c.name_lo)} \${c.distance_km} KM</b>
          <label class="small">ພື້ນຖານ <input name="baseFee" type="number" min="0" step="1" value="\${c.base_fee}"></label>
          \${c.code === 'family' ? \`<label class="small">ຄົນເພີ່ມ <input name="extraFee" type="number" min="0" step="1" value="\${c.extra_fee}"></label><label class="small">ສູງສຸດ <input name="maxMembers" type="number" min="3" value="\${c.max_members}"></label>\` : ''}
          <label class="small"><input name="active" type="checkbox" \${c.active ? 'checked' : ''}> ເປີດ</label><button class="btn small">ບັນທຶກ</button></form><hr>\`).join('')}</div>\`;

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
      try { await api(\`/categories/\${f.dataset.cat}\`, { method: 'PUT', body: b }); toast('ບັນທຶກລາຄາແລ້ວ'); settings(); } catch (x) { fail(x); }
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
    view.innerHTML = \`<h1>ພະນັກງານ</h1>
      <div class="card table-scroll"><table class="list"><tr><th>ຊື່ຜູ້ໃຊ້</th><th>ຊື່</th><th>ບົດບາດ</th><th>ສະຖານະ</th><th>ເຂົ້າລະບົບຫຼ້າສຸດ</th><th></th></tr>
        \${list.map((s) => \`<tr data-sid="\${s.id}"><td>\${esc(s.username)}</td><td>\${esc(s.display_name)}</td>
          <td><select data-role \${s.id === me.id ? 'disabled' : ''}>\${Object.entries(ROLE).map(([k, v]) => \`<option value="\${k}" \${s.role === k ? 'selected' : ''}>\${v}</option>\`).join('')}</select></td>
          <td>\${s.active ? 'ໃຊ້ງານ' : '<span class="badge b-no">ປິດ</span>'}</td><td class="small">\${laoDateTime(s.last_login_at) || '—'}</td>
          <td>\${s.id === me.id ? '' : \`<button class="btn small ghost" data-toggle>\${s.active ? 'ປິດບັນຊີ' : 'ເປີດບັນຊີ'}</button>\`} <button class="btn small ghost" data-pw>ປ່ຽນລະຫັດ</button></td></tr>\`).join('')}
      </table></div>
      <form class="card" id="newStaff"><h2>ເພີ່ມພະນັກງານ</h2>
        <label>ຊື່ຜູ້ໃຊ້ (ອັງກິດ/ຕົວເລກ)</label><input name="username" type="text" autocapitalize="none" required>
        <label>ຊື່ສະແດງ</label><input name="displayName" type="text" required>
        <label>ບົດບາດ</label><select name="role">\${Object.entries(ROLE).map(([k, v]) => \`<option value="\${k}" \${k === 'staff' ? 'selected' : ''}>\${v}</option>\`).join('')}</select>
        <div class="hint">ເຈົ້າຂອງງານ: ທຸກຢ່າງ · ບັນຊີ: ກວດການຈ່າຍ ແລະ ລາຍງານການເງິນ · ພະນັກງານລົງທະບຽນ: ຂໍ້ມູນຜູ້ເຂົ້າຮ່ວມ, BIB, ຮັບເຄື່ອງ, ເຊັກອິນ</div>
        <label>ລະຫັດຜ່ານເບື້ອງຕົ້ນ (ຢ່າງໜ້ອຍ 10 ຕົວ)</label><input name="password" type="password" autocomplete="new-password" required>
        <div class="btn-row"><button class="btn">ເພີ່ມ</button></div></form>\`;
    document.getElementById('newStaff').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      try { await api('/staff', { method: 'POST', body: { username: f.username.value, displayName: f.displayName.value, role: f.role.value, password: f.password.value } }); toast('ເພີ່ມແລ້ວ'); staff(); } catch (x) { fail(x); }
    });
    view.querySelectorAll('tr[data-sid]').forEach((tr) => {
      const sid = tr.dataset.sid;
      const s = list.find((x) => String(x.id) === sid);
      tr.querySelector('[data-role]').addEventListener('change', async (e) => { try { await api(\`/staff/\${sid}\`, { method: 'PATCH', body: { role: e.target.value } }); toast('ປ່ຽນບົດບາດແລ້ວ'); } catch (x) { fail(x); staff(); } });
      const tg = tr.querySelector('[data-toggle]');
      if (tg) tg.addEventListener('click', async () => { try { await api(\`/staff/\${sid}\`, { method: 'PATCH', body: { active: !s.active } }); staff(); } catch (x) { fail(x); } });
      tr.querySelector('[data-pw]').addEventListener('click', async () => {
        const pw = await ask(\`ລະຫັດຜ່ານໃໝ່ສຳລັບ \${s.username} (ຢ່າງໜ້ອຍ 10 ຕົວ)\`, { input: true });
        if (pw === null) return;
        try { await api(\`/staff/\${sid}\`, { method: 'PATCH', body: { password: pw } }); toast('ປ່ຽນລະຫັດແລ້ວ'); } catch (x) { fail(x); }
      });
    });
  }

  async function audit() {
    const { rows } = await api('/audit');
    view.innerHTML = \`<h1>ປະຫວັດການແກ້ໄຂ (300 ລາຍການຫຼ້າສຸດ)</h1><div class="card">\${rows.map((a) => \`<div class="audit-item">\${laoDateTime(a.created_at)} · <b>\${esc(actionLabel(a.action))}</b> · \${esc(a.staff || '')}
      \${a.entity_type === 'registration' ? \`· <a href="#/reg/\${esc(a.entity_id)}">ລາຍການ #\${esc(a.entity_id)}</a>\` : \`· \${esc(a.entity_type)} \${esc(a.entity_id || '')}\`}<br><code>\${esc(JSON.stringify(a.details))}</code></div>\`).join('') || '<p class="muted">ບໍ່ມີ</p>'}</div>\`;
  }

  boot();
})();
`},"static/common.js":{type:"text/javascript; charset=utf-8",text:`'use strict';
/* Shared helpers for public pages and admin. No external libraries. */
(function () {
  const MONTHS = ['ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ', 'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'];
  const NET_ERR = 'ເຊື່ອມຕໍ່ອິນເຕີເນັດບໍ່ໄດ້ ຫຼື ຊ້າເກີນໄປ. ຂໍ້ມູນຂອງທ່ານຍັງຢູ່ — ກະລຸນາກວດອິນເຕີເນັດ ແລ້ວກົດລອງໃໝ່';

  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const lak = (n) => String(Math.trunc(Number(n) || 0)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',') + ' ກີບ';
  function laoDate(s) {
    if (!s) return '';
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    return \`\${d} \${MONTHS[m - 1]} \${y}\`;
  }
  function laoDateTime(iso) {
    if (!iso) return '';
    const s = new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Vientiane', hour12: false });
    return \`\${laoDate(s.slice(0, 10))} \${s.slice(11, 16)}\`;
  }
  function ageOn(dob, on) {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dob || '') || !on) return null;
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
    if (!res.ok) throw new ApiError(data.message || \`ເກີດຂໍ້ຜິດພາດ (\${res.status}). ກະລຸນາລອງໃໝ່\`, res.status, data);
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
        else reject(new ApiError(data.message || \`ອັບໂຫຼດບໍ່ສຳເລັດ (\${xhr.status}). ກະລຸນາລອງໃໝ່\`, xhr.status, data));
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
  const CAT = { general: 'ລຸ້ນທົ່ວໄປ', senior: 'ລຸ້ນອາວຸໂສ', family: 'ລຸ້ນ Family' };
  const payBadge = (s) => \`<span class="badge b-\${esc(s)}">\${esc(PAY[s] || s)}</span>\`;

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
    const d = String(num || '').replace(/\\D/g, '');
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
`},"static/favicon.svg":{type:"image/svg+xml",text:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#15803d"/><path d="M14 44c8-2 14-8 18-16s10-12 18-12" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="46" cy="44" r="6" fill="#dcfce7"/></svg>
`},"static/landing.js":{type:"text/javascript; charset=utf-8",text:`'use strict';
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
  document.title = \`\${cfg.eventName} — ລົງທະບຽນ\`;
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
    $('gallery').innerHTML = cfg.imageUrls.map((u) => \`<img src="\${esc(u)}" alt="ຮູບງານ" loading="lazy">\`).join('');
  }
  if (!cfg.registration.open) {
    $('closedBanner').hidden = false;
    $('closedBanner').textContent = cfg.registration.reason;
    $('registerBtn').hidden = true;
  } else {
    const notes = [];
    if (cfg.registrationDeadline) notes.push(\`ປິດຮັບລົງທະບຽນ: \${laoDate(cfg.registrationDeadline)} ເວລາ \${cfg.registrationDeadline.slice(11, 16)} ໂມງ\`);
    if (cfg.registration.remaining !== null && cfg.registration.remaining !== undefined) notes.push(\`ບ່ອນວ່າງເຫຼືອ \${cfg.registration.remaining} ຄົນ\`);
    if (notes.length) { $('closedBanner').hidden = false; $('closedBanner').className = 'alert info'; $('closedBanner').textContent = notes.join(' · '); }
  }

  $('categories').innerHTML = cfg.categories.map((c) => {
    let detail;
    if (c.code === 'family') {
      detail = \`<div class="price">\${lak(c.baseFee)} <span class="small muted">/ ທີມ \${c.baseMembers} ຄົນ</span></div>
        <p class="small">ຄົນທີ \${c.baseMembers + 1} ເປັນຕົ້ນໄປ ເພີ່ມຄົນລະ <b>\${lak(c.extraFee)}</b>. ຢ່າງໜ້ອຍ \${c.minMembers} ຄົນຕໍ່ທີມ.</p>\`;
    } else {
      detail = \`<div class="price">\${lak(c.baseFee)} <span class="small muted">/ ຄົນ</span></div>
        <p class="small">ແບ່ງປະເພດ ຊາຍ ແລະ ຍິງ.\${c.minAge ? \` ອາຍຸ \${c.minAge} ປີຂຶ້ນໄປ ໃນວັນແຂ່ງຂັນ.\` : ''}</p>\`;
    }
    return \`<div class="card cat-card"><h3>\${esc(c.name)}</h3><span class="dist">\${c.distanceKm} KM</span>\${detail}</div>\`;
  }).join('');

  if (cfg.benefits) { $('benefitsCard').hidden = false; $('benefits').textContent = cfg.benefits; }
  if (cfg.instructions) { $('instructionsCard').hidden = false; $('instructions').textContent = cfg.instructions; }

  const p = cfg.payment;
  $('paymentInfo').innerHTML = p.configured
    ? \`<p>ຂໍ້ມູນບັນຊີ ແລະ QR ສຳລັບໂອນເງິນ ຈະສະແດງໃຫ້ຫຼັງຈາກລົງທະບຽນສຳເລັດ ພ້ອມຍອດທີ່ຕ້ອງຈ່າຍ.</p>
       <p class="muted small">ລະບົບນີ້ບໍ່ໄດ້ເຊື່ອມຕໍ່ກັບທະນາຄານໂດຍອັດຕະໂນມັດ. ພະນັກງານຈະກວດຫຼັກຖານການໂອນ ແລະ ຢືນຢັນດ້ວຍຕົນເອງ.</p>\`
    : \`<div class="alert warn">ຂໍ້ມູນບັນຊີສຳລັບໂອນເງິນ ກຳລັງຈະແຈ້ງໃຫ້ຊາບ. ທ່ານສາມາດລົງທະບຽນໄວ້ກ່ອນໄດ້ ແລະ ກັບມາຈ່າຍພາຍຫຼັງຜ່ານລິ້ງສ່ວນຕົວ.</div>\`;

  const wa = waLink(cfg.whatsapp);
  $('contact').innerHTML = (wa
    ? \`<p>WhatsApp: <a href="\${esc(wa)}" rel="noopener">\${esc(cfg.whatsapp)}</a></p>\`
    : '<p class="muted">ຂໍ້ມູນຕິດຕໍ່ ກຳລັງຈະແຈ້ງໃຫ້ຊາບ.</p>') +
    (cfg.contactNote ? \`<p class="prewrap">\${esc(cfg.contactNote)}</p>\` : '');

  $('faq').innerHTML = cfg.faq.map((f) => \`<details class="faq"><summary>\${esc(f.q)}</summary><p>\${esc(f.a)}</p></details>\`).join('');
})();
`},"static/register.js":{type:"text/javascript; charset=utf-8",text:`'use strict';
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
    msg.innerHTML = html ? \`<div class="alert \${kind || 'err'}">\${html}</div>\` : '';
    if (html) msg.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- form rendering ----------
  const errHtml = (k) => (errors[k] ? \`<div class="field-error" data-err="\${k}">\${esc(errors[k])}</div>\` : '');
  const inv = (k) => (errors[k] ? ' invalid' : '');
  function input(key, label, opts = {}) {
    const v = getPath(key);
    return \`<label for="f-\${key}" class="\${opts.req ? 'req' : ''}">\${label}</label>
      <input id="f-\${key}" data-k="\${key}" type="\${opts.type || 'text'}" value="\${esc(v)}" \${opts.attrs || ''} class="\${inv(key)}" autocomplete="\${opts.ac || 'off'}">
      \${opts.hint ? \`<div class="hint">\${opts.hint}</div>\` : ''}\${errHtml(key)}\`;
  }
  function getPath(k) { return k.split('.').reduce((o, p) => (o ? o[p] : ''), state) ?? ''; }
  function setPath(k, v) {
    const parts = k.split('.');
    let o = state;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = v;
  }

  function dobPicker(i) {
    const key = \`members.\${i}.dob\`;
    const [y, m, d] = (state.members[i].dob || '--').split('-');
    const evYear = Number(cfg.eventDate.slice(0, 4));
    const years = []; for (let yy = evYear; yy >= 1920; yy--) years.push(yy);
    const sel = (part, options, cur, aria) => \`<select data-dob="\${i}" data-part="\${part}" aria-label="\${aria}" class="\${inv(key)}">
      <option value="">\${aria}</option>\${options.map(([val, lab]) => \`<option value="\${val}" \${String(val) === String(cur) ? 'selected' : ''}>\${lab}</option>\`).join('')}</select>\`;
    const days = Array.from({ length: 31 }, (_, k) => [String(k + 1).padStart(2, '0'), k + 1]);
    const months = MONTHS.map((n, k) => [String(k + 1).padStart(2, '0'), n]);
    let ageNote = '';
    const age = ageOn(state.members[i].dob, cfg.eventDate);
    if (age !== null && age >= 0) {
      const c = cat();
      const okSenior = !c || !c.minAge || age >= c.minAge;
      ageNote = \`<div class="hint">ອາຍຸໃນວັນແຂ່ງຂັນ (\${laoDate(cfg.eventDate)}): <b>\${age} ປີ</b>\${okSenior ? '' : \` — <span class="field-error">ບໍ່ເຖິງ \${c.minAge} ປີ ສຳລັບລຸ້ນອາວຸໂສ</span>\`}</div>\`;
    }
    return \`<label class="req">ວັນເດືອນປີເກີດ</label>
      <div class="choice dob-grid">\${sel('d', days, d, 'ວັນ')}\${sel('m', months, m, 'ເດືອນ')}\${sel('y', years.map((yy) => [yy, yy]), y, 'ປີ')}</div>
      \${ageNote}\${errHtml(key)}\`;
  }
  function genderPicker(i) {
    const key = \`members.\${i}.gender\`;
    const g = state.members[i].gender;
    return \`<label class="req">ເພດ (ປະເພດການແຂ່ງຂັນ)</label><div class="choice">
      \${['male', 'female'].map((x) => \`<label class="\${g === x ? 'selected' : ''}"><input type="radio" name="g\${i}" data-k="\${key}" value="\${x}" \${g === x ? 'checked' : ''}> \${GENDER[x]}</label>\`).join('')}
      </div>\${errHtml(key)}\`;
  }
  function shirtPicker(i) {
    const key = \`members.\${i}.shirtSize\`;
    return \`<label class="req" for="s\${i}">ຂະໜາດເສື້ອ</label><select id="s\${i}" data-k="\${key}" class="\${inv(key)}">
      <option value="">— ເລືອກຂະໜາດ —</option>\${cfg.shirtSizes.map((s) => \`<option \${state.members[i].shirtSize === s ? 'selected' : ''}>\${esc(s)}</option>\`).join('')}
      </select>\${errHtml(key)}\`;
  }

  function renderForm() {
    if (!cfg.registration.open) {
      app.innerHTML = \`<div class="alert warn"><h3>\${esc(cfg.registration.reason)}</h3><p>ກະລຸນາຕິດຕໍ່ຜູ້ຈັດງານ ຖ້າມີຄຳຖາມ.</p></div>\`;
      return;
    }
    const c = cat();
    let h = \`<div class="card"><h2>1. ເລືອກລຸ້ນ</h2><div class="cat-options">\${cfg.categories.map((x) => \`
      <label class="opt \${state.category === x.code ? 'selected' : ''}"><input type="radio" name="category" value="\${x.code}" \${state.category === x.code ? 'checked' : ''}>
        <span><b>\${esc(x.name)} · \${x.distanceKm} KM</b>
        \${x.code === 'family' ? \`\${lak(x.baseFee)} / ທີມ \${x.baseMembers} ຄົນ, ເພີ່ມຄົນລະ \${lak(x.extraFee)}\` : \`\${lak(x.baseFee)} / ຄົນ\`}
        \${x.minAge ? \`<br><span class="small muted">ອາຍຸ \${x.minAge} ປີຂຶ້ນໄປ ໃນວັນແຂ່ງຂັນ</span>\` : ''}</span></label>\`).join('')}</div>\${errHtml('category')}</div>\`;

    if (c) {
      h += \`<div class="card"><h2>2. ຂໍ້ມູນ\${isFamily() ? 'ທີມ' : 'ຜູ້ແລ່ນ'}</h2>
        <p class="small muted">ໄລຍະທາງ: <b>\${c.distanceKm} KM</b> (ກຳນົດຕາມລຸ້ນ)</p>\`;
      if (isFamily()) {
        h += input('teamName', 'ຊື່ທີມ', { req: true, attrs: 'maxlength="120"' });
        h += input('contactName', 'ຊື່ຜູ້ຕິດຕໍ່ຂອງທີມ', { req: true, attrs: 'maxlength="120"', ac: 'name' });
        h += input('contactPhone', 'ເບີ WhatsApp ຜູ້ຕິດຕໍ່', { req: true, type: 'tel', attrs: 'inputmode="tel" maxlength="30" placeholder="020 xxxx xxxx"', ac: 'tel' });
        h += input('emergencyName', 'ຜູ້ຕິດຕໍ່ກໍລະນີສຸກເສີນ (ຖ້າມີ)', { attrs: 'maxlength="120"' });
        h += input('emergencyPhone', 'ເບີໂທກໍລະນີສຸກເສີນ (ຖ້າມີ)', { type: 'tel', attrs: 'inputmode="tel" maxlength="30"' });
        h += \`</div><div class="card"><h2>3. ສະມາຊິກໃນທີມ (\${state.members.length} ຄົນ)</h2>
          <p class="small muted">ຢ່າງໜ້ອຍ \${c.minMembers} ຄົນ. ສະມາຊິກແຕ່ລະຄົນຈະໄດ້ BIB ຂອງຕົນເອງ.</p>\`;
        state.members.forEach((m, i) => {
          h += \`<div class="member"><div class="member-head"><h3>ສະມາຊິກຄົນທີ \${i + 1}</h3>
            \${state.members.length > c.minMembers ? \`<button type="button" class="btn small ghost" data-remove="\${i}">ລຶບ</button>\` : ''}</div>
            \${input(\`members.\${i}.fullName\`, 'ຊື່ ແລະ ນາມສະກຸນ', { req: true, attrs: 'maxlength="120"' })}
            \${genderPicker(i)}\${dobPicker(i)}\${shirtPicker(i)}</div>\`;
        });
        h += state.members.length < c.maxMembers ? '<button type="button" class="btn secondary block" id="addMember">+ ເພີ່ມສະມາຊິກ</button>' : \`<p class="muted">ສູງສຸດ \${c.maxMembers} ຄົນ</p>\`;
      } else {
        h += input('contactName', 'ຊື່ ແລະ ນາມສະກຸນ', { req: true, attrs: 'maxlength="120"', ac: 'name' });
        h += genderPicker(0) + dobPicker(0);
        h += input('contactPhone', 'ເບີ WhatsApp', { req: true, type: 'tel', attrs: 'inputmode="tel" maxlength="30" placeholder="020 xxxx xxxx"', ac: 'tel' });
        h += shirtPicker(0);
        h += input('emergencyName', 'ຊື່ຜູ້ຕິດຕໍ່ກໍລະນີສຸກເສີນ', { req: true, attrs: 'maxlength="120"' });
        h += input('emergencyPhone', 'ເບີໂທຜູ້ຕິດຕໍ່ກໍລະນີສຸກເສີນ', { req: true, type: 'tel', attrs: 'inputmode="tel" maxlength="30"' });
      }
      h += \`<label for="f-note">ໝາຍເຫດ (ຖ້າມີ)</label><textarea id="f-note" data-k="note" maxlength="500">\${esc(state.note)}</textarea>
        <div class="mt"><label class="check"><input type="checkbox" data-k="consent" \${state.consent ? 'checked' : ''}>
        <span>ຂ້ອຍຍິນຍອມໃຫ້ຜູ້ຈັດງານໃຊ້ຂໍ້ມູນທີ່ໃຫ້ໄວ້ນີ້ ເພື່ອການຈັດງານ LNT RUN FOR LIFE 2026 ເທົ່ານັ້ນ (ການລົງທະບຽນ, ການຕິດຕໍ່, ການແຈກເຄື່ອງ ແລະ ຄວາມປອດໄພ).</span></label>\${errHtml('consent')}</div>
        </div>
        <div class="feebar" id="feebar"></div>
        <div class="btn-row"><button type="button" class="btn block" id="toReview">ກວດຂໍ້ມູນກ່ອນສົ່ງ</button></div>\`;
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
      ? \`<div class="small">\${n} ຄົນ: \${lak(f.base)} (\${c.baseMembers} ຄົນທຳອິດ)\${f.extraCount ? \` + \${f.extraCount} × \${lak(f.extraEach)}\` : ''}</div><div class="total">ລວມ \${lak(f.total)}</div>\`
      : \`<div class="small">\${esc(c.name)} · \${c.distanceKm} KM</div><div class="total">ລວມ \${lak(f.total)}</div>\`;
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
      if (e.type === 'change') { delete errors[\`members.\${i}.dob\`]; if (!Object.keys(errors).length) showMsg(''); save(); renderForm(); }
      return;
    }
    const k = t.dataset.k;
    if (!k) return;
    setPath(k, t.type === 'checkbox' ? t.checked : t.value);
    if (errors[k]) {
      delete errors[k];
      t.classList.remove('invalid');
      const fe = app.querySelector(\`[data-err="\${k}"]\`);
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
  const phoneOk = (p) => String(p || '').replace(/\\D/g, '').length >= 8;
  function validDate(s) {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(s || '')) return false;
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
      if (isFamily() && state.members.length < c.minMembers) errors.category = \`ລຸ້ນ Family ຕ້ອງມີຢ່າງໜ້ອຍ \${c.minMembers} ຄົນ\`;
      state.members.forEach((m, i) => {
        if (isFamily() && !m.fullName.trim()) errors[\`members.\${i}.fullName\`] = 'ກະລຸນາໃສ່ຊື່ ແລະ ນາມສະກຸນ';
        if (!m.gender) errors[\`members.\${i}.gender\`] = 'ກະລຸນາເລືອກ ຊາຍ ຫຼື ຍິງ';
        if (!validDate(m.dob)) errors[\`members.\${i}.dob\`] = 'ກະລຸນາເລືອກ ວັນ, ເດືອນ ແລະ ປີເກີດ ໃຫ້ຖືກຕ້ອງ';
        else {
          const a = ageOn(m.dob, cfg.eventDate);
          if (a < 0) errors[\`members.\${i}.dob\`] = 'ວັນເກີດບໍ່ຖືກຕ້ອງ';
          else if (c.minAge && a < c.minAge) errors[\`members.\${i}.dob\`] = \`ລຸ້ນອາວຸໂສ ຕ້ອງມີອາຍຸ \${c.minAge} ປີຂຶ້ນໄປ ໃນວັນແຂ່ງຂັນ (ອາຍຸໃນວັນແຂ່ງ: \${a} ປີ)\`;
        }
        if (!m.shirtSize) errors[\`members.\${i}.shirtSize\`] = 'ກະລຸນາເລືອກຂະໜາດເສື້ອ';
      });
      if (!state.consent) errors.consent = 'ກະລຸນາຢືນຢັນການຍິນຍອມ';
    }
    if (Object.keys(errors).length) {
      renderForm();
      showMsg(\`ກະລຸນາກວດສອບຂໍ້ມູນທີ່ໝາຍສີແດງ (\${Object.keys(errors).length} ຈຸດ)\`);
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
    const kv = (k, v) => (v ? \`<dt>\${k}</dt><dd>\${esc(v)}</dd>\` : '');
    app.innerHTML = \`<div class="alert info">ກະລຸນາກວດຂໍ້ມູນໃຫ້ຖືກຕ້ອງ ກ່ອນກົດ “ຢືນຢັນ ແລະ ສົ່ງ”. ຍັງແກ້ໄຂໄດ້.</div>
      <div class="card"><h2>\${esc(c.name)} · \${c.distanceKm} KM</h2><dl class="kv">
        \${kv('ຊື່ທີມ', p.teamName)}\${kv(isFamily() ? 'ຜູ້ຕິດຕໍ່' : 'ຊື່ ແລະ ນາມສະກຸນ', p.contactName)}\${kv('ເບີ WhatsApp', p.contactPhone)}
        \${kv('ຜູ້ຕິດຕໍ່ສຸກເສີນ', p.emergencyName)}\${kv('ເບີສຸກເສີນ', p.emergencyPhone)}\${kv('ໝາຍເຫດ', p.note)}</dl></div>
      <div class="card"><h2>\${isFamily() ? \`ສະມາຊິກ \${p.members.length} ຄົນ\` : 'ຂໍ້ມູນຜູ້ແລ່ນ'}</h2><div class="table-scroll"><table class="list">
        <tr><th>#</th><th>ຊື່</th><th>ເພດ</th><th>ວັນເກີດ</th><th>ອາຍຸໃນວັນແຂ່ງ</th><th>ເສື້ອ</th></tr>
        \${p.members.map((m, i) => \`<tr><td>\${i + 1}</td><td>\${esc(m.fullName)}</td><td>\${GENDER[m.gender]}</td><td>\${laoDate(m.dob)}</td><td>\${ageOn(m.dob, cfg.eventDate)} ປີ</td><td>\${esc(m.shirtSize)}</td></tr>\`).join('')}
      </table></div></div>
      <div class="card"><h2>ຄ່າລົງທະບຽນ</h2><table class="fee-table">
        \${isFamily()
          ? \`<tr><td>\${c.baseMembers} ຄົນທຳອິດ (ລາຄາທີມ)</td><td>\${lak(f.base)}</td></tr><tr><td>ຄົນເພີ່ມ \${f.extraCount} × \${lak(f.extraEach)}</td><td>\${lak(f.extraCount * f.extraEach)}</td></tr>\`
          : \`<tr><td>\${esc(c.name)} 1 ຄົນ</td><td>\${lak(f.base)}</td></tr>\`}
        <tr class="total"><td>ລວມທັງໝົດ</td><td>\${lak(f.total)}</td></tr></table>
        <p class="small muted">ລາຄາສຸດທ້າຍຄິດໄລ່ ແລະ ກວດສອບໂດຍລະບົບ.</p></div>
      <div id="dupBox"></div>
      <div class="btn-row"><button type="button" class="btn secondary" id="backToForm">← ແກ້ໄຂ</button>
      <button type="button" class="btn" id="submitBtn">ຢືນຢັນ ແລະ ສົ່ງ</button></div>\`;
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
      location.href = \`/status#r=\${encodeURIComponent(res.reference)}&c=\${encodeURIComponent(res.accessCode)}&new=1\`;
      return;
    } catch (e) {
      submitting = false;
      btns.forEach((b) => { b.disabled = false; });
      sb.textContent = label;
      const d = e.data || {};
      if (d.error === 'POSSIBLE_DUPLICATE') {
        document.getElementById('dupBox').innerHTML = \`<div class="alert warn"><h3>ອາດເປັນການລົງທະບຽນຊ້ຳ</h3><p>\${esc(e.message)}</p>
          \${d.names && d.names.length ? \`<p>ຊື່: <b>\${d.names.map(esc).join(', ')}</b></p>\` : ''}
          <p class="small">ຖ້າທ່ານເຄີຍລົງທະບຽນແລ້ວ ກະລຸນາໃຊ້ລິ້ງສ່ວນຕົວເກົ່າ ແທນການລົງທະບຽນໃໝ່.</p>
          <button type="button" class="btn" id="ackDup">ຢືນຢັນສົ່ງຕໍ່ (ບໍ່ແມ່ນການລົງທະບຽນຊ້ຳ)</button></div>\`;
        document.getElementById('dupBox').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (d.error === 'VALIDATION' && d.fields) { errors = d.fields; renderForm(); showMsg(esc(e.message)); return; }
      if (d.error === 'PRICE_MISMATCH' || d.error === 'INVALID_CATEGORY' || d.error === 'DISTANCE_MISMATCH') {
        cfg = await api('/api/public/config').catch(() => cfg);
      }
      if (d.error === 'TOO_FEW_MEMBERS' || d.error === 'TOO_MANY_MEMBERS') { renderForm(); }
      showMsg(\`\${esc(e.message)}\${e.status === 0 || e.status >= 500 ? ' <br><span class="small">ຂໍ້ມູນທີ່ທ່ານໃສ່ຍັງຢູ່ຄົບ. ກົດ “ຢືນຢັນ ແລະ ສົ່ງ” ອີກຄັ້ງໄດ້ — ລະບົບຈະບໍ່ບັນທຶກຊ້ຳ.</span>' : ''}\`);
    }
  }

  // ---------- start ----------
  (async function init() {
    try {
      cfg = await api('/api/public/config');
    } catch (e) {
      app.innerHTML = \`<div class="alert err">\${esc(e.message)}</div><button class="btn" id="retryLoad">ລອງໃໝ່</button>\`;
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
`},"static/status.js":{type:"text/javascript; charset=utf-8",text:`'use strict';
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
  const privateLink = () => \`\${location.origin}/status#r=\${encodeURIComponent(ref)}&c=\${encodeURIComponent(code)}\`;
  const authHeaders = () => ({ 'X-Reg-Ref': ref, 'X-Reg-Code': code });

  function renderLookup(err) {
    app.innerHTML = \`<h1>ກວດສະຖານະການລົງທະບຽນ</h1>
      \${err ? \`<div class="alert err">\${esc(err)}</div>\` : ''}
      <div class="card"><p>ໃສ່ລະຫັດລົງທະບຽນ ແລະ ລະຫັດເຂົ້າເບິ່ງ ທີ່ໄດ້ຮັບຫຼັງລົງທະບຽນ. ຫຼື ເປີດລິ້ງສ່ວນຕົວທີ່ທ່ານບັນທຶກໄວ້.</p>
      <form id="lookup" novalidate>
        <label for="lr" class="req">ລະຫັດລົງທະບຽນ</label><input id="lr" type="text" placeholder="LNT26-XXXXXX" autocapitalize="characters" value="\${esc(ref)}" maxlength="20">
        <label for="lc" class="req">ລະຫັດເຂົ້າເບິ່ງ</label><input id="lc" type="text" placeholder="XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off" maxlength="20">
        <div class="btn-row"><button class="btn block" type="submit">ເບິ່ງສະຖານະ</button></div>
      </form>
      <p class="small muted">ເຮັດລະຫັດເສຍ? ກະລຸນາຕິດຕໍ່ຜູ້ຈັດງານ ເພື່ອຢືນຢັນຕົວຕົນ ແລະ ຂໍລະຫັດໃໝ່. ເບີໂທຢ່າງດຽວ ບໍ່ສາມາດໃຊ້ເຂົ້າເບິ່ງຂໍ້ມູນໄດ້.</p></div>\`;
    document.getElementById('lookup').addEventListener('submit', (e) => {
      e.preventDefault();
      ref = document.getElementById('lr').value.trim().toUpperCase();
      code = document.getElementById('lc').value.trim().toUpperCase();
      if (!ref || !code) { renderLookup('ກະລຸນາໃສ່ທັງສອງລະຫັດ'); return; }
      history.replaceState(null, '', \`#r=\${encodeURIComponent(ref)}&c=\${encodeURIComponent(code)}\`);
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
      else app.innerHTML = \`<div class="alert err">\${esc(e.message)}</div><button class="btn" id="retry">ລອງໃໝ່</button>\`;
      const r = document.getElementById('retry'); if (r) r.onclick = load;
    }
  }

  function summaryText() {
    const lines = [
      'LNT RUN FOR LIFE 2026',
      \`ລະຫັດລົງທະບຽນ: \${reg.reference}\`,
      \`ລະຫັດເຂົ້າເບິ່ງ: \${code}\`,
      \`ລຸ້ນ: \${reg.categoryName} \${reg.distanceKm} KM\`,
      reg.teamName ? \`ທີມ: \${reg.teamName}\` : null,
      \`ຜູ້ເຂົ້າຮ່ວມ: \${reg.participants.map((p) => p.fullName).join(', ')}\`,
      \`ຍອດຕ້ອງຈ່າຍ: \${lak(reg.fee.total)}\`,
      \`ສະຖານະການຈ່າຍ: \${L.PAY[reg.paymentStatus]}\`,
      \`ລິ້ງສ່ວນຕົວ: \${privateLink()}\`,
    ];
    return lines.filter(Boolean).join('\\n');
  }

  function render() {
    const paid = reg.paymentStatus === 'confirmed';
    const cancelled = reg.status === 'cancelled';
    let banner;
    if (cancelled) banner = '<div class="alert err"><h3>ການລົງທະບຽນນີ້ຖືກຍົກເລີກແລ້ວ</h3><p>ກະລຸນາຕິດຕໍ່ຜູ້ຈັດງານ ຖ້າມີຄຳຖາມ.</p></div>';
    else if (paid) banner = '<div class="alert ok"><h3>✅ ຢືນຢັນການຈ່າຍເງິນແລ້ວ</h3><p>ການລົງທະບຽນຂອງທ່ານສົມບູນ.</p></div>';
    else if (reg.paymentStatus === 'awaiting_review') banner = '<div class="alert warn"><h3>⏳ ໄດ້ຮັບຫຼັກຖານແລ້ວ — ລໍຖ້າພະນັກງານກວດສອບ</h3><p>ການຈ່າຍເງິນ <b>ຍັງບໍ່ທັນຖືກຢືນຢັນ</b>. ກະລຸນາກວດສະຖານະອີກຄັ້ງພາຍຫຼັງ.</p></div>';
    else if (reg.paymentStatus === 'rejected') banner = \`<div class="alert err"><h3>ຫຼັກຖານການຈ່າຍບໍ່ຜ່ານການກວດສອບ</h3>\${reg.paymentNote ? \`<p>ເຫດຜົນ: \${esc(reg.paymentNote)}</p>\` : ''}<p>ກະລຸນາອັບໂຫຼດຫຼັກຖານໃໝ່ ຫຼື ຕິດຕໍ່ຜູ້ຈັດງານ.</p></div>\`;
    else banner = \`<div class="alert info"><h3>📝 ບັນທຶກການລົງທະບຽນແລ້ວ — ຍັງບໍ່ໄດ້ຈ່າຍເງິນ</h3><p>ກະລຸນາໂອນເງິນ <b>\${lak(reg.fee.total)}</b> ແລ້ວອັບໂຫຼດຮູບຫຼັກຖານຢູ່ລຸ່ມນີ້.</p></div>\`;

    const saveBox = \`<div class="card \${isNew ? '' : 'no-print'}">
      \${isNew ? '<h2>🎉 ລົງທະບຽນສຳເລັດ</h2><p><b>ກະລຸນາບັນທຶກຂໍ້ມູນລຸ່ມນີ້ໄວ້.</b> ທ່ານຕ້ອງໃຊ້ມັນເພື່ອກວດສະຖານະ ແລະ ອັບໂຫຼດຫຼັກຖານການຈ່າຍ.</p>' : '<h2>ລະຫັດຂອງທ່ານ</h2>'}
      <dl class="kv"><dt>ລະຫັດລົງທະບຽນ</dt><dd><span class="codebox">\${esc(reg.reference)}</span></dd>
      <dt>ລະຫັດເຂົ້າເບິ່ງ</dt><dd><span class="codebox">\${esc(code)}</span></dd></dl>
      <p class="small muted">ລິ້ງສ່ວນຕົວ (ຢ່າແບ່ງປັນໃຫ້ຄົນອື່ນ):</p><div class="linkbox">\${esc(privateLink())}</div>
      <div class="btn-row no-print"><button class="btn small" id="copyLink">ສຳເນົາລິ້ງ</button>
      <button class="btn small secondary" id="copyAll">ສຳເນົາຂໍ້ມູນທັງໝົດ</button>
      <button class="btn small secondary" id="printBtn">ພິມ / ບັນທຶກ PDF</button></div>
      <p class="small muted">ແນະນຳ: ສົ່ງຂໍ້ມູນນີ້ເຂົ້າ WhatsApp ຂອງຕົນເອງ ຫຼື ຖ່າຍຮູບໜ້າຈໍໄວ້.</p></div>\`;

    const f = reg.fee;
    const feeRows = reg.type === 'family'
      ? \`<tr><td>\${f.baseMembers} ຄົນທຳອິດ (ລາຄາທີມ)</td><td>\${lak(f.base)}</td></tr><tr><td>ຄົນເພີ່ມ \${f.extraCount} × \${lak(f.extraEach)}</td><td>\${lak(f.extraCount * f.extraEach)}</td></tr>\`
      : \`<tr><td>\${esc(reg.categoryName)} 1 ຄົນ</td><td>\${lak(f.base)}</td></tr>\`;

    const yesNo = (v, yes, no) => (v ? \`<span class="badge b-yes">\${yes}</span>\` : \`<span class="badge b-no">\${no}</span>\`);
    const members = \`<div class="card"><h2>\${reg.type === 'family' ? \`ສະມາຊິກ \${reg.memberCount} ຄົນ\` : 'ຜູ້ແລ່ນ'}</h2>
      \${reg.participants.map((p) => \`<div class="pcard"><div class="pname">\${p.position}. \${esc(p.fullName)}</div>
        <div class="pmeta">\${GENDER[p.gender]} · ເກີດ \${laoDate(p.dob)} · ເສື້ອ \${esc(p.shirtSize)}</div>
        <div class="pbadges">\${p.bib ? \`<span class="badge b-confirmed">BIB \${esc(p.bib)}</span>\` : '<span class="badge b-no">BIB: ຍັງບໍ່ອອກ</span>'}
        \${yesNo(p.kitCollected, 'ຮັບເຄື່ອງແລ້ວ', 'ຍັງບໍ່ຮັບເຄື່ອງ')} \${yesNo(p.checkedIn, 'ເຊັກອິນແລ້ວ', 'ຍັງບໍ່ເຊັກອິນ')}</div></div>\`).join('')}</div>\`;

    let pay = '';
    if (reg.canUploadProof) {
      const p = reg.payment;
      const bank = p.configured
        ? \`<dl class="kv">\${p.bankName ? \`<dt>ທະນາຄານ</dt><dd>\${esc(p.bankName)}</dd>\` : ''}\${p.accountName ? \`<dt>ຊື່ບັນຊີ</dt><dd>\${esc(p.accountName)}</dd>\` : ''}
           \${p.accountNumber ? \`<dt>ເລກບັນຊີ</dt><dd><span class="codebox">\${esc(p.accountNumber)}</span> <button class="btn small ghost no-print" id="copyAcc">ສຳເນົາ</button></dd>\` : ''}
           <dt>ຍອດທີ່ຕ້ອງໂອນ</dt><dd>\${lak(reg.fee.total)}</dd><dt>ໝາຍເຫດການໂອນ</dt><dd>\${esc(reg.reference)}</dd></dl>
           \${p.qrUrl ? \`<p><img class="qr" src="\${esc(p.qrUrl)}" alt="QR ສຳລັບໂອນເງິນ"></p>\` : ''}\`
        : '<div class="alert warn">ຂໍ້ມູນບັນຊີສຳລັບໂອນເງິນ ກຳລັງຈະແຈ້ງໃຫ້ຊາບ. ການລົງທະບຽນຂອງທ່ານຖືກບັນທຶກແລ້ວ. ກະລຸນາກັບມາໜ້ານີ້ພາຍຫຼັງ ຜ່ານລິ້ງສ່ວນຕົວ.</div>';
      pay = \`<div class="card no-print"><h2>ການຈ່າຍເງິນ</h2>\${bank}
        <p class="small muted">ລະບົບນີ້ບໍ່ໄດ້ເຊື່ອມກັບທະນາຄານອັດຕະໂນມັດ. ຫຼັງອັບໂຫຼດ ພະນັກງານຈະກວດ ແລະ ຢືນຢັນ.</p>
        <h3>\${reg.proofs.length ? 'ອັບໂຫຼດຫຼັກຖານໃໝ່' : 'ອັບໂຫຼດຫຼັກຖານການໂອນ'}</h3>
        <input type="file" id="proofFile" class="visually-hidden" accept="image/jpeg,image/png,image/webp">
        <label for="proofFile" class="btn secondary">📷 ເລືອກຮູບຫຼັກຖານ</label>
        <div class="file-name" id="fileName"></div>
        <div class="hint">ຮູບ JPG, PNG ຫຼື WebP ບໍ່ເກີນ 5 MB</div>
        <div id="upMsg"></div><div class="progress" id="upProg" hidden><div></div></div>
        <div class="btn-row"><button class="btn" id="upBtn" disabled>ອັບໂຫຼດຫຼັກຖານ</button></div>
        \${reg.proofs.length ? \`<p class="small muted">ສົ່ງແລ້ວ \${reg.proofs.length} ຄັ້ງ. ຫຼ້າສຸດ: \${laoDateTime(reg.proofs[0].uploadedAt)}</p>\` : ''}</div>\`;
    }

    app.innerHTML = \`<h1>ສະຖານະການລົງທະບຽນ</h1>\${banner}\${saveBox}
      <div class="card"><h2>\${esc(reg.categoryName)} · \${reg.distanceKm} KM</h2><dl class="kv">
        \${reg.teamName ? \`<dt>ທີມ</dt><dd>\${esc(reg.teamName)}</dd>\` : ''}<dt>ຜູ້ຕິດຕໍ່</dt><dd>\${esc(reg.contactName)}</dd>
        <dt>ເບີ WhatsApp</dt><dd>\${esc(reg.contactPhone)}</dd>
        \${reg.emergencyName ? \`<dt>ຜູ້ຕິດຕໍ່ສຸກເສີນ</dt><dd>\${esc(reg.emergencyName)} \${esc(reg.emergencyPhone || '')}</dd>\` : ''}
        <dt>ສະຖານະການຈ່າຍ</dt><dd>\${payBadge(reg.paymentStatus)}</dd><dt>ລົງທະບຽນເມື່ອ</dt><dd>\${laoDateTime(reg.createdAt)}</dd></dl>
        <table class="fee-table">\${feeRows}<tr class="total"><td>ລວມ</td><td>\${lak(f.total)}</td></tr></table></div>
      \${pay}\${members}
      <div class="btn-row no-print"><button class="btn secondary" id="refresh">ໂຫຼດສະຖານະຄືນໃໝ່</button></div>\`;
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
    const show = (html, kind) => { upMsg.innerHTML = html ? \`<div class="alert \${kind}">\${html}</div>\` : ''; };
    fileIn.addEventListener('change', () => {
      const f = fileIn.files[0];
      pendingFile = null; upBtn.disabled = true; show('');
      document.getElementById('fileName').textContent = f ? f.name : '';
      if (!f) return;
      if (f.size > MAX) return show(\`ໄຟລ໌ໃຫຍ່ເກີນ 5 MB (\${(f.size / 1048576).toFixed(1)} MB). ກະລຸນາຖ່າຍໜ້າຈໍ ຫຼື ເລືອກຮູບທີ່ນ້ອຍກວ່າ\`, 'err');
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
        const res = await L.upload('/api/public/my/proof', pendingFile, authHeaders(), (x) => { prog.firstElementChild.style.width = \`\${Math.round(x * 100)}%\`; });
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
`},"static/style.css":{type:"text/css; charset=utf-8",text:`@font-face { font-family: 'Noto Sans Lao'; font-weight: 400; font-display: swap; src: url('/fonts/noto-sans-lao-lao-400-normal.woff2') format('woff2'); }
@font-face { font-family: 'Noto Sans Lao'; font-weight: 700; font-display: swap; src: url('/fonts/noto-sans-lao-lao-700-normal.woff2') format('woff2'); }

:root {
  --green-900: #0f3d24; --green-800: #14532d; --green-700: #15803d; --green-600: #16a34a; --green-100: #dcfce7; --green-50: #f0fdf4;
  --ink: #17231b; --muted: #55665b; --line: #d6e5da; --white: #fff; --bg: #f6faf7;
  --amber-bg: #fff7e6; --amber: #8a5a00; --red-bg: #fdecec; --red: #a61b1b; --blue-bg: #eaf3ff; --blue: #1d4f91;
  --radius: 14px; --shadow: 0 2px 10px rgba(15, 61, 36, .08);
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; font-family: 'Noto Sans Lao', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 17px; line-height: 1.65; color: var(--ink); background: var(--bg); }
a { color: var(--green-700); }
h1, h2, h3 { line-height: 1.35; margin: 0 0 .5em; }
h1 { font-size: 1.7rem; } h2 { font-size: 1.35rem; } h3 { font-size: 1.1rem; }
p { margin: 0 0 .8em; }
[hidden] { display: none !important; }
.wrap { max-width: 760px; margin: 0 auto; padding: 0 16px; }
.wide { max-width: 1180px; }

.topbar { background: var(--green-800); color: #fff; }
.topbar .wrap { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 58px; }
.topbar a { color: #fff; text-decoration: none; font-weight: 700; }
.topbar .brand { display: flex; align-items: center; gap: 10px; }
.topbar img { height: 38px; width: auto; border-radius: 8px; background: #fff; }
.topbar nav a { font-weight: 400; margin-left: 14px; font-size: .95rem; opacity: .95; }

.hero { background: linear-gradient(160deg, var(--green-800), var(--green-600)); color: #fff; padding: 36px 0 44px; }
.hero h1 { font-size: 2rem; letter-spacing: .5px; }
.hero .meta { font-size: 1.08rem; margin: 6px 0 20px; }
.hero .meta div { margin: 2px 0; }
.hero .btn { background: #fff; color: var(--green-800); }
.hero .gallery { display: flex; gap: 8px; overflow-x: auto; margin-top: 18px; }
.hero .gallery img { height: 140px; border-radius: 10px; }

main { padding: 20px 0 48px; }
section { margin: 0 0 22px; }
.card { background: var(--white); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; box-shadow: var(--shadow); margin-bottom: 16px; }
.cards { display: grid; gap: 14px; grid-template-columns: 1fr; }
@media (min-width: 720px) { .cards.three { grid-template-columns: repeat(3, 1fr); } .cards.two { grid-template-columns: repeat(2, 1fr); } }
.cat-card h3 { color: var(--green-800); margin-bottom: 4px; }
.cat-card .price { font-size: 1.35rem; font-weight: 700; color: var(--green-700); }
.cat-card .dist { display: inline-block; background: var(--green-100); color: var(--green-800); border-radius: 999px; padding: 1px 12px; font-weight: 700; font-size: .95rem; }
.muted { color: var(--muted); }
.small { font-size: .9rem; }
.center { text-align: center; }
.steps { padding-left: 1.3em; margin: 0; } .steps li { margin-bottom: 6px; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 10px 22px; border-radius: 12px; border: 2px solid transparent; font: inherit; font-weight: 700; font-size: 1.05rem; cursor: pointer; text-decoration: none; background: var(--green-700); color: #fff; }
.btn:hover { background: var(--green-800); }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.btn.secondary { background: #fff; color: var(--green-800); border-color: var(--green-700); }
.btn.secondary:hover { background: var(--green-50); }
.btn.danger { background: var(--red); } .btn.ghost { background: transparent; color: var(--green-800); border-color: var(--line); }
.btn.small { min-height: 40px; padding: 4px 14px; font-size: .95rem; border-radius: 10px; }
.btn.block { width: 100%; }
.btn-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }

label { display: block; font-weight: 700; margin: 14px 0 6px; }
.req::after { content: ' *'; color: var(--red); }
input[type=text], input[type=tel], input[type=date], input[type=password], input[type=number], input[type=search], input[type=datetime-local], select, textarea {
  width: 100%; font: inherit; font-size: 1.05rem; padding: 12px 14px; min-height: 52px; border: 1.5px solid #b9cdbf; border-radius: 10px; background: #fff; color: var(--ink);
}
textarea { min-height: 90px; }
input:focus, select:focus, textarea:focus, .btn:focus-visible { outline: 3px solid #86efac; outline-offset: 1px; border-color: var(--green-700); }
.invalid { border-color: var(--red) !important; background: #fffafa !important; }
.field-error { color: var(--red); font-size: .93rem; margin-top: 4px; }
.hint { color: var(--muted); font-size: .92rem; margin-top: 4px; }
.choice { display: grid; gap: 10px; grid-template-columns: 1fr 1fr; }
.choice label, .opt { display: flex; align-items: center; gap: 10px; margin: 0; padding: 12px 14px; border: 1.5px solid #b9cdbf; border-radius: 10px; background: #fff; font-weight: 400; cursor: pointer; min-height: 52px; }
.choice input, .opt input { width: 22px; height: 22px; accent-color: var(--green-700); flex: none; }
.cat-options { display: grid; gap: 12px; }
.cat-options .opt { align-items: flex-start; padding: 14px; }
.cat-options .opt b { display: block; color: var(--green-800); }
.opt.selected, .choice label.selected { border-color: var(--green-700); background: var(--green-50); box-shadow: 0 0 0 1px var(--green-700) inset; }
.check { display: flex; gap: 12px; align-items: flex-start; font-weight: 400; }
.check input { width: 24px; height: 24px; margin-top: 3px; accent-color: var(--green-700); flex: none; }

.choice.dob-grid { grid-template-columns: 1fr 1.4fr 1.2fr; }
.mt { margin-top: 16px; }
.member { border: 1px dashed #a7c4b0; border-radius: 12px; padding: 4px 14px 14px; margin: 14px 0; background: #fbfefc; }
.member-head { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
.member-head h3 { margin: 0; }

.feebar { position: sticky; bottom: 0; background: var(--green-900); color: #fff; padding: 12px 16px; border-radius: 14px 14px 0 0; margin-top: 18px; z-index: 5; }
.feebar .total { font-size: 1.35rem; font-weight: 700; }
.fee-table { width: 100%; border-collapse: collapse; }
.fee-table td { padding: 6px 0; border-bottom: 1px solid var(--line); } .fee-table td:last-child { text-align: right; white-space: nowrap; }
.fee-table tr.total td { font-weight: 700; font-size: 1.15rem; border-bottom: 0; color: var(--green-800); }

.alert { border-radius: 12px; padding: 14px 16px; margin: 0 0 14px; border: 1px solid transparent; }
.alert.info { background: var(--blue-bg); color: var(--blue); border-color: #c6dbf7; }
.alert.ok { background: var(--green-100); color: var(--green-900); border-color: #a7e3bd; }
.alert.warn { background: var(--amber-bg); color: var(--amber); border-color: #f2d49b; }
.alert.err { background: var(--red-bg); color: var(--red); border-color: #f2c1c1; }
.alert h3 { margin-bottom: 4px; color: inherit; }

.badge { display: inline-block; border-radius: 999px; padding: 1px 10px; font-size: .88rem; font-weight: 700; white-space: nowrap; }
.b-unpaid { background: #eef1ef; color: #44514a; } .b-awaiting_review { background: var(--amber-bg); color: var(--amber); }
.b-confirmed { background: var(--green-100); color: var(--green-800); } .b-rejected { background: var(--red-bg); color: var(--red); }
.b-cancelled { background: #2f2f2f; color: #fff; } .b-yes { background: var(--green-100); color: var(--green-800); } .b-no { background: #eef1ef; color: #6b756f; }

dl.kv { display: grid; grid-template-columns: minmax(110px, 38%) 1fr; gap: 6px 12px; margin: 0; }
dl.kv dt { color: var(--muted); } dl.kv dd { margin: 0; font-weight: 700; word-break: break-word; }
.codebox { white-space: nowrap; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 1.15rem; font-weight: 700; letter-spacing: 1px; background: var(--green-50); border: 1.5px dashed var(--green-700); border-radius: 10px; padding: 8px 12px; display: inline-block; }
.linkbox { word-break: break-all; font-size: .92rem; background: #f3f6f4; border-radius: 8px; padding: 8px 10px; }
table.list { width: 100%; border-collapse: collapse; font-size: .95rem; }
table.list th, table.list td { text-align: left; padding: 8px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
table.list th { background: var(--green-50); color: var(--green-900); font-weight: 700; position: sticky; top: 0; }
.table-scroll { overflow-x: auto; }
.qr { max-width: 260px; width: 100%; border: 1px solid var(--line); border-radius: 12px; }
.progress { height: 10px; background: #e6efe9; border-radius: 99px; overflow: hidden; margin-top: 8px; }
.progress > div { height: 100%; width: 0; background: var(--green-600); transition: width .2s; }
details.faq { border-bottom: 1px solid var(--line); padding: 10px 0; }
details.faq summary { font-weight: 700; cursor: pointer; }
.prewrap { white-space: pre-wrap; }
footer { color: var(--muted); font-size: .9rem; padding: 24px 0 40px; text-align: center; }
.spinner { display: inline-block; width: 18px; height: 18px; border: 3px solid rgba(255,255,255,.45); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading { padding: 40px 0; text-align: center; color: var(--muted); }

/* participant cards (mobile friendly) */
.pcard { border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; margin: 10px 0; background: #fbfefc; }
.pcard .pname { font-weight: 700; font-size: 1.05rem; }
.pcard .pmeta { color: var(--muted); font-size: .93rem; }
.pcard .pbadges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.pcard .pops { display: grid; gap: 10px; margin-top: 10px; }
@media (min-width: 800px) { .pcard .pops { grid-template-columns: 2fr 1fr 1fr; align-items: center; } }
.visually-hidden { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.file-name { margin-top: 6px; font-weight: 700; word-break: break-all; }

/* admin */
.admin-nav { background: #fff; border-bottom: 1px solid var(--line); overflow-x: auto; white-space: nowrap; }
.admin-nav a { display: inline-block; padding: 12px 14px; text-decoration: none; color: var(--ink); font-weight: 700; border-bottom: 3px solid transparent; }
.admin-nav a.active { border-color: var(--green-700); color: var(--green-800); }
.stats { display: grid; gap: 12px; grid-template-columns: repeat(2, 1fr); }
@media (min-width: 800px) { .stats { grid-template-columns: repeat(4, 1fr); } }
.stat { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 14px; }
.stat .n { font-size: 1.6rem; font-weight: 700; color: var(--green-800); }
.stat .l { color: var(--muted); font-size: .92rem; }
.filters { display: grid; gap: 8px; grid-template-columns: 1fr 1fr; }
@media (min-width: 900px) { .filters { grid-template-columns: 2fr repeat(5, 1fr); } }
.filters input, .filters select { min-height: 44px; padding: 8px 10px; font-size: .98rem; }
.row-link { cursor: pointer; } .row-link:hover td { background: var(--green-50); }
.proof-thumb { max-width: 100%; max-height: 420px; border: 1px solid var(--line); border-radius: 10px; display: block; margin: 8px 0; }
.inline-form { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.inline-form input { min-height: 40px; padding: 6px 10px; width: 120px; font-size: .98rem; }
.modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 50; }
.modal { background: #fff; border-radius: 14px; padding: 20px; width: 100%; max-width: 480px; }
.toast { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); background: var(--green-900); color: #fff; padding: 10px 18px; border-radius: 10px; z-index: 60; max-width: 92vw; }
.toast.err { background: var(--red); }
.audit-item { border-bottom: 1px solid var(--line); padding: 6px 0; font-size: .92rem; }
.audit-item code { font-size: .82rem; word-break: break-all; }

@media print {
  .topbar, .no-print, .btn, footer, .feebar { display: none !important; }
  body { background: #fff; } .card { box-shadow: none; }
}
`},"fonts/noto-sans-lao-lao-400-normal.woff2":{type:"font/woff2",b64:"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"},"fonts/noto-sans-lao-lao-700-normal.woff2":{type:"font/woff2",b64:"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"}};var mn=globalThis.__lntExt.express,un=e=>Uint8Array.from(atob(e),n=>n.charCodeAt(0)),pt={};for(let[e,n]of Object.entries(ct))pt[e]={type:n.type,body:n.b64?Buffer.from(un(n.b64)):n.text};var fn=Deno.env.get("LNT_DATABASE_URL")||Deno.env.get("SUPABASE_DB_URL"),mt=lt.default.createPool(fn),ye=(await mt.query("SELECT value FROM app_secret WHERE id=1")).rows[0];if(!ye||ye.value.length<32)throw new Error("app_secret is not initialised");var gn={appSecret:ye.value,cookieSecure:Deno.env.get("LNT_COOKIE_SECURE")!=="false",trustProxy:!0},bn=dt.default.createApp({pool:mt,config:gn,staticFiles:pt}),ve=mn();ve.disable("x-powered-by");ve.use("/lnt",bn);ve.listen(Number(Deno.env.get("PORT")||8e3));

# Test report — 19 November 2026

**Environment:** Linux workspace, Node.js 22.23, PostgreSQL 16.15 (real server, not an emulator), Google Chrome (headless) via Playwright.
**Result:** 32/32 automated tests passed. The end-to-end browser test passed. `npm audit` found 0 vulnerabilities in production dependencies.

## Automated tests (`npm test`, real PostgreSQL)
| # | Acceptance criterion | Result |
|---|---|---|
| 1 | General male & female → 380,000 LAK, 10 KM | ✅ |
| 2 | Senior → 330,000 LAK, 5 KM; born 1978‑12‑26 accepted, 1978‑12‑27 rejected | ✅ |
| 3 | Family 3/4/5/6/10 → 880,000 / 1,179,000 / 1,478,000 / 1,777,000 / 2,973,000; each member stored as separate participant | ✅ |
| 4 | Family with 2 members rejected | ✅ |
| 5 | Tampered `clientTotal` rejected; General@5 KM, Senior@10 KM, Family@10 KM rejected; DB constraint blocks wrong distance | ✅ |
| 6 | Same request repeated and 6 parallel submits → exactly 1 registration, same reference & code; reused key with different data → 409 | ✅ |
| 7 | Same name + DOB → duplicate warning that can be confirmed; two families sharing one phone → both accepted | ✅ |
| 8 | Upload > 5 MB → 413; non-image disguised as PNG → 415; empty → 400; status unchanged after failures; JPG/WebP/PNG accepted; older proofs marked superseded | ✅ |
| 9 | Anonymous access to 9 admin endpoints (lists, exports, proofs, settings…) → 401; no public participant list | ✅ |
| 10 | Code of registration A cannot open B; phone number as code rejected | ✅ |
| 11 | Payment confirm: anonymous 401, registration staff 403, missing CSRF header 403, accountant OK; double confirm 409; participant cannot mark paid | ✅ |
| 12 | Reject with reason visible to participant; re-upload allowed | ✅ |
| 13 | 5 family members get 5 distinct BIBs (parallel auto-assign); duplicate BIB 409; two staff racing for same BIB → one 200, one 409; accountant cannot assign | ✅ |
| 14 | Kit/check-in per member, partial within family, undo | ✅ |
| 15 | Add member requires explicit recalculation; price change affects new registrations only; explicit recalculate applies it; paid registration locked; min 3 enforced; senior age rule on category change | ✅ |
| 16 | Cancel paid registration: staff 403, owner OK; financial fields & history kept | ✅ |
| 17 | Dashboard: family of 5 + 1 individual = 2 registrations, 6 participants, revenue 1,478,000 counted once; participant CSV 6 rows; payment CSV 2 rows; formula injection neutralised; UTF‑8 BOM; staff cannot export payments or see revenue | ✅ |
| 18 | Search by reference, team, phone (both formats), name, BIB; filters by category/gender/distance/payment | ✅ |
| 19 | Closed flag, past deadline, capacity (family rejected when not enough places, closes when full) | ✅ |
| 20 | Settings owner-only; bank details reported as unconfigured; image upload validated | ✅ |
| 21 | Owner cannot lock self out; deactivated staff lose session; no password hashes in audit | ✅ |
| 22 | New access code invalidates old one | ✅ |
| 23 | Login rate limiting → 429 | ✅ |
| 24 | Pages and Lao font load with no login; CSP header present | ✅ |
| 25 | Server logs contain no access codes, session cookies or code headers | ✅ |
| 26–32 | Unit tests: fee formula, age, phone normalisation, CSV escaping, image sniffing, access codes | ✅ |

## End-to-end browser test (`test/e2e-browser.py`, Chrome, 390×844 phone viewport)
Landing page → senior age warning (47 years shown as not qualifying, 48 accepted) → empty submit shows Lao field errors → 4-member family filled in. The fee bar shows 1,179,000 ກີບ. **The page was reloaded and the draft kept** → review → **submit double-clicked → one registration** → private status page shows "saved – not paid" → proof uploaded → "awaiting review" → lookup with a wrong code refused, the right code accepted → admin login → payment queue → confirm → auto BIB 5001/5002 → kit collected → reports → participant view shows "payment confirmed" + BIBs. No horizontal scrolling on `/`, `/register` or `/status` at phone width. Also checked at 1280 px desktop width. The only browser console messages were the deliberate wrong-code lookup (404) and the admin login check before sign-in (401). Screenshots are in `docs/screenshots/`.

## Not verified (honest limits)
- **Not deployed.** No public URL, real HTTPS certificate or custom domain was tested.
- **Access from Laos** (Lao mobile networks, Lao Wi-Fi) was not tested. That must be done by the organizer after deployment (README checklist).
- **Real iPhone/Android devices** were not used. Mobile was tested with Chrome's mobile emulation only (Safari rendering not tested).
- **Docker image build** could not run here because Docker Hub is blocked from this workspace. A clean `npm ci --omit=dev` production install was started and served all pages instead.
- Rate limits are per server process (in memory). If several app instances are run, each keeps its own count.
- Load or performance testing was not done. Expected scale (hundreds to low thousands of participants) is well within one small server, but nothing has been measured.
- Lao wording was written carefully but has not been reviewed by a native Lao proofreader.

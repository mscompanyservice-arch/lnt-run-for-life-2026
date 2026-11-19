# LNT RUN FOR LIFE 2026 — Registration System

Public registration website (Lao), private participant status pages, and a protected admin back office for **LNT RUN FOR LIFE 2026** (26 December 2026, Luang Namtha, Laos).

> **Status (19 Nov 2026): LIVE at https://run.msidgroup.com** (backup URL: https://lnt-run-2026.mscompanyservice.workers.dev).
> Hosting: Cloudflare Worker `lnt-run-2026` → Supabase Edge Function `lnt` (project `lnt-run-2026`, ref `rrgfqxraxnixjoqttots`, Singapore, free plan) → Supabase Postgres.
> Verified live: registration and pricing, idempotent retry, private lookup, wrong-code refusal, price tampering and age-48 rejection, real/fake/4.9 MB proof uploads, admin endpoints closed to the public. Test data was deleted afterwards.
> **Not yet verified:** access from Lao mobile and Lao Wi-Fi networks (organizer must test). Owner account: created by the organizer at /admin with the one-time setup code.

## Architecture

One Node.js 20+ server (Express 5) serves the Lao web pages, the JSON API and the admin app. One PostgreSQL 13+ database stores registrations, participants, staff, audit history **and payment-proof images** (BYTEA, private: only served through an authenticated admin endpoint). One database means one backup covers everything.

```
Browser (Android / iPhone / desktop, no app, no account)
   │  HTTPS (Caddy / hosting provider)
   ▼
Node.js server ── /, /register, /status, /admin   (static, self-hosted Noto Sans Lao font)
   │              /api/public/*  (config, register, own-registration lookup, proof upload)
   │              /api/admin/*   (session cookie + role check on every endpoint)
   ▼
PostgreSQL ── settings, categories, registrations, participants, payment_proofs,
              payment_events (append-only), audit_log, staff, sessions, assets
```

There are no external CDNs, analytics or third-party scripts. That keeps pages working on networks where other sites are blocked or slow.

### Key rules (enforced on the server)
| Rule | Where |
|---|---|
| Fees (live, editable in admin): General 380,000; Masters 350,000; Family `899000 + max(0, n−3) × 299000` LAK (seed values in migration 001 differ). Integers only | `src/domain.js computeFee`, DB `CHECK total_amount = …` |
| Distance fixed by category (General 10 KM, Senior/Family 5 KM) | validation + DB `CHECK` constraint |
| Masters (code `senior`, 5 KM): age ≥ 40 **on the event date** (born 1986‑12‑26 ✅, 1986‑12‑27 ❌). General 10 KM: age ≥ 15. Changed 19 Nov 2026 to match the published poster (migration 005; was 45, earlier 48) | `ageOn()`, `categories.min_age` |
| Prize age groups (age on event date): General 15–34 / 35+, Masters 40+, Family none. Shown on the site, in admin, in the participant CSV and the division report | `AGE_GROUPS`, `ageGroup()` |
| Family: ≥ 3 members (max 20, editable); every member is a separate participant row | validation, `participants` table |
| Browser total is never used; a mismatching `clientTotal` is rejected as tampering | `PRICE_MISMATCH` |
| Double-click / retry → one registration (idempotency key + row lock) | `registrations.idempotency_key UNIQUE` |
| Possible duplicate (same name + date of birth) → warning, user can confirm; shared phone numbers never blocked | `POSSIBLE_DUPLICATE` |
| Capacity counts **participants** (a family of 5 = 5) in non-cancelled registrations, paid or unpaid | `openState()` |
| BIB unique across event, case-insensitive, concurrent-safe | unique index + advisory lock |
| Paid / proof-pending registrations cannot be repriced; unpaid repricing only via explicit recorded action | `PRICE_LOCKED`, `RECALC_REQUIRED` |
| Cancellation keeps all financial fields and `payment_events` | `registration.cancel` |

### Participant access (no accounts)
After registering, a participant receives a **reference** (`LNT26-XXXXXX`) and a 12-character **access code** (`XXXX-XXXX-XXXX`, about 59 bits, rate-limited). The private link is `https://DOMAIN/status#r=REF&c=CODE`. The code sits in the URL fragment, so it is never sent to the server in the URL, never written to logs and never sent as a Referer. Only a SHA-256 hash is stored. A phone number alone never grants access. If a code is lost, staff verify identity and issue a new one (**ອອກລະຫັດເຂົ້າເບິ່ງໃໝ່**); the old code stops working.

### Roles
| Permission | Owner | Accountant | Registration staff |
|---|:-:|:-:|:-:|
| View registrations & participants | ✅ | ✅ | ✅ |
| Edit details, add/remove family members, recalculate | ✅ | | ✅ |
| Cancel (paid registrations: owner only) | ✅ | | ✅ |
| View proofs, confirm/reject payment | ✅ | ✅ | |
| Undo a confirmed payment | ✅ | | |
| BIB, kit collection, check-in | ✅ | | ✅ |
| Participant CSV / shirt & division reports | ✅ | ✅ | ✅ |
| Payment CSV, revenue figures | ✅ | ✅ | |
| Settings, prices, images, staff, full audit log | ✅ | | |

Security: scrypt password hashes, HttpOnly + Secure + SameSite=Strict session cookie (12 h), CSRF header check on every state-changing admin call, strict Content-Security-Policy (no inline scripts), login/lookup/upload/registration rate limits, 64 KB JSON and 5 MB upload limits, upload type detected from file bytes (not the browser's claim). Proofs are served with `Cache-Control: private, no-store` and a sandbox CSP. The access log records only method, path, status and duration.

## Local setup

```bash
npm install
cp .env.example .env            # set DATABASE_URL and APP_SECRET (openssl rand -hex 32), COOKIE_SECURE=false for http://localhost
set -a; . ./.env; set +a
npm run migrate
npm run create-staff -- owner owner "ເຈົ້າຂອງງານ"   # prompts for a password (min 10 chars)
npm start                        # http://localhost:3000  and  /admin
```

Tests (need a disposable PostgreSQL database; **the test run wipes it**):
```bash
TEST_DATABASE_URL=postgres://USER:PASS@localhost/lnt_test npm test
```

## Finishing the Supabase + Cloudflare deployment
Chosen architecture (no server to rent):
`Browser → Cloudflare Worker (run.msidgroup.com) → Supabase Edge Function "lnt" (Express app, Deno) → Supabase Postgres`.
The Worker is required because Supabase serves `text/html` as `text/plain` on its own domain. The Worker restores HTML content types and the CSP.

Done:
- Supabase project created; migrations `001`–`003` applied. `app_secret` is generated inside the database, so there is no secret to type anywhere.
- Edge build verified locally under Deno 2.9 with the real Worker code in front of it. The full browser flow passed: register, upload, setup, confirm, BIB.

How to redeploy after code changes:
1. `node edge/build.mjs` → commit → push to `main` (public repo, code only).
2. Put the new commit hash into `edge/function/index.ts`, then deploy it as function `lnt` with **verify_jwt = false** (Supabase MCP `deploy_edge_function`, or `supabase functions deploy lnt --no-verify-jwt`).
3. The Worker rarely changes; if it does, paste `deploy/cloudflare-worker/worker.js` into the `lnt-run-2026` editor and deploy.
4. (Only if no owner exists) create a one-time setup code: `INSERT INTO setup_code (id, code_hash) VALUES (1, encode(sha256(('setup:' || 'YOURCODE')::bytea),'hex'));`, open `/admin`, and create the owner account with your own password.


## Deployment (other options)

Nothing has been purchased or deployed. Pick one option, then follow [the launch checklist](#before-declaring-launch-complete).

### Option A — one small VPS with Docker (recommended)
Lowest running cost and full control. Choose a provider region close to Laos (Singapore or Bangkok). Any 1 vCPU / 1–2 GB RAM Linux VPS is plenty for this event.

```bash
# on the server (Docker + Docker Compose installed)
git clone <your repo> lnt-run && cd lnt-run/deploy
cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 24)
APP_SECRET=$(openssl rand -hex 32)
SITE_DOMAIN=run.example.com
EOF
docker compose up -d --build
docker compose exec app node scripts/create-staff.js owner owner "ເຈົ້າຂອງງານ"
```
Point a DNS **A record** for `SITE_DOMAIN` at the server's IP **before** starting. Caddy then obtains and renews the HTTPS certificate automatically.

### Option B — managed hosting (Render / Railway / Fly.io, etc.)
Deploy the `Dockerfile`, attach a managed PostgreSQL, and set the environment variables from `.env.example` (`DATABASE_URL`, `APP_SECRET`, `COOKIE_SECURE=true`, `TRUST_PROXY=1`, plus `DATABASE_SSL=true` if the database requires TLS). `deploy/render.yaml` is a starting Blueprint for Render. Check current pricing first, because free tiers often sleep or expire their databases, which is not acceptable for registrations.

**Using Supabase only as the database** also works: set `DATABASE_URL` to the project's Postgres connection string, with `DATABASE_SSL=true`. The app still needs a Node host from option A or B. Use a **separate** project for this event rather than another business's project.

### Custom domain
The company domain is managed on Cloudflare, so a subdomain such as `run.msidgroup.com` is a natural choice:
- Option A: an `A` record pointing to the VPS IP. Start with **DNS only** (grey cloud) so the direct path can be tested from Laos; turn the proxy on later only if tests stay good.
- Option B: a `CNAME` to the host's default domain, then add the custom domain in the host's dashboard.
Keep the host's default URL working as a **second entry point**, so that if one hostname or network path fails for some Lao users, the other can be shared.

### About the previous ERR_CONNECTION_RESET
The cause was not diagnosed here and isn't assumed. A connection reset in Chrome can come from network filtering on a particular hostname or provider, from TLS problems, or from the hosting platform itself. This system reduces dependency risk: its own domain, no third-party scripts or fonts, standard HTTPS, and a second hostname. It **cannot guarantee** access on every Lao network. Test it as described below.

## Before declaring launch complete
1. `https://DOMAIN/healthz` returns `{"ok":true}`.
2. In a private/incognito window (no ChatGPT/Claude login), open `/`, `/register` and `/status`, and register a test entry.
3. The organizer tests from **a Lao mobile connection (e.g. Unitel, Lao Telecom, ETL or TPlus — any one you use)** and **a Lao Wi-Fi**: home page, full registration, proof upload, private link.
4. Confirm `/admin` requires a login, and that `/api/admin/registrations` without login returns 401.
5. Record the results (date, network, device, OK/fail) in the Lao guide's checklist, then delete the test registrations by cancelling them.

## Backup and restore
All data, including proof images, lives in PostgreSQL.
```bash
# backup (daily, and before/after event day)
pg_dump --format=custom --no-owner "$DATABASE_URL" > lnt-$(date +%F-%H%M).dump
# Docker option A:
docker compose exec -T db pg_dump -U lnt -Fc lnt > lnt-$(date +%F-%H%M).dump
# restore into an empty database
pg_restore --no-owner --clean --if-exists -d "$DATABASE_URL" lnt-YYYY-MM-DD-HHMM.dump
```
Store copies off the server (e.g. Google Drive). Dumps contain personal data and payment proofs, so keep them private. Test a restore once before the event.

## Configuration still needed (owner fills in at /admin → ຕັ້ງຄ່າງານ)
Everything below is shown on the site as "not yet announced" until filled in. None of it is invented.
- **Bank name, account holder, account number, payment QR image**: registration works without them, and the site says payment details are pending.
- **Organizer WhatsApp number**: not configured. (The event's Facebook page uses a WhatsApp number; enter it here if it is also the registration contact.)
- **Meeting point and meeting time** (start location).
- **Registration deadline** and **capacity** (if any).
- **Shirt sizes**: default `XS, S, M, L, XL, 2XL, 3XL`. Confirm with the shirt supplier and add child sizes if needed.
- **BIB number ranges**: defaults General 1001+, Senior 3001+, Family 5001+.
- **Logo, event images, participant benefits, event instructions.**
- **Staff accounts**: create owner via CLI, then accountant/staff accounts in **ພະນັກງານ**.
- **Hosting account, domain/DNS record, and the Lao network tests above.**

## Project layout
```
src/        server.js (app), public-api.js, admin-api.js, domain.js (rules), security.js, shared.js, db.js
migrations/ 001_init.sql (schema, constraints, indexes, initial fees/settings)
public/     index.html, register.html, status.html, admin.html, static/ (css, js, favicon)
scripts/    migrate.js, create-staff.js
test/       domain.test.js, api.test.js (real PostgreSQL)
deploy/     docker-compose.yml, Caddyfile, render.yaml
docs/       ຄູ່ມືການໃຊ້ງານ.md (Lao staff guide), TEST-REPORT.md
```

## Supabase free-plan notes
- Free projects pause after about 7 days with no activity. While registration is open, normal traffic keeps the project active. If it pauses, restore it from the Supabase dashboard; data is kept. Upgrading to Pro (paid) removes this risk.
- Daily automatic backups are kept on Supabase for a short period. Also run `pg_dump` exports yourself (see Backup).

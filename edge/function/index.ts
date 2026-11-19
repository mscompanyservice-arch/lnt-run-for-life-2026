// Supabase Edge Function "lnt" (deploy with verify_jwt = false; the app does its own authentication).
// Replace OWNER and COMMIT after pushing this repository to GitHub (public), then deploy.
import './ext-init.ts';
import 'https://cdn.jsdelivr.net/gh/OWNER/lnt-run-for-life-2026@COMMIT/edge/dist/app.js';

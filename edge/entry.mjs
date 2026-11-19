// Supabase Edge Function entry point for the LNT registration server.
// Requires globalThis.__lntExt to be set first (see edge/function/ext-init.ts).
import serverMod from '../src/server.js';
import dbMod from '../src/db.js';
import ASSETS from './assets.generated.js';

const express = globalThis.__lntExt.express;
const decode = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const staticFiles = {};
for (const [name, f] of Object.entries(ASSETS)) {
  staticFiles[name] = { type: f.type, body: f.b64 ? Buffer.from(decode(f.b64)) : f.text };
}
const dbUrl = Deno.env.get('LNT_DATABASE_URL') || Deno.env.get('SUPABASE_DB_URL');
const pool = dbMod.createPool(dbUrl);
const row = (await pool.query('SELECT value FROM app_secret WHERE id=1')).rows[0];
if (!row || row.value.length < 32) throw new Error('app_secret is not initialised');
const config = { appSecret: row.value, cookieSecure: Deno.env.get('LNT_COOKIE_SECURE') !== 'false', trustProxy: true };
const inner = serverMod.createApp({ pool, config, staticFiles });
const outer = express();
outer.disable('x-powered-by');
outer.use('/lnt', inner); // Supabase routes requests as /<function-name>/...
outer.listen(Number(Deno.env.get('PORT') || 8000));

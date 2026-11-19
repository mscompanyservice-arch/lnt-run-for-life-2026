'use strict';
const { createPool, migrate } = require('../src/db');

(async () => {
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(1); }
  const pool = createPool(process.env.DATABASE_URL);
  await migrate(pool);
  console.log('database is up to date');
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });

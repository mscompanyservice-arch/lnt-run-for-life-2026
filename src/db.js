'use strict';
const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');

// BIGINT (int8) -> JS number. Safe because all money values are far below 2^53 and checked as safe integers.
types.setTypeParser(20, (v) => {
  const n = Number(v);
  if (!Number.isSafeInteger(n)) throw new Error('int8 value exceeds safe integer range');
  return n;
});
// DATE -> keep as 'YYYY-MM-DD' string (no time-zone shifting).
types.setTypeParser(1082, (v) => v);

function createPool(connectionString) {
  const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined;
  return new Pool({ connectionString, max: Number(process.env.DATABASE_POOL_MAX || 10), ssl });
}

async function tx(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    throw e;
  } finally {
    client.release();
  }
}

async function migrate(pool, log = console.log) {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
  for (const f of files) {
    const done = await pool.query('SELECT 1 FROM schema_migrations WHERE version=$1', [f]);
    if (done.rowCount) continue;
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    await tx(pool, async (c) => {
      await c.query(sql);
      await c.query('INSERT INTO schema_migrations (version) VALUES ($1)', [f]);
    });
    log(`migration applied: ${f}`);
  }
}

module.exports = { createPool, tx, migrate };

'use strict';
// Create a staff account from the server command line.
// Usage: npm run create-staff -- <username> <owner|accountant|staff> "<Display name>"
// The password is read from a hidden prompt (or STAFF_PASSWORD for automated setups). It is never stored in source code.
const readline = require('readline');
const { createPool, migrate } = require('../src/db');
const { hashPassword, checkPasswordStrength } = require('../src/security');

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (a) => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}

(async () => {
  const [username, role, ...nameParts] = process.argv.slice(2);
  const displayName = nameParts.join(' ') || username;
  if (!username || !['owner', 'accountant', 'staff'].includes(role)) {
    console.error('Usage: npm run create-staff -- <username> <owner|accountant|staff> "<Display name>"');
    process.exit(1);
  }
  let password = process.env.STAFF_PASSWORD;
  if (!password) {
    password = await askHidden('Password (min 10 chars): ');
    const again = await askHidden('Repeat password: ');
    if (password !== again) { console.error('Passwords do not match'); process.exit(1); }
  }
  checkPasswordStrength(password);
  const pool = createPool(process.env.DATABASE_URL);
  await migrate(pool, () => {});
  try {
    await pool.query('INSERT INTO staff (username, display_name, password_hash, role) VALUES ($1,$2,$3,$4)', [username, displayName, hashPassword(password), role]);
    console.log(`created ${role} account: ${username}`);
  } catch (e) {
    console.error(e.code === '23505' ? 'username already exists' : e.message);
    process.exitCode = 1;
  }
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });

#!/usr/bin/env node
/**
 * Dumps the current PostgreSQL schema from the DB defined in .env
 * and overwrites setup_db.sql with the result.
 * Run: node scripts/dump-schema.mjs
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Load .env (only DB_* vars, skip comments and empty)
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('No .env file found');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key.startsWith('DB_')) env[key] = value;
  }
  return env;
}

const env = loadEnv();
const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = env;
if (!DB_HOST || !DB_NAME || !DB_USER) {
  console.error('Missing DB_HOST, DB_NAME, or DB_USER in .env');
  process.exit(1);
}

const outPath = path.join(rootDir, 'setup_db.sql');
console.log(`Dumping schema from ${DB_USER}@${DB_HOST}:${DB_PORT || 5432}/${DB_NAME} -> setup_db.sql`);

try {
  const runEnv = { ...process.env, PGPASSWORD: DB_PASSWORD || '' };
  const dump = execSync(
    [
      'pg_dump',
      '-h', DB_HOST,
      '-p', String(DB_PORT || 5432),
      '-U', DB_USER,
      '-d', DB_NAME,
      '--schema-only',
      '--no-owner',
      '--no-privileges',
    ].join(' '),
    { encoding: 'utf8', env: runEnv }
  );

  // Strip trailing whitespace and ensure single trailing newline
  const cleaned = dump.replace(/\s+$/gm, '').trimEnd() + '\n';
  fs.writeFileSync(outPath, cleaned, 'utf8');
  console.log('Updated setup_db.sql with current schema.');
} catch (err) {
  if (err.stderr) console.error(err.stderr.toString());
  console.error('pg_dump failed. Is PostgreSQL running and can you connect with the .env credentials?');
  process.exit(1);
}

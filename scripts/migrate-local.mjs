import { spawnSync } from 'node:child_process';

const cliEnv = {
  ...process.env,
  SUPABASE_TELEMETRY_DISABLED: '1',
};

function runSupabase(args) {
  const result = spawnSync('supabase', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: cliEnv,
    windowsHide: true,
  });

  if (result.error) {
    throw new Error('Could not run the Supabase CLI. Install it and ensure it is on PATH.');
  }

  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
      .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, 'postgresql://[database URL redacted]')
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT redacted]');
    process.stderr.write(output.slice(-4000));
    throw new Error(`Supabase command failed with exit code ${result.status ?? 'unknown'}.`);
  }

  return result.stdout ?? '';
}

const statusOutput = runSupabase(['status', '--output', 'env']);
const databaseUrlLine = statusOutput
  .split(/\r?\n/)
  .find((line) => /^\s*(?:export\s+)?DB_URL=/.test(line));

if (!databaseUrlLine) {
  throw new Error('The local Supabase status output did not include DB_URL.');
}

let databaseUrlValue = databaseUrlLine.replace(/^\s*(?:export\s+)?DB_URL=/, '').trim();
if (
  (databaseUrlValue.startsWith('"') && databaseUrlValue.endsWith('"')) ||
  (databaseUrlValue.startsWith("'") && databaseUrlValue.endsWith("'"))
) {
  databaseUrlValue = databaseUrlValue.slice(1, -1);
}

const databaseUrl = new URL(databaseUrlValue);
if (!['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname)) {
  throw new Error('This script only runs migrations against local Supabase.');
}

databaseUrl.username = 'supabase_admin';
const ownerDatabaseUrl = databaseUrl.toString();

runSupabase(['migration', 'up', '--db-url', ownerDatabaseUrl, '--include-all']);
runSupabase(['db', 'query', '--db-url', ownerDatabaseUrl, '--file', 'supabase/seed.sql']);

console.info('Applied local Supabase migrations and seeded document types.');

import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';

class AdminSetupError extends Error {}

// Run after the schema migrations. Existing environment variables take priority.
async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      password: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    console.info('npm run admin:create -- --email "admin@example.com" --password "your-password"');
    console.info('Alternatively, set ADMIN_EMAIL and ADMIN_PASSWORD in the environment.');
    return;
  }

  if (existsSync('.env.local')) loadEnvFile('.env.local');
  const email = (values.email ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = values.password ?? process.env.ADMIN_PASSWORD;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new AdminSetupError('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local or the environment.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AdminSetupError('Pass a valid --email or set ADMIN_EMAIL.');
  }
  if (!password || password.length < 12) {
    throw new AdminSetupError('Pass a password of at least 12 characters using --password or ADMIN_PASSWORD.');
  }

  const target = new URL(url);
  if (target.protocol !== 'https:' &&
      !(target.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))) {
    throw new AdminSetupError('Use HTTPS for hosted Supabase projects, or HTTP for localhost.');
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: existing, error: lookupError, status: lookupStatus } = await admin
    .from('profiles').select('id,email').eq('role', 'ADMIN');
  if (lookupError) {
    const errorCode = lookupError.code || 'none';
    const reason = lookupStatus === 0
      ? 'No HTTP response was received; check network access, DNS, TLS, and the project URL.'
      : errorCode === '42501'
        ? 'The database denied access to public.profiles for service_role.'
        : lookupStatus === 401 || lookupStatus === 403
          ? 'Supabase rejected the configured project key.'
          : 'Check that the profiles schema migration is applied and the table is exposed to the Data API.';
    throw new AdminSetupError(`Could not read admin profiles (HTTP ${lookupStatus ?? 'unknown'}; code ${errorCode}). ${reason}`);
  }

  let userId;
  if (existing.length > 0) {
    if (existing.length !== 1 || existing[0].email?.toLowerCase() !== email) {
      throw new AdminSetupError('A different admin already exists. This project permits only one admin.');
    }
    userId = existing[0].id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'ADMIN' },
    });
    if (error || !data.user) {
      // Do not print request bodies, passwords, service keys, or raw errors.
      throw new AdminSetupError(`Admin creation failed (${error?.code ?? error?.status ?? 'unknown'}). Check whether the email is already registered or the password violates your Auth policy. Existing accounts are not promoted or reset.`);
    }
    userId = data.user.id;
  }

  const { data: account, error: accountError } = await admin.auth.admin.getUserById(userId);
  const { data: profile, error: profileError } = await admin
    .from('profiles').select('id,email,role').eq('id', userId).single();
  if (accountError || profileError ||
      account.user?.app_metadata?.role !== 'ADMIN' ||
      account.user?.email?.toLowerCase() !== email ||
      profile?.role !== 'ADMIN' || profile.email?.toLowerCase() !== email) {
    throw new AdminSetupError('Could not verify both the Auth account and ADMIN profile. The account may already exist; check the profile synchronization triggers before retrying.');
  }

  console.info(existing.length > 0
    ? 'Admin account already exists and is verified. Password was not changed.'
    : 'Admin account created and verified. You can now sign in.');
}

main().catch((error) => {
  // Only errors constructed above are intended for display; unexpected SDK or
  // network failures are deliberately kept out of logs containing credentials.
  console.error(error instanceof AdminSetupError
    ? error.message
    : 'Admin setup failed. Check the project configuration and connectivity.');
  process.exitCode = 1;
});

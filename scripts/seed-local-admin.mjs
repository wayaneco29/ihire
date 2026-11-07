import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const localEnv = new Map(Object.entries(process.env));
const envFile = await readFile(resolve(process.cwd(), '.env.local'), 'utf8');

for (const line of envFile.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (!match || match[1] in process.env) continue;

  let value = match[2];
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  localEnv.set(match[1], value);
}

const apiUrl = localEnv.get('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = localEnv.get('SUPABASE_SERVICE_ROLE_KEY');
const email = localEnv.get('LOCAL_ADMIN_EMAIL')?.trim().toLowerCase();
const password = localEnv.get('LOCAL_ADMIN_PASSWORD');

if (!apiUrl || !serviceKey || !email || !password) {
  throw new Error(
    'Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LOCAL_ADMIN_EMAIL, and LOCAL_ADMIN_PASSWORD in .env.local.',
  );
}

const supabaseUrl = new URL(apiUrl);
if (!['localhost', '127.0.0.1', '::1'].includes(supabaseUrl.hostname)) {
  throw new Error('This script only creates accounts on a local Supabase instance.');
}

if (password.length < 12) {
  throw new Error('LOCAL_ADMIN_PASSWORD must be at least 12 characters long.');
}

const headers = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  'content-type': 'application/json',
};

const profilesUrl = new URL('/rest/v1/profiles', supabaseUrl);
profilesUrl.searchParams.set('select', 'id,email');
profilesUrl.searchParams.set('role', 'eq.ADMIN');

const existingAdminsResponse = await fetch(profilesUrl, { headers });
if (!existingAdminsResponse.ok) {
  throw new Error(`Could not inspect local Admin profiles (HTTP ${existingAdminsResponse.status}).`);
}

const existingAdmins = await existingAdminsResponse.json();
if (existingAdmins.length > 0) {
  if (existingAdmins.length === 1 && existingAdmins[0].email?.toLowerCase() === email) {
    console.info('The local Admin account already exists; no changes were made.');
  } else {
    throw new Error('A different local Admin account already exists; refusing to create another.');
  }
} else {
  const usersUrl = new URL('/auth/v1/admin/users', supabaseUrl);
  usersUrl.searchParams.set('page', '1');
  usersUrl.searchParams.set('per_page', '1000');

  const usersResponse = await fetch(usersUrl, { headers });
  if (!usersResponse.ok) {
    throw new Error(`Could not inspect local Auth users (HTTP ${usersResponse.status}).`);
  }

  const userPayload = await usersResponse.json();
  const users = Array.isArray(userPayload) ? userPayload : userPayload.users ?? [];
  let localUser = users.find((user) => user.email?.toLowerCase() === email);

  if (!localUser) {
    const createUserResponse = await fetch(new URL('/auth/v1/admin/users', supabaseUrl), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: 'ADMIN' },
      }),
    });

    if (!createUserResponse.ok) {
      throw new Error(`Could not create the local Admin account (HTTP ${createUserResponse.status}).`);
    }

    localUser = await createUserResponse.json();
  }

  const updateUserResponse = await fetch(
    new URL(`/auth/v1/admin/users/${localUser.id}`, supabaseUrl),
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({ app_metadata: { role: 'ADMIN' } }),
    },
  );

  if (!updateUserResponse.ok) {
    throw new Error(`Could not assign the ADMIN Auth role (HTTP ${updateUserResponse.status}).`);
  }

  const createdProfileUrl = new URL('/rest/v1/profiles', supabaseUrl);
  createdProfileUrl.searchParams.set('select', 'id,role,email');
  createdProfileUrl.searchParams.set('id', `eq.${localUser.id}`);

  const createdProfileResponse = await fetch(createdProfileUrl, { headers });
  if (!createdProfileResponse.ok) {
    throw new Error(`Could not confirm the local Admin profile (HTTP ${createdProfileResponse.status}).`);
  }

  const createdProfiles = await createdProfileResponse.json();
  if (createdProfiles.length !== 1) {
    throw new Error('The auth trigger did not create the expected profile.');
  }

  if (createdProfiles[0].role !== 'ADMIN') {
    const repairResponse = await fetch(createdProfileUrl, {
      method: 'PATCH',
      headers: { ...headers, prefer: 'return=minimal' },
      body: JSON.stringify({ role: 'ADMIN' }),
    });

    if (!repairResponse.ok) {
      throw new Error(`Could not repair the local Admin profile (HTTP ${repairResponse.status}).`);
    }
  }

  console.info('Created the local Admin account.');
}

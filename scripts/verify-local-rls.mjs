import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildRlsAssertions } from './rls-verification-assertions.mjs';

const envFile = await readFile(join(process.cwd(), '.env.local'), 'utf8');
const localEnv = new Map(Object.entries(process.env));

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

const supabaseUrl = new URL(localEnv.get('NEXT_PUBLIC_SUPABASE_URL') ?? '');
const serviceKey = localEnv.get('SUPABASE_SERVICE_ROLE_KEY');
if (!serviceKey || !['localhost', '127.0.0.1', '::1'].includes(supabaseUrl.hostname)) {
  throw new Error('Set local Supabase credentials in .env.local before RLS verification.');
}

const serviceHeaders = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  'content-type': 'application/json',
};
const runId = randomUUID();
const createdUsers = [];
const createdJobs = [];
const storageFixture = Buffer.from('%PDF-1.4\n% Temporary RLS fixture\n%%EOF\n');
let storageKey;
let sqlFile;

async function safeError(response, operation) {
  let detail = '';
  try {
    const body = await response.clone().json();
    const code = typeof body.code === 'string' ? body.code : '';
    const message = typeof body.message === 'string' ? body.message : '';
    const sanitized = message
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email redacted]')
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '[id redacted]')
      .slice(0, 240);
    detail = [code, sanitized].filter(Boolean).join(': ');
  } catch {}
  return `Local Supabase ${operation} failed (HTTP ${response.status})${detail ? `: ${detail}` : '.'}`;
}

async function getRows(table, filters = {}) {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(filters)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: serviceHeaders });
  if (!response.ok) throw new Error(await safeError(response, `read ${table}`));
  return response.json();
}

async function insertRows(table, rows) {
  const response = await fetch(new URL(`/rest/v1/${table}`, supabaseUrl), {
    method: 'POST',
    headers: { ...serviceHeaders, prefer: 'return=representation' },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(await safeError(response, `insert ${table}`));
  return response.json();
}

async function createTemporaryUser(label, role) {
  const email = `rls-${label}-${runId}@local.test`;
  const password = `${randomBytes(32).toString('base64url')}Aa9!`;
  const createResponse = await fetch(new URL('/auth/v1/admin/users', supabaseUrl), {
    method: 'POST',
    headers: serviceHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!createResponse.ok) throw new Error(await safeError(createResponse, 'create temporary Auth user'));

  const authUser = await createResponse.json();
  createdUsers.push(authUser.id);

  const updateResponse = await fetch(
    new URL(`/auth/v1/admin/users/${authUser.id}`, supabaseUrl),
    {
      method: 'PUT',
      headers: serviceHeaders,
      body: JSON.stringify({ app_metadata: { role, rls_verification: runId } }),
    },
  );
  if (!updateResponse.ok) throw new Error(await safeError(updateResponse, 'assign temporary Auth role'));

  const profiles = await getRows('profiles', {
    select: 'id,role',
    id: `eq.${authUser.id}`,
  });
  if (profiles.length !== 1 || profiles[0].role !== role) {
    throw new Error('A temporary role profile did not match the requested role.');
  }

  return { profileId: authUser.id, role };
}

function runSupabase(args) {
  const result = spawnSync('supabase', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
      .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, 'postgresql://[database URL redacted]')
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT redacted]');
    throw new Error(`Supabase command failed. ${output.slice(-1500)}`);
  }
  return result.stdout ?? '';
}

async function cleanup() {
  const failures = [];

  if (storageKey) {
    try {
      const response = await fetch(new URL('/storage/v1/object/applicant-documents', supabaseUrl), {
        method: 'DELETE',
        headers: serviceHeaders,
        body: JSON.stringify({ prefixes: [storageKey] }),
      });
      if (!response.ok && response.status !== 404) failures.push('storage object');
    } catch {
      failures.push('storage object');
    }
  }

  try {
    const listResponse = await fetch(
      new URL('/storage/v1/object/list/applicant-documents', supabaseUrl),
      {
        method: 'POST',
        headers: serviceHeaders,
        body: JSON.stringify({
          prefix: '',
          limit: 1000,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        }),
      },
    );
    if (!listResponse.ok) {
      failures.push('prior storage fixture scan');
    } else {
      const candidates = await listResponse.json();
      const recentCutoff = Date.now() - 30 * 60 * 1000;
      for (const candidate of candidates) {
        const candidateTime = Date.parse(candidate.created_at ?? '');
        if (
          !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(candidate.name ?? '') ||
          Number(candidate.metadata?.size) !== storageFixture.length ||
          !Number.isFinite(candidateTime) ||
          candidateTime < recentCutoff
        ) continue;

        const downloadResponse = await fetch(
          new URL(`/storage/v1/object/applicant-documents/${candidate.name}`, supabaseUrl),
          { headers: serviceHeaders },
        );
        if (!downloadResponse.ok) continue;
        const body = Buffer.from(await downloadResponse.arrayBuffer());
        if (!body.equals(storageFixture)) continue;

        const removeResponse = await fetch(
          new URL('/storage/v1/object/applicant-documents', supabaseUrl),
          {
            method: 'DELETE',
            headers: serviceHeaders,
            body: JSON.stringify({ prefixes: [candidate.name] }),
          },
        );
        if (!removeResponse.ok) failures.push('prior storage fixture');
      }
    }
  } catch {
    failures.push('prior storage fixture scan');
  }

  if (createdJobs.length > 0) {
    try {
      const url = new URL('/rest/v1/job_postings', supabaseUrl);
      url.searchParams.set('id', `in.(${createdJobs.join(',')})`);
      const response = await fetch(url, { method: 'DELETE', headers: serviceHeaders });
      if (!response.ok) failures.push('job fixtures');
    } catch {
      failures.push('job fixtures');
    }
  }

  for (const userId of createdUsers.reverse()) {
    try {
      const response = await fetch(new URL(`/auth/v1/admin/users/${userId}`, supabaseUrl), {
        method: 'DELETE',
        headers: serviceHeaders,
      });
      if (!response.ok && response.status !== 404) failures.push('temporary Auth users');
    } catch {
      failures.push('temporary Auth users');
    }
  }

  if (sqlFile) {
    try {
      await rm(sqlFile, { force: true });
    } catch {
      failures.push('temporary SQL file');
    }
  }

  if (failures.length > 0) {
    console.error(`Temporary verification cleanup failed for: ${[...new Set(failures)].join(', ')}.`);
    process.exitCode = 1;
  }
}

try {
  const [applicantA, applicantB, hrA, hrB, evaluator] = await Promise.all([
    createTemporaryUser('applicant-a', 'APPLICANT'),
    createTemporaryUser('applicant-b', 'APPLICANT'),
    createTemporaryUser('hr-a', 'HR'),
    createTemporaryUser('hr-b', 'HR'),
    createTemporaryUser('evaluator', 'EVALUATOR'),
  ]);

  const [adminProfiles, applicantARows, applicantBRows, documentTypes] = await Promise.all([
    getRows('profiles', { select: 'id', role: 'eq.SUPER_ADMIN' }),
    getRows('applicants', { select: 'id,applicant_number', profile_id: `eq.${applicantA.profileId}` }),
    getRows('applicants', { select: 'id,applicant_number', profile_id: `eq.${applicantB.profileId}` }),
    getRows('document_types', { select: 'id', name: 'eq.Transcript of Records' }),
  ]);

  if (adminProfiles.length !== 1 || applicantARows.length !== 1 || applicantBRows.length !== 1 || documentTypes.length !== 1) {
    throw new Error('Required local RLS verification fixtures were not available.');
  }

  const admin = { profileId: adminProfiles[0].id, role: 'SUPER_ADMIN' };
  const jobA = (await insertRows('job_postings', {
    hr_id: hrA.profileId,
    title: 'Temporary RLS Verification A',
    description: 'Temporary local verification fixture.',
    slots: 1,
    status: 'OPEN',
  }))[0];
  createdJobs.push(jobA.id);

  const jobB = (await insertRows('job_postings', {
    hr_id: hrB.profileId,
    title: 'Temporary RLS Verification B',
    description: 'Temporary local verification fixture.',
    slots: 1,
    status: 'OPEN',
  }))[0];
  createdJobs.push(jobB.id);

  const pdsA = (await insertRows('pds_versions', {
    applicant_id: applicantARows[0].id,
    version_no: 1,
    status: 'SUBMITTED',
    current_step: 11,
    completed_steps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    submitted_at: new Date().toISOString(),
  }))[0];
  const pdsB = (await insertRows('pds_versions', {
    applicant_id: applicantBRows[0].id,
    version_no: 1,
    status: 'SUBMITTED',
    current_step: 11,
    completed_steps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    submitted_at: new Date().toISOString(),
  }))[0];

  await insertRows('pds_personal_info', [
    {
      pds_version_id: pdsA.id,
      surname: 'RlsSampleA',
      first_name: 'ApplicantA',
      date_of_birth: '1990-01-01',
      place_of_birth: 'Example City',
      sex_at_birth: 'FEMALE',
      civil_status: 'SINGLE',
      citizenship: 'FILIPINO',
      email: 'applicant-a@example.test',
    },
    {
      pds_version_id: pdsB.id,
      surname: 'RlsSampleB',
      first_name: 'ApplicantB',
      date_of_birth: '1991-02-02',
      place_of_birth: 'Example City',
      sex_at_birth: 'MALE',
      civil_status: 'SINGLE',
      citizenship: 'FILIPINO',
      email: 'applicant-b@example.test',
    },
  ]);

  await insertRows('pds_addresses', [
    { pds_version_id: pdsA.id, type: 'RESIDENTIAL' },
    { pds_version_id: pdsA.id, type: 'PERMANENT' },
    { pds_version_id: pdsB.id, type: 'RESIDENTIAL' },
    { pds_version_id: pdsB.id, type: 'PERMANENT' },
  ]);
  await insertRows('pds_family_background', [
    { pds_version_id: pdsA.id },
    { pds_version_id: pdsB.id },
  ]);
  await insertRows('pds_education', [
    { pds_version_id: pdsA.id, level: 'COLLEGE', sort_order: 1, school_name: 'Example School A' },
    { pds_version_id: pdsB.id, level: 'COLLEGE', sort_order: 1, school_name: 'Example School B' },
  ]);
  await insertRows('pds_work_experience', [
    {
      pds_version_id: pdsA.id,
      date_from: '2020-01-01',
      position_title: 'Example Role A',
      agency_company: 'Example Employer A',
      sort_order: 1,
    },
    {
      pds_version_id: pdsB.id,
      date_from: '2021-01-01',
      position_title: 'Example Role B',
      agency_company: 'Example Employer B',
      sort_order: 1,
    },
  ]);
  await insertRows('pds_learning_development', [
    { pds_version_id: pdsA.id, title: 'Example Training A', hours: 10, sort_order: 1 },
    { pds_version_id: pdsB.id, title: 'Example Training B', hours: 8, sort_order: 1 },
  ]);
  await insertRows('pds_other_info', [
    { pds_version_id: pdsA.id, category: 'SKILL_HOBBY', description: 'Example skill A', sort_order: 1 },
    { pds_version_id: pdsB.id, category: 'SKILL_HOBBY', description: 'Example skill B', sort_order: 1 },
  ]);
  await insertRows('pds_questionnaire', [
    { pds_version_id: pdsA.id, question_code: '34A', answer: false, details: null },
    { pds_version_id: pdsB.id, question_code: '34A', answer: true, details: 'Example answer' },
  ]);
  const applicationA = (await insertRows('applications', {
    job_id: jobA.id,
    applicant_id: applicantARows[0].id,
    pds_version_id: pdsA.id,
    status: 'SUBMITTED',
  }))[0];
  const applicationB = (await insertRows('applications', {
    job_id: jobB.id,
    applicant_id: applicantBRows[0].id,
    pds_version_id: pdsB.id,
    status: 'SUBMITTED',
  }))[0];

  storageKey = randomUUID();
  await insertRows('documents', {
    applicant_id: applicantARows[0].id,
    document_type_id: documentTypes[0].id,
    file_path: storageKey,
    version: 1,
    status: 'FOR_REVIEW',
  });

  const uploadResponse = await fetch(
    new URL(`/storage/v1/object/applicant-documents/${storageKey}`, supabaseUrl),
    {
      method: 'POST',
      headers: {
        ...serviceHeaders,
        'content-type': 'application/pdf',
        'x-upsert': 'false',
      },
      body: storageFixture,
    },
  );
  if (!uploadResponse.ok) throw new Error(await safeError(uploadResponse, 'upload temporary storage fixture'));

  const invitationEmail = `rls-invite-${runId}@local.test`;
  const invitationTokenHash = createHash('sha256').update(randomUUID()).digest('hex');
  sqlFile = join(tmpdir(), `slc-rls-verification-${runId}.sql`);
  const assertionBody = buildRlsAssertions({
    applicantA,
    applicantB,
    hrA,
    hrB,
    evaluator,
    admin,
    applicantAId: applicantARows[0].id,
    applicantBId: applicantBRows[0].id,
    storageKey,
    invitationEmail,
    invitationTokenHash,
  });
  const sql = `do $rls_verification$\nbegin\n${assertionBody}\nend\n$rls_verification$;\n`;
  await writeFile(sqlFile, sql, 'utf8');

  const statusOutput = runSupabase(['status', '--output', 'env']);
  const dbLine = statusOutput.split(/\r?\n/).find((line) => /^\s*(?:export\s+)?DB_URL=/.test(line));
  if (!dbLine) throw new Error('Local Supabase status did not include DB_URL.');
  let dbUrlValue = dbLine.replace(/^\s*(?:export\s+)?DB_URL=/, '').trim();
  if (
    (dbUrlValue.startsWith('"') && dbUrlValue.endsWith('"')) ||
    (dbUrlValue.startsWith("'") && dbUrlValue.endsWith("'"))
  ) {
    dbUrlValue = dbUrlValue.slice(1, -1);
  }
  const ownerUrl = new URL(dbUrlValue);
  if (!['localhost', '127.0.0.1', '::1'].includes(ownerUrl.hostname)) {
    throw new Error('RLS verification can only run against local Supabase.');
  }
  ownerUrl.username = 'supabase_admin';

  runSupabase(['db', 'query', '--db-url', ownerUrl.toString(), '--file', sqlFile]);
  console.info('RLS verification passed for Applicant, HR, Evaluator, and SUPER_ADMIN roles.');
} catch (error) {
  console.error(`RLS verification failed: ${error instanceof Error ? error.message : 'Unknown error.'}`);
  process.exitCode = 1;
} finally {
  await cleanup();
}

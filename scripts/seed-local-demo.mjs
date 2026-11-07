import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const env = new Map(Object.entries(process.env));
const envText = await readFile(resolve(process.cwd(), '.env.local'), 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (!match || process.env[match[1]] !== undefined) continue;
  const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
  env.set(match[1], value);
}

const apiUrl = env.get('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = env.get('SUPABASE_SERVICE_ROLE_KEY');
const password = env.get('LOCAL_DEMO_PASSWORD');
if (!apiUrl || !serviceKey || !password) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and LOCAL_DEMO_PASSWORD in .env.local.');
}
if (password.length < 12) throw new Error('LOCAL_DEMO_PASSWORD must be at least 12 characters.');
const supabaseUrl = new URL(apiUrl);
if (!['localhost', '127.0.0.1', '::1'].includes(supabaseUrl.hostname)) {
  throw new Error('This script only creates demo accounts and data on local Supabase.');
}

const headers = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  'content-type': 'application/json',
};

async function request(url, method = 'GET', body, prefer) {
  const response = await fetch(url, {
    method,
    headers: { ...headers, ...(prefer ? { prefer } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    let code = '';
    try {
      const result = await response.clone().json();
      code = typeof result.code === 'string' ? ` (${result.code})` : '';
    } catch {}
    throw new Error(`Local Supabase request failed with HTTP ${response.status}${code}.`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function restUrl(table, query = {}) {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return url;
}

async function getRows(table, query) {
  return request(restUrl(table, query));
}

async function upsert(table, rows, conflict) {
  if (!rows.length) return;
  const url = restUrl(table, conflict ? { on_conflict: conflict } : {});
  await request(url, 'POST', rows, 'resolution=merge-duplicates,return=representation');
}

async function ensureUser(email, role) {
  const usersUrl = new URL('/auth/v1/admin/users?page=1&per_page=1000', supabaseUrl);
  const payload = await request(usersUrl);
  const users = Array.isArray(payload) ? payload : payload.users ?? [];
  let user = users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = await request(new URL('/auth/v1/admin/users', supabaseUrl), 'POST', {
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
    });
  } else if (user.app_metadata?.role !== role) {
    throw new Error(`The existing local account for ${email} does not have the expected role.`);
  }

  await request(new URL(`/auth/v1/admin/users/${user.id}`, supabaseUrl), 'PUT', {
    password,
    app_metadata: { role },
  });

  const profiles = await getRows('profiles', {
    select: 'id,role,email',
    id: `eq.${user.id}`,
  });
  if (profiles.length !== 1 || profiles[0].role !== role) {
    throw new Error(`The local ${role} profile for ${email} was not created correctly.`);
  }
  return profiles[0];
}

async function ensureApplicant(profile) {
  const applicants = await getRows('applicants', {
    select: 'id,applicant_number,profile_id',
    profile_id: `eq.${profile.id}`,
  });
  if (applicants.length !== 1) throw new Error(`The applicant record for ${profile.email} is missing.`);
  return applicants[0];
}

const questionnaireCodes = ['34A', '34B', '35A', '35B', '36', '37', '38A', '38B', '39', '40A', '40B', '40C'];

function fixturePds(person, childName) {
  const personalInfo = {
    surname: person.surname,
    first_name: person.firstName,
    middle_name: 'Demo',
    name_extension: '',
    date_of_birth: person.birthDate,
    place_of_birth: 'Sample Municipality, Southern Leyte',
    sex_at_birth: person.sex,
    civil_status: person.married ? 'MARRIED' : 'SINGLE',
    civil_status_other: '',
    height_m: 1.65,
    weight_kg: 60,
    blood_type: 'O+',
    umid_no: '',
    pagibig_no: '',
    philhealth_no: '',
    philsys_no: '',
    tin_no: '',
    agency_employee_no: '',
    citizenship: 'FILIPINO',
    dual_citizenship_by: '',
    dual_citizenship_country: '',
    telephone_no: '',
    mobile_no: '09000000000',
    email: person.email,
  };
  const address = {
    house_block_lot_no: '1',
    street: 'Demo Street',
    subdivision_village: 'Sample Village',
    barangay: 'Test Barangay',
    city_municipality: 'Demo Municipality',
    province: 'Southern Leyte',
    zip_code: '0000',
  };
  const familyBackground = {
    spouse_surname: '', spouse_first_name: '', spouse_middle_name: '',
    spouse_name_extension: '', spouse_occupation: '', spouse_employer: '',
    spouse_business_address: '', spouse_telephone_no: '',
    father_surname: 'Sample', father_first_name: 'Parent',
    father_middle_name: '', father_name_extension: '',
    mother_surname: 'Sample', mother_first_name: 'Parent', mother_middle_name: '',
  };
  const education = [
    { level: 'SECONDARY', school_name: 'Demo National High School', degree_course: '', period_from: 2005, period_to: 2009, highest_level_units_earned: '', year_graduated: 2009, honors_received: '' },
    { level: 'COLLEGE', school_name: 'Sample State College', degree_course: 'Bachelor of Education', period_from: 2009, period_to: 2013, highest_level_units_earned: '', year_graduated: 2013, honors_received: '' },
  ];
  const eligibility = [{ eligibility_name: 'Demo Professional Eligibility', rating: 85, exam_date: '2014-06-15', exam_place: 'Demo City', license_no: 'DEMO-0001', license_valid_until: null }];
  const workExperience = [{ date_from: '2015-06-01', date_to: null, position_title: 'Demo Teacher', agency_company: 'Sample Learning Center', monthly_salary: 25000, salary_grade_step: 'SG 11', appointment_status: 'Permanent', is_gov_service: false, duties_description: 'Created lesson plans and taught demonstration classes.' }];
  const learningDevelopment = [{ title: 'Demo Teaching Strategies Workshop', date_from: '2024-05-10', date_to: '2024-05-11', hours: 16, ld_type: 'Technical', conducted_by: 'Sample Training Office' }];
  const otherInfo = [{ category: 'SKILL_HOBBY', description: 'Lesson planning' }, { category: 'SKILL_HOBBY', description: 'Community tutoring' }];
  const questionnaire = questionnaireCodes.map((question_code) => ({ question_code, answer: false, details: '', country: '', date_filed: null, case_status: '', id_no: '' }));
  const references = [1, 2, 3].map((number) => ({ name: `Demo Reference ${number}`, address: 'Sample Municipality, Southern Leyte', contact: `0900000000${number}` }));
  return {
    personalInfo,
    address,
    familyBackground,
    childName,
    education,
    eligibility,
    workExperience,
    learningDevelopment,
    otherInfo,
    questionnaire,
    references,
  };
}

async function ensurePds(applicant, fixture) {
  const existing = await getRows('pds_versions', {
    select: 'id,status,version_no',
    applicant_id: `eq.${applicant.id}`,
    version_no: 'eq.1',
  });
  let version = existing[0];
  if (!version) {
    const draftData = {
      '1': { personalInfo: fixture.personalInfo, addresses: { residential: fixture.address, permanent: fixture.address, sameAsResidential: true } },
      '2': { familyBackground: fixture.familyBackground, children: [{ full_name: fixture.childName, date_of_birth: '2018-03-12' }] },
      '3': { education: fixture.education },
      '4': { eligibility: fixture.eligibility },
      '5': { workExperience: fixture.workExperience },
      '6': { voluntaryWork: [] },
      '7': { learningDevelopment: fixture.learningDevelopment },
      '8': { otherInfo: fixture.otherInfo },
      '9': { questionnaire: fixture.questionnaire },
      '10': { references: fixture.references, confirm_unrelated: true },
      '11': { confirm_information: true },
    };
    const created = await request(restUrl('pds_versions', { select: 'id,status,version_no' }), 'POST', {
      applicant_id: applicant.id,
      version_no: 1,
      status: 'DRAFT',
      current_step: 11,
      completed_steps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      draft_data: draftData,
    }, 'return=representation');
    version = created[0];
  }

  if (version.status === 'DRAFT') {
    const submitted = await request(restUrl('pds_versions', { id: `eq.${version.id}`, select: 'id,status,version_no' }), 'PATCH', {
      status: 'SUBMITTED',
      submitted_at: new Date().toISOString(),
    }, 'return=representation');
    version = submitted[0];
  }

  await request(restUrl('profiles', { id: `eq.${applicant.profile_id}` }), 'PATCH', {
    has_submitted_pds: true,
  }, 'return=minimal');

  const pdsId = version.id;
  await upsert('pds_personal_info', [{
    pds_version_id: pdsId,
    ...fixture.personalInfo,
    height_m: 1.65,
    weight_kg: 60,
    mobile_no: '09000000000',
    name_extension: null,
    civil_status_other: null,
    blood_type: 'O+',
    citizenship: 'FILIPINO',
    dual_citizenship_by: null,
    dual_citizenship_country: null,
    umid_no: null,
    pagibig_no: null,
    philhealth_no: null,
    philsys_no: null,
    tin_no: null,
    agency_employee_no: null,
    telephone_no: null,
  }], 'pds_version_id');
  await upsert('pds_addresses', [
    { pds_version_id: pdsId, type: 'RESIDENTIAL', ...fixture.address, same_as_residential: false },
    { pds_version_id: pdsId, type: 'PERMANENT', ...fixture.address, same_as_residential: true },
  ], 'pds_version_id,type');
  await upsert('pds_family_background', [{ pds_version_id: pdsId, ...fixture.familyBackground }], 'pds_version_id');
  await upsert('pds_children', [{ pds_version_id: pdsId, full_name: fixture.childName, date_of_birth: '2018-03-12', sort_order: 1 }], 'pds_version_id,sort_order');
  await upsert('pds_education', fixture.education.map((row, index) => ({ ...row, pds_version_id: pdsId, sort_order: index + 1 })), 'pds_version_id,level');
  await upsert('pds_eligibility', fixture.eligibility.map((row, index) => ({ ...row, pds_version_id: pdsId, sort_order: index + 1 })), 'pds_version_id,sort_order');
  await upsert('pds_work_experience', fixture.workExperience.map((row, index) => ({ ...row, pds_version_id: pdsId, sort_order: index + 1 })), 'pds_version_id,sort_order');
  await upsert('pds_learning_development', fixture.learningDevelopment.map((row, index) => ({ ...row, pds_version_id: pdsId, sort_order: index + 1 })), 'pds_version_id,sort_order');
  await upsert('pds_other_info', fixture.otherInfo.map((row, index) => ({ ...row, pds_version_id: pdsId, sort_order: index + 1 })), 'pds_version_id,category,sort_order');
  await upsert('pds_questionnaire', fixture.questionnaire.map((row) => ({ ...row, pds_version_id: pdsId, country: undefined, details: null, date_filed: null, case_status: null, id_no: null })), 'pds_version_id,question_code');
  await upsert('pds_references', fixture.references.map((row, index) => ({ ...row, pds_version_id: pdsId, sort_order: index + 1 })), 'pds_version_id,sort_order');
  return version;
}

async function ensureJob(hrProfile) {
  const title = 'Demo: Secondary Mathematics Teacher';
  const current = await getRows('job_postings', {
    select: 'id', hr_id: `eq.${hrProfile.id}`, title: `eq.${title}`,
  });
  if (current.length) return current[0];
  const created = await request(restUrl('job_postings', { select: 'id' }), 'POST', {
    hr_id: hrProfile.id,
    title,
    description: 'A fake local demonstration posting for a secondary mathematics teacher.',
    requirements: 'Teaching degree, classroom experience, and a current professional eligibility certificate.',
    slots: 2,
    status: 'OPEN',
    deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
  }, 'return=representation');
  return created[0];
}

async function ensureApplication(job, applicant, pds) {
  const existing = await getRows('applications', {
    select: 'id,status', job_id: `eq.${job.id}`, applicant_id: `eq.${applicant.id}`,
  });
  if (existing.length) return existing[0];
  const created = await request(restUrl('applications', { select: 'id,status' }), 'POST', {
    job_id: job.id,
    applicant_id: applicant.id,
    pds_version_id: pds.id,
    status: 'SUBMITTED',
  }, 'return=representation');
  return created[0];
}

const hrProfile = await ensureUser('demo.hr@local.test', 'HR');
const evaluatorProfile = await ensureUser('demo.evaluator@local.test', 'EVALUATOR');
const applicantProfiles = await Promise.all([
  ensureUser('demo.applicant.one@local.test', 'APPLICANT'),
  ensureUser('demo.applicant.two@local.test', 'APPLICANT'),
]);
const applicants = await Promise.all(applicantProfiles.map(ensureApplicant));
const demoPeople = [
  { email: applicantProfiles[0].email, firstName: 'Alex', surname: 'Sample', birthDate: '1990-04-12', sex: 'FEMALE', married: false, childName: 'Taylor Sample' },
  { email: applicantProfiles[1].email, firstName: 'Jordan', surname: 'Demo', birthDate: '1992-09-23', sex: 'MALE', married: false, childName: 'Casey Demo' },
];
const pdsVersions = await Promise.all(applicants.map((applicant, index) =>
  ensurePds(applicant, fixturePds(demoPeople[index], demoPeople[index].childName)),
));
const job = await ensureJob(hrProfile);
const applications = await Promise.all(applicants.map((applicant, index) =>
  ensureApplication(job, applicant, pdsVersions[index]),
));

const firstEvaluations = await getRows('application_evaluations', {
  select: 'id', application_id: `eq.${applications[0].id}`,
  evaluator_id: `eq.${evaluatorProfile.id}`,
});
if (!firstEvaluations.length) {
  await request(restUrl('application_evaluations'), 'POST', {
    application_id: applications[0].id,
    evaluator_id: evaluatorProfile.id,
    result: 'QUALIFIED',
    remarks: 'Demo fixture evaluation only.',
  }, 'return=minimal');
}

console.info('Seeded local demo data using synthetic people only.');
console.info('HR: demo.hr@local.test');
console.info('Evaluator: demo.evaluator@local.test');
console.info('Applicants: demo.applicant.one@local.test, demo.applicant.two@local.test');
console.info('All demo accounts use LOCAL_DEMO_PASSWORD from .env.local.');

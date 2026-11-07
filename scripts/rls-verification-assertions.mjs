function quoteSql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function checkCount(tableSql, expected, label, whereSql = '') {
  return `
    select count(*) into row_count from ${tableSql} ${whereSql};
    if row_count <> ${expected} then
      raise exception '${label}: expected ${expected}, got %', row_count;
    end if;`;
}

function roleBlock(profileId, label, body) {
  const idLiteral = quoteSql(profileId);
  const claims = JSON.stringify({ sub: profileId, role: 'authenticated' });
  return `
<<${label}>>
declare
  row_count bigint;
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ${idLiteral}, true);
  perform set_config('request.jwt.claims', ${quoteSql(claims)}, true);
${body}
  perform set_config('role', 'supabase_admin', true);
end ${label};
`;
}

export function buildRlsAssertions({
  applicantA,
  applicantB,
  hrA,
  hrB,
  evaluator,
  admin,
  applicantAId,
  applicantBId,
  storageKey,
  invitationEmail,
  invitationTokenHash,
}) {
  const applicantChecks = [
    roleBlock(applicantA.profileId, 'applicant_a_checks', [
      checkCount('public.profiles', 1, 'applicant A own profile'),
      checkCount('public.applicants', 1, 'applicant A own applicant row'),
      checkCount('public.applicants', 0, 'applicant A cannot see applicant B', `where id = ${quoteSql(applicantBId)}::uuid`),
      checkCount('public.pds_personal_info', 1, 'applicant A own PDS identity'),
      checkCount('public.applications', 1, 'applicant A own application'),
      checkCount('public.documents', 1, 'applicant A own document metadata'),
      checkCount('storage.objects', 1, 'applicant A own private storage object', `where bucket_id = 'applicant-documents' and name = ${quoteSql(storageKey)}`),
      checkCount('public.v_anonymized_applicants', 0, 'applicant A cannot query reviewer view'),
      checkCount('public.v_anonymized_credibility', 0, 'applicant A cannot query credibility view'),
    ].join('\n')),
    roleBlock(applicantB.profileId, 'applicant_b_checks', [
      checkCount('public.profiles', 1, 'applicant B own profile'),
      checkCount('public.applicants', 1, 'applicant B own applicant row'),
      checkCount('public.pds_personal_info', 1, 'applicant B own PDS identity'),
      checkCount('public.applications', 1, 'applicant B own application'),
      checkCount('storage.objects', 0, 'applicant B cannot access applicant A storage', `where bucket_id = 'applicant-documents' and name = ${quoteSql(storageKey)}`),
    ].join('\n')),
  ];

  const reviewerChecks = (expectedApplications, expectedDocs, label) => [
    checkCount('public.profiles', 0, `${label} cannot read profiles`),
    checkCount('public.applicants', 0, `${label} cannot read identity map`),
    checkCount('public.pds_versions', 0, `${label} cannot read PDS versions directly`),
    checkCount('public.pds_personal_info', 0, `${label} cannot read personal information`),
    checkCount('public.pds_addresses', 0, `${label} cannot read addresses`),
    checkCount('public.pds_family_background', 0, `${label} cannot read family background`),
    checkCount('public.pds_children', 0, `${label} cannot read children`),
    checkCount('public.pds_education', 0, `${label} cannot read education details`),
    checkCount('public.pds_eligibility', 0, `${label} cannot read eligibility details`),
    checkCount('public.pds_work_experience', 0, `${label} cannot read work history`),
    checkCount('public.pds_voluntary_work', 0, `${label} cannot read voluntary work`),
    checkCount('public.pds_learning_development', 0, `${label} cannot read training details`),
    checkCount('public.pds_other_info', 0, `${label} cannot read other PDS details`),
    checkCount('public.pds_questionnaire', 0, `${label} cannot read questionnaire details`),
    checkCount('public.pds_references', 0, `${label} cannot read references`),
    checkCount('public.documents', 0, `${label} cannot read document paths directly`),
    checkCount('public.applications', expectedApplications, `${label} application scope`),
    checkCount('public.v_anonymized_applicants', expectedApplications, `${label} anonymized applicant scope`),
    checkCount('public.v_anonymized_credibility', expectedApplications, `${label} credibility scope`),
    checkCount('public.v_anonymized_questionnaire', expectedApplications, `${label} questionnaire scope`),
    checkCount('public.v_anonymized_documents', expectedDocs, `${label} anonymized document scope`),
    checkCount('storage.objects', expectedDocs, `${label} signed-URL storage scope`, `where bucket_id = 'applicant-documents' and name = ${quoteSql(storageKey)}`),
  ].join('\n');

  const piiFields = `
    if exists (
      select 1 from public.v_anonymized_applicants as view_row
      where to_jsonb(view_row) ?| array['applicant_id', 'profile_id', 'pds_version_id', 'first_name', 'surname', 'email']::text[]
    ) then
      raise exception 'Anonymized applicant view exposes an identity field.';
    end if;
    if exists (
      select 1 from public.v_anonymized_credibility as view_row
      where to_jsonb(view_row) ?| array['applicant_id', 'profile_id', 'pds_version_id', 'first_name', 'surname', 'email']::text[]
    ) then
      raise exception 'Anonymized credibility view exposes an identity field.';
    end if;
    if exists (
      select 1 from public.v_anonymized_questionnaire as view_row
      where to_jsonb(view_row) ?| array['details', 'date_filed', 'case_status', 'id_no']::text[]
    ) then
      raise exception 'Anonymized questionnaire view exposes sensitive details.';
    end if;
    if exists (
      select 1 from public.v_anonymized_documents as view_row
      where to_jsonb(view_row) ?| array['applicant_id', 'profile_id', 'file_path', 'original_file_name']::text[]
         or view_row.storage_key !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    ) then
      raise exception 'Anonymized documents view exposes a human-readable storage path.';
    end if;`;

  const reviewerRoleChecks = [
    roleBlock(hrA.profileId, 'hr_a_checks', `${reviewerChecks(1, 1, 'HR A')}${piiFields}`),
    roleBlock(hrB.profileId, 'hr_b_checks', reviewerChecks(1, 0, 'HR B')),
    roleBlock(evaluator.profileId, 'evaluator_checks', `${reviewerChecks(2, 1, 'Evaluator')}${piiFields}`),
  ];

  const invitationChecks = [
    roleBlock(admin.profileId, 'admin_checks', `
      ${checkCount('public.profiles', 1, 'Admin own profile')}
      insert into public.invitations (email, role, token_hash, invited_by, expires_at)
      values (
        ${quoteSql(invitationEmail)},
        'HR',
        ${quoteSql(invitationTokenHash)},
        (select auth.uid()),
        now() + interval '1 day'
      );
      ${checkCount('public.invitations', 1, 'Admin can manage invitations', `where token_hash = ${quoteSql(invitationTokenHash)}`)}
      delete from public.invitations where token_hash = ${quoteSql(invitationTokenHash)};
    `),
    roleBlock(hrA.profileId, 'hr_invitation_denied', checkCount('public.invitations', 0, 'HR cannot read invitations')),
    roleBlock(evaluator.profileId, 'evaluator_invitation_denied', checkCount('public.invitations', 0, 'Evaluator cannot read invitations')),
  ];

  return [...applicantChecks, ...reviewerRoleChecks, ...invitationChecks].join('\n');
}

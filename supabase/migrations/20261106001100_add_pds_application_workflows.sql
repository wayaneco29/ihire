create function public.create_initial_pds_draft()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_applicant_id uuid;
  draft_id uuid;
begin
  if not (select private.is_role('APPLICANT'::public.user_role)) then
    raise exception 'Only applicants can create a PDS draft.' using errcode = '42501';
  end if;

  select applicant.id
  into target_applicant_id
  from public.applicants as applicant
  where applicant.profile_id = (select auth.uid())
  for update;

  if target_applicant_id is null then
    raise exception 'Applicant profile was not found.' using errcode = 'P0002';
  end if;

  select pds.id
  into draft_id
  from public.pds_versions as pds
  where pds.applicant_id = target_applicant_id
    and pds.status = 'DRAFT'
  for update;

  if draft_id is not null then
    return draft_id;
  end if;

  if exists (
    select 1
    from public.pds_versions as pds
    where pds.applicant_id = target_applicant_id
      and pds.status = 'SUBMITTED'
  ) then
    raise exception 'A submitted PDS exists; clone it to make an update.' using errcode = 'P0001';
  end if;

  insert into public.pds_versions (applicant_id, version_no, status)
  values (target_applicant_id, 1, 'DRAFT')
  returning id into draft_id;

  return draft_id;
end;
$$;

create function public.complete_pds_step(p_pds_version_id uuid, p_step_number smallint)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_pds public.pds_versions%rowtype;
  row_count integer;
  next_step smallint;
begin
  if not (select private.is_role('APPLICANT'::public.user_role)) then
    raise exception 'Only applicants can complete PDS steps.' using errcode = '42501';
  end if;

  if p_step_number not between 1 and 11 then
    raise exception 'PDS step must be between 1 and 11.' using errcode = '22023';
  end if;

  select pds.*
  into target_pds
  from public.pds_versions as pds
  join public.applicants as applicant on applicant.id = pds.applicant_id
  where pds.id = p_pds_version_id
    and pds.status = 'DRAFT'
    and applicant.profile_id = (select auth.uid())
  for update of pds;

  if target_pds.id is null then
    raise exception 'The draft PDS was not found.' using errcode = 'P0002';
  end if;

  if p_step_number = any(target_pds.completed_steps) then
    return target_pds.current_step;
  end if;

  if p_step_number <> target_pds.current_step then
    raise exception 'Complete PDS steps in order.' using errcode = 'P0001';
  end if;

  if p_step_number = 1 then
    if not exists (
      select 1 from public.pds_personal_info where pds_version_id = target_pds.id
    ) then
      raise exception 'Personal information is required.' using errcode = 'P0001';
    end if;
    select count(*) into row_count
    from public.pds_addresses
    where pds_version_id = target_pds.id;
    if row_count <> 2 then
      raise exception 'Residential and permanent addresses are required.' using errcode = 'P0001';
    end if;
  elsif p_step_number = 2 then
    if not exists (
      select 1 from public.pds_family_background where pds_version_id = target_pds.id
    ) then
      raise exception 'Family background is required.' using errcode = 'P0001';
    end if;
  elsif p_step_number = 3 then
    if not exists (
      select 1 from public.pds_education where pds_version_id = target_pds.id
    ) then
      raise exception 'At least one education row is required.' using errcode = 'P0001';
    end if;
  elsif p_step_number = 9 then
    select count(*) into row_count
    from public.pds_questionnaire
    where pds_version_id = target_pds.id;
    if row_count <> 12 then
      raise exception 'Answer all 12 questionnaire items.' using errcode = 'P0001';
    end if;
  elsif p_step_number = 10 then
    select count(*) into row_count
    from public.pds_references
    where pds_version_id = target_pds.id;
    if row_count <> 3 then
      raise exception 'Exactly three references are required.' using errcode = 'P0001';
    end if;
  elsif p_step_number = 11 then
    if not (target_pds.completed_steps @> array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]::smallint[]) then
      raise exception 'Complete PDS steps 1 through 10 first.' using errcode = 'P0001';
    end if;
  end if;

  update public.pds_versions
  set completed_steps = array_append(completed_steps, p_step_number),
      current_step = least(p_step_number + 1, 11),
      updated_at = now()
  where id = target_pds.id
  returning current_step into next_step;

  return next_step;
end;
$$;

create function public.set_pds_current_step(p_pds_version_id uuid, p_step_number smallint)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_pds public.pds_versions%rowtype;
begin
  if not (select private.is_role('APPLICANT'::public.user_role)) then
    raise exception 'Only applicants can navigate PDS steps.' using errcode = '42501';
  end if;

  select pds.*
  into target_pds
  from public.pds_versions as pds
  join public.applicants as applicant on applicant.id = pds.applicant_id
  where pds.id = p_pds_version_id
    and pds.status = 'DRAFT'
    and applicant.profile_id = (select auth.uid())
  for update of pds;

  if target_pds.id is null then
    raise exception 'The draft PDS was not found.' using errcode = 'P0002';
  end if;

  if p_step_number not between 1 and target_pds.current_step
    or (
      p_step_number <> target_pds.current_step
      and not (p_step_number = any(target_pds.completed_steps))
    )
  then
    raise exception 'PDS steps can only be opened after completion.' using errcode = 'P0001';
  end if;

  update public.pds_versions
  set current_step = p_step_number,
      updated_at = now()
  where id = target_pds.id;

  return p_step_number;
end;
$$;

create function public.clone_pds_version()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_applicant_id uuid;
  source_pds_id uuid;
  source_version_no integer;
  draft_id uuid;
begin
  if not (select private.is_role('APPLICANT'::public.user_role)) then
    raise exception 'Only applicants can clone a PDS.' using errcode = '42501';
  end if;

  select applicant.id
  into target_applicant_id
  from public.applicants as applicant
  where applicant.profile_id = (select auth.uid())
  for update;

  if target_applicant_id is null then
    raise exception 'Applicant profile was not found.' using errcode = 'P0002';
  end if;

  select pds.id
  into draft_id
  from public.pds_versions as pds
  where pds.applicant_id = target_applicant_id
    and pds.status = 'DRAFT'
  for update;

  if draft_id is not null then
    return draft_id;
  end if;

  select pds.id, pds.version_no
  into source_pds_id, source_version_no
  from public.pds_versions as pds
  where pds.applicant_id = target_applicant_id
    and pds.status = 'SUBMITTED'
  order by pds.version_no desc
  limit 1
  for update;

  if source_pds_id is null then
    raise exception 'There is no submitted PDS to clone.' using errcode = 'P0002';
  end if;

  insert into public.pds_versions (
    applicant_id,
    version_no,
    status,
    current_step,
    completed_steps
  )
  values (
    target_applicant_id,
    source_version_no + 1,
    'DRAFT',
    1,
    array[]::smallint[]
  )
  returning id into draft_id;

  insert into public.pds_personal_info (
    pds_version_id, surname, first_name, middle_name, name_extension,
    date_of_birth, place_of_birth, sex_at_birth, civil_status, civil_status_other,
    height_m, weight_kg, blood_type, umid_no, pagibig_no, philhealth_no,
    philsys_no, tin_no, agency_employee_no, citizenship, dual_citizenship_by,
    dual_citizenship_country, telephone_no, mobile_no, email
  )
  select
    draft_id, surname, first_name, middle_name, name_extension,
    date_of_birth, place_of_birth, sex_at_birth, civil_status, civil_status_other,
    height_m, weight_kg, blood_type, umid_no, pagibig_no, philhealth_no,
    philsys_no, tin_no, agency_employee_no, citizenship, dual_citizenship_by,
    dual_citizenship_country, telephone_no, mobile_no, email
  from public.pds_personal_info
  where pds_version_id = source_pds_id;

  insert into public.pds_addresses (
    pds_version_id, type, house_block_lot_no, street, subdivision_village,
    barangay, city_municipality, province, zip_code, same_as_residential
  )
  select
    draft_id, type, house_block_lot_no, street, subdivision_village,
    barangay, city_municipality, province, zip_code, same_as_residential
  from public.pds_addresses
  where pds_version_id = source_pds_id;

  insert into public.pds_family_background (
    pds_version_id, spouse_surname, spouse_first_name, spouse_middle_name,
    spouse_name_extension, spouse_occupation, spouse_employer, spouse_business_address,
    spouse_telephone_no, father_surname, father_first_name, father_middle_name,
    father_name_extension, mother_surname, mother_first_name, mother_middle_name
  )
  select
    draft_id, spouse_surname, spouse_first_name, spouse_middle_name,
    spouse_name_extension, spouse_occupation, spouse_employer, spouse_business_address,
    spouse_telephone_no, father_surname, father_first_name, father_middle_name,
    father_name_extension, mother_surname, mother_first_name, mother_middle_name
  from public.pds_family_background
  where pds_version_id = source_pds_id;

  insert into public.pds_children (pds_version_id, full_name, date_of_birth, sort_order)
  select draft_id, full_name, date_of_birth, sort_order
  from public.pds_children
  where pds_version_id = source_pds_id;

  insert into public.pds_education (
    pds_version_id, level, school_name, degree_course, period_from, period_to,
    highest_level_units_earned, year_graduated, honors_received, sort_order
  )
  select
    draft_id, level, school_name, degree_course, period_from, period_to,
    highest_level_units_earned, year_graduated, honors_received, sort_order
  from public.pds_education
  where pds_version_id = source_pds_id;

  insert into public.pds_eligibility (
    pds_version_id, eligibility_name, rating, exam_date, exam_place,
    license_no, license_valid_until, sort_order
  )
  select
    draft_id, eligibility_name, rating, exam_date, exam_place,
    license_no, license_valid_until, sort_order
  from public.pds_eligibility
  where pds_version_id = source_pds_id;

  insert into public.pds_work_experience (
    pds_version_id, date_from, date_to, position_title, agency_company,
    monthly_salary, salary_grade_step, appointment_status, is_gov_service,
    duties_description, sort_order
  )
  select
    draft_id, date_from, date_to, position_title, agency_company,
    monthly_salary, salary_grade_step, appointment_status, is_gov_service,
    duties_description, sort_order
  from public.pds_work_experience
  where pds_version_id = source_pds_id;

  insert into public.pds_voluntary_work (
    pds_version_id, organization_name_address, date_from, date_to,
    hours, position_nature, sort_order
  )
  select
    draft_id, organization_name_address, date_from, date_to,
    hours, position_nature, sort_order
  from public.pds_voluntary_work
  where pds_version_id = source_pds_id;

  insert into public.pds_learning_development (
    pds_version_id, title, date_from, date_to, hours, ld_type, conducted_by, sort_order
  )
  select draft_id, title, date_from, date_to, hours, ld_type, conducted_by, sort_order
  from public.pds_learning_development
  where pds_version_id = source_pds_id;

  insert into public.pds_other_info (pds_version_id, category, description, sort_order)
  select draft_id, category, description, sort_order
  from public.pds_other_info
  where pds_version_id = source_pds_id;

  insert into public.pds_questionnaire (
    pds_version_id, question_code, answer, details, date_filed, case_status, id_no
  )
  select draft_id, question_code, answer, details, date_filed, case_status, id_no
  from public.pds_questionnaire
  where pds_version_id = source_pds_id;

  insert into public.pds_references (pds_version_id, name, address, contact, sort_order)
  select draft_id, name, address, contact, sort_order
  from public.pds_references
  where pds_version_id = source_pds_id;

  return draft_id;
end;
$$;

create function public.submit_pds_version(p_pds_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_pds public.pds_versions%rowtype;
  target_applicant_id uuid;
  row_count integer;
begin
  if not (select private.is_role('APPLICANT'::public.user_role)) then
    raise exception 'Only applicants can submit a PDS.' using errcode = '42501';
  end if;

  select pds.*
  into target_pds
  from public.pds_versions as pds
  join public.applicants as applicant on applicant.id = pds.applicant_id
  where pds.id = p_pds_version_id
    and pds.status = 'DRAFT'
    and applicant.profile_id = (select auth.uid())
  for update of pds;

  if target_pds.id is null then
    raise exception 'The draft PDS was not found.' using errcode = 'P0002';
  end if;

  if target_pds.current_step <> 11
    or not (target_pds.completed_steps @> array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]::smallint[])
  then
    raise exception 'Complete all 11 PDS steps before submitting.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.pds_personal_info where pds_version_id = target_pds.id
  ) then
    raise exception 'Personal information is required before submission.' using errcode = 'P0001';
  end if;

  select count(*) into row_count
  from public.pds_addresses
  where pds_version_id = target_pds.id;
  if row_count <> 2 then
    raise exception 'Residential and permanent addresses are required.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.pds_family_background where pds_version_id = target_pds.id
  ) then
    raise exception 'Family background is required before submission.' using errcode = 'P0001';
  end if;

  select count(*) into row_count
  from public.pds_education
  where pds_version_id = target_pds.id;
  if row_count = 0 then
    raise exception 'At least one education row is required.' using errcode = 'P0001';
  end if;

  select count(*) into row_count
  from public.pds_questionnaire
  where pds_version_id = target_pds.id;
  if row_count <> 12 then
    raise exception 'Answer all 12 questionnaire items before submitting.' using errcode = 'P0001';
  end if;

  select count(*) into row_count
  from public.pds_references
  where pds_version_id = target_pds.id;
  if row_count <> 3 then
    raise exception 'Exactly three references are required.' using errcode = 'P0001';
  end if;

  target_applicant_id := target_pds.applicant_id;

  update public.pds_versions
  set status = 'SUBMITTED',
      submitted_at = now(),
      current_step = 11,
      updated_at = now()
  where id = target_pds.id;

  update public.profiles
  set has_submitted_pds = true
  where id = (select auth.uid());

  return target_pds.id;
end;
$$;

create function public.apply_to_job(p_job_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_applicant_id uuid;
  target_pds_id uuid;
  target_hr_id uuid;
  target_job_title text;
  existing_application_id uuid;
  new_application_id uuid;
  target_applicant_number text;
begin
  if not (select private.is_role('APPLICANT'::public.user_role)) then
    raise exception 'Only applicants can apply to a job.' using errcode = '42501';
  end if;

  select applicant.id, applicant.applicant_number
  into target_applicant_id, target_applicant_number
  from public.applicants as applicant
  where applicant.profile_id = (select auth.uid())
  for update;

  if target_applicant_id is null then
    raise exception 'Applicant profile was not found.' using errcode = 'P0002';
  end if;

  select job.hr_id, job.title
  into target_hr_id, target_job_title
  from public.job_postings as job
  where job.id = p_job_id
    and job.status = 'OPEN'
    and (job.deadline is null or job.deadline > now())
  for share;

  if target_hr_id is null then
    raise exception 'The job is not open for applications.' using errcode = 'P0002';
  end if;

  select pds.id
  into target_pds_id
  from public.pds_versions as pds
  where pds.applicant_id = target_applicant_id
    and pds.status = 'SUBMITTED'
  order by pds.version_no desc
  limit 1;

  if target_pds_id is null then
    raise exception 'Submit a PDS before applying.' using errcode = 'P0001';
  end if;

  select application.id
  into existing_application_id
  from public.applications as application
  where application.job_id = p_job_id
    and application.applicant_id = target_applicant_id;

  if existing_application_id is not null then
    return existing_application_id;
  end if;

  insert into public.applications (job_id, applicant_id, pds_version_id, status)
  values (p_job_id, target_applicant_id, target_pds_id, 'SUBMITTED')
  returning id into new_application_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    target_hr_id,
    'APPLICATION_SUBMITTED',
    'New application received',
    'Applicant ' || target_applicant_number || ' applied for ' || target_job_title || '.',
    '/hr/applications/' || new_application_id::text
  );

  insert into public.notifications (user_id, type, title, body, link)
  select
    profile.id,
    'APPLICATION_FOR_EVALUATION',
    'Application ready for evaluation',
    'Applicant ' || target_applicant_number || ' applied for ' || target_job_title || '.',
    '/evaluator/applications/' || new_application_id::text
  from public.profiles as profile
  where profile.role = 'EVALUATOR';

  return new_application_id;
end;
$$;


revoke all on function public.create_initial_pds_draft() from public, anon;
revoke all on function public.clone_pds_version() from public, anon;
revoke all on function public.complete_pds_step(uuid, smallint) from public, anon;
revoke all on function public.set_pds_current_step(uuid, smallint) from public, anon;
revoke all on function public.submit_pds_version(uuid) from public, anon;
revoke all on function public.apply_to_job(uuid) from public, anon;

revoke insert on public.pds_versions from authenticated;
revoke update (current_step, completed_steps) on public.pds_versions from authenticated;

grant execute on function public.create_initial_pds_draft() to authenticated;
grant execute on function public.clone_pds_version() to authenticated;
grant execute on function public.complete_pds_step(uuid, smallint) to authenticated;
grant execute on function public.set_pds_current_step(uuid, smallint) to authenticated;
grant execute on function public.submit_pds_version(uuid) to authenticated;
grant execute on function public.apply_to_job(uuid) to authenticated;

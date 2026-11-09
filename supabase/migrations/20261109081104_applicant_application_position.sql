alter table public.applications
  add column position_id uuid,
  add constraint applications_job_position_fkey
    foreign key (job_id, position_id)
    references public.job_posting_positions (job_id, position_id)
    on delete restrict;

create index applications_job_position_idx
  on public.applications (job_id, position_id)
  where position_id is not null;

drop function public.apply_to_job(uuid);

create function public.apply_to_job(
  p_job_id uuid,
  p_position_id uuid
)
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
  target_position_title text;
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

  select position.title
  into target_position_title
  from public.job_posting_positions as job_position
  join public.positions as position
    on position.id = job_position.position_id
  where job_position.job_id = p_job_id
    and job_position.position_id = p_position_id
    and position.is_active;

  if target_position_title is null then
    raise exception 'Choose a position included in this job posting.'
      using errcode = '22023';
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

  insert into public.applications (
    job_id,
    applicant_id,
    position_id,
    pds_version_id,
    status
  )
  values (
    p_job_id,
    target_applicant_id,
    p_position_id,
    target_pds_id,
    'SUBMITTED'
  )
  returning id into new_application_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    target_hr_id,
    'APPLICATION_SUBMITTED',
    'New application received',
    'Applicant ' || target_applicant_number || ' applied for '
      || target_position_title || ' in ' || target_job_title || '.',
    '/hr/applications/' || new_application_id::text
  );

  insert into public.notifications (user_id, type, title, body, link)
  select
    profile.id,
    'APPLICATION_FOR_EVALUATION',
    'Application ready for evaluation',
    'Applicant ' || target_applicant_number || ' applied for '
      || target_position_title || ' in ' || target_job_title || '.',
    '/evaluator/applications/' || new_application_id::text
  from public.profiles as profile
  where profile.role = 'EVALUATOR';

  return new_application_id;
end;
$$;

revoke all on function public.apply_to_job(uuid, uuid) from public, anon;
grant execute on function public.apply_to_job(uuid, uuid) to authenticated;

create or replace view public.v_anonymized_applicants
with (security_barrier = true)
as
select
  authorized.application_id,
  authorized.job_id,
  authorized.application_status,
  authorized.applied_at,
  authorized.applicant_number,
  coalesce(
    (
      select array_agg(distinct education.level::text order by education.level::text)
      from public.pds_education as education
      where education.pds_version_id = authorized.pds_version_id
    ),
    array[]::text[]
  ) as education_levels,
  coalesce(
    (
      select round(
        sum((coalesce(work.date_to, current_date) - work.date_from)::numeric / 365.25),
        2
      )
      from public.pds_work_experience as work
      where work.pds_version_id = authorized.pds_version_id
    ),
    0
  ) as experience_years,
  coalesce(
    (
      select sum(learning.hours)
      from public.pds_learning_development as learning
      where learning.pds_version_id = authorized.pds_version_id
        and not exists (
          select 1
          from public.documents as certificate
          join public.document_types as document_type
            on document_type.id = certificate.document_type_id
          where certificate.applicant_id = authorized.applicant_id
            and certificate.pds_learning_development_id = learning.id
            and document_type.name = 'Training and Seminar Certificates'
        )
    ),
    0
  ) + coalesce(
    (
      select sum(certificate.training_hours)
      from public.documents as certificate
      join public.document_types as document_type
        on document_type.id = certificate.document_type_id
      where certificate.applicant_id = authorized.applicant_id
        and document_type.name = 'Training and Seminar Certificates'
        and certificate.training_hours is not null
    ),
    0
  ) as training_hours,
  coalesce(
    (
      select array_agg(distinct other_info.description order by other_info.description)
      from public.pds_other_info as other_info
      where other_info.pds_version_id = authorized.pds_version_id
        and other_info.category = 'SKILL_HOBBY'
    ),
    array[]::text[]
  ) as skills,
  position.title as position_title,
  position.track as position_track
from private.authorized_anonymized_applications as authorized
left join public.applications as application
  on application.id = authorized.application_id
left join public.positions as position
  on position.id = application.position_id;
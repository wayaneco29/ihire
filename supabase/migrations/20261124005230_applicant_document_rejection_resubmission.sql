-- Allow applicants to reuse an application rejected for missed document corrections
-- while its posting is still open. Other rejected applications remain final.
create or replace function public.apply_to_job_with_review_status(
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
  target_evaluator_id uuid;
  existing_application_id uuid;
  existing_position_id uuid;
  existing_application_status text;
  existing_status_reason text;
  new_application_id uuid;
  target_applicant_number text;
  is_resubmission boolean := false;
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
  join public.positions as position on position.id = job_position.position_id
  where job_position.job_id = p_job_id
    and job_position.position_id = p_position_id;

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

  select
    application.id,
    application.position_id,
    application.status::text,
    application.status_reason,
    application.assigned_evaluator_id
  into
    existing_application_id,
    existing_position_id,
    existing_application_status,
    existing_status_reason,
    target_evaluator_id
  from public.applications as application
  where application.job_id = p_job_id
    and application.applicant_id = target_applicant_id
  for update;

  if existing_application_id is not null then
    if existing_application_status <> 'REJECTED'
      or left(
        coalesce(existing_status_reason, ''),
        char_length('Required document "')
      ) <> 'Required document "' then
      return existing_application_id;
    end if;

    is_resubmission := true;
    if existing_position_id is distinct from p_position_id then
      raise exception 'You must resubmit for the originally selected position.'
        using errcode = '22023';
    end if;
  end if;

  if not exists (
    select 1 from public.document_types as required_type
    where required_type.is_required
  ) or exists (
    select 1
    from public.document_types as required_type
    left join lateral (
      select document.status
      from public.documents as document
      where document.applicant_id = target_applicant_id
        and document.document_type_id = required_type.id
      order by document.version desc
      limit 1
    ) as latest_document on true
    where required_type.is_required
      and latest_document.status is distinct from 'FOR_REVIEW'::public.document_status
      and latest_document.status is distinct from 'VERIFIED'::public.document_status
  ) then
    raise exception 'All required documents must be submitted for review before applying.'
      using errcode = 'P0001';
  end if;

  if is_resubmission then
    update public.document_reviews as request
    set resubmission_submitted_at = now(),
        resubmission_submitted_document_id = latest_document.id
    from public.documents as original
    join public.document_types as required_type
      on required_type.id = original.document_type_id
    join lateral (
      select replacement.id, replacement.uploaded_at, replacement.status
      from public.documents as replacement
      where replacement.applicant_id = target_applicant_id
        and replacement.document_type_id = required_type.id
      order by replacement.version desc
      limit 1
    ) as latest_document on true
    where request.document_id = original.id
      and original.applicant_id = target_applicant_id
      and required_type.is_required
      and request.status = 'FOR_RESUBMISSION'
      and request.resubmission_submitted_at is null
      and latest_document.uploaded_at >= request.reviewed_at
      and latest_document.status in (
        'FOR_REVIEW'::public.document_status,
        'VERIFIED'::public.document_status
      );

    update public.applications as application
    set position_id = p_position_id,
        pds_version_id = target_pds_id,
        status = 'SUBMITTED'::public.application_status,
        status_reason = null,
        applied_at = now(),
        scheduled_assessment_at = null
    where application.id = existing_application_id;

    new_application_id := existing_application_id;
  else
    insert into public.applications (
      job_id, applicant_id, position_id, pds_version_id, status
    )
    values (
      p_job_id, target_applicant_id, p_position_id, target_pds_id, 'SUBMITTED'
    )
    returning id, assigned_evaluator_id
    into new_application_id, target_evaluator_id;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    target_hr_id,
    'APPLICATION_SUBMITTED',
    case when is_resubmission then 'Application resubmitted' else 'New application received' end,
    'Applicant ' || target_applicant_number
      || case when is_resubmission then ' resubmitted for ' else ' applied for ' end
      || target_position_title || ' in ' || target_job_title || '.',
    '/hr/applications/' || new_application_id::text
  );

  if target_evaluator_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      target_evaluator_id,
      'APPLICATION_FOR_EVALUATION',
      case when is_resubmission then 'Application resubmitted for evaluation' else 'Application assigned for evaluation' end,
      'Applicant ' || target_applicant_number
        || case when is_resubmission then ' resubmitted for ' else ' applied for ' end
        || target_position_title || ' in ' || target_job_title || '.',
      '/evaluator/applications/' || new_application_id::text
    );
  else
    insert into public.notifications (user_id, type, title, body, link)
    select
      profile.id,
      'APPLICATION_UNASSIGNED',
      'Application needs evaluator assignment',
      'Applicant ' || target_applicant_number
        || case when is_resubmission then ' resubmitted for ' else ' applied for ' end
        || target_position_title || ' in ' || target_job_title
        || ', but no evaluator is currently available.',
      '/admin/assignments'
    from public.profiles as profile
    where profile.role = 'ADMIN';
  end if;

  return new_application_id;
end;
$$;

revoke all on function public.apply_to_job_with_review_status(uuid, uuid)
  from public, anon;
grant execute on function public.apply_to_job_with_review_status(uuid, uuid)
  to authenticated;

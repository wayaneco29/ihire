-- Applicant document correction windows and safe hiring readiness.

alter table public.applications
  add column status_reason text;

alter table public.document_reviews
  add column resubmission_due_at timestamptz,
  add column resubmission_submitted_at timestamptz,
  add column resubmission_submitted_document_id uuid
    references public.documents (id) on delete set null;

create index document_reviews_resubmission_due_idx
  on public.document_reviews (resubmission_due_at)
  where status = 'FOR_RESUBMISSION'
    and resubmission_submitted_at is null;

-- Give existing correction requests a fresh response window during rollout.
update public.document_reviews as request
set resubmission_due_at = case
      when exists (
        select 1
        from public.applications as application
        where application.applicant_id = original.applicant_id
          and application.status::text not in (
            'HIRED', 'NOT_SELECTED', 'NOT_QUALIFIED', 'REJECTED'
          )
      ) then greatest(
        request.reviewed_at + interval '5 days',
        now() + interval '5 days'
      )
      else null
    end,
    resubmission_submitted_at = case
      when replacement.uploaded_at >= request.reviewed_at
        and replacement.status in ('FOR_REVIEW', 'VERIFIED') then replacement.uploaded_at
      else null
    end,
    resubmission_submitted_document_id = case
      when replacement.uploaded_at >= request.reviewed_at
        and replacement.status in ('FOR_REVIEW', 'VERIFIED') then replacement.id
      else null
    end
from public.documents as original
join public.document_types as document_type
  on document_type.id = original.document_type_id
left join public.documents as replacement
  on replacement.replaces_document_id = original.id
where request.document_id = original.id
  and request.status = 'FOR_RESUBMISSION'
  and document_type.is_required;

create function private.prepare_document_resubmission_window()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'FOR_RESUBMISSION' then
    new.reviewed_at := coalesce(new.reviewed_at, now());
    new.resubmission_due_at := case when exists (
      select 1
      from public.documents as document
      join public.document_types as document_type
        on document_type.id = document.document_type_id
      join public.applications as application
        on application.applicant_id = document.applicant_id
      where document.id = new.document_id
        and document_type.is_required
        and application.status::text not in (
          'HIRED', 'NOT_SELECTED', 'NOT_QUALIFIED', 'REJECTED'
        )
    ) then now() + interval '5 days' else null end;
    new.resubmission_submitted_at := null;
    new.resubmission_submitted_document_id := null;
  else
    new.resubmission_due_at := null;
    new.resubmission_submitted_at := null;
    new.resubmission_submitted_document_id := null;
  end if;
  return new;
end;
$$;

create trigger document_review_resubmission_window_before_insert
before insert on public.document_reviews
for each row
execute function private.prepare_document_resubmission_window();

revoke all on function private.prepare_document_resubmission_window()
  from public, anon, authenticated;

create function private.record_document_resubmission_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  correction_request_id uuid;
  correction_due_at timestamptz;
  submission_time timestamptz;
begin
  if new.status = 'FOR_REVIEW'
    and old.status is distinct from new.status
    and new.replaces_document_id is not null
  then
    select latest_request.id, latest_request.resubmission_due_at
    into correction_request_id, correction_due_at
    from public.document_reviews as latest_request
    where latest_request.document_id = new.replaces_document_id
      and latest_request.status = 'FOR_RESUBMISSION'
      and latest_request.resubmission_submitted_at is null
      and latest_request.resubmission_due_at is not null
    order by latest_request.reviewed_at desc, latest_request.id desc
    limit 1
    for update;

    submission_time := clock_timestamp();
    if correction_request_id is not null
      and correction_due_at >= submission_time
    then
      update public.document_reviews as request
      set resubmission_submitted_at = submission_time,
          resubmission_submitted_document_id = new.id
      where request.id = correction_request_id
        and request.resubmission_submitted_at is null
        and request.resubmission_due_at >= submission_time;
    end if;
  end if;
  return new;
end;
$$;

create trigger document_record_resubmission_submission_after_status
after update of status on public.documents
for each row
execute function private.record_document_resubmission_submission();

revoke all on function private.record_document_resubmission_submission()
  from public, anon, authenticated;

create function public.notify_document_resubmission_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  target_document_name text;
begin
  if new.status <> 'FOR_RESUBMISSION' then
    return new;
  end if;

  select applicant.profile_id, document_type.name
  into target_user_id, target_document_name
  from public.documents as document
  join public.applicants as applicant on applicant.id = document.applicant_id
  join public.document_types as document_type
    on document_type.id = document.document_type_id
  where document.id = new.document_id;

  if target_user_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      target_user_id,
      'DOCUMENT_STATUS',
      'Document correction requested',
      target_document_name || ' needs a corrected version.'
        || case when new.resubmission_due_at is not null then
          ' Submit it for review by '
          || to_char(new.resubmission_due_at at time zone 'Asia/Manila', 'Mon DD, YYYY HH12:MI AM')
          || ' (Philippine time).'
        else ' Upload a corrected copy before applying.' end,
      '/applicant/documents'
    );
  end if;
  return new;
end;
$$;

create trigger document_review_resubmission_notification_after_insert
after insert on public.document_reviews
for each row
when (new.status = 'FOR_RESUBMISSION')
execute function public.notify_document_resubmission_request();

revoke all on function public.notify_document_resubmission_request()
  from public, anon, authenticated;

create view public.v_applicant_document_resubmissions
with (security_barrier = true, security_invoker = true)
as
with latest_requests as (
  select distinct on (original.applicant_id, original.document_type_id)
    applicant.id as applicant_id,
    document_type.id as document_type_id,
    document_type.name as document_type_name,
    request.id as request_id,
    request.document_id,
    request.reviewed_at as requested_at,
    request.resubmission_due_at as due_at,
    request.resubmission_submitted_at,
    request.resubmission_submitted_document_id
  from public.document_reviews as request
  join public.documents as original on original.id = request.document_id
  join public.applicants as applicant on applicant.id = original.applicant_id
  join public.document_types as document_type
    on document_type.id = original.document_type_id
  where request.status = 'FOR_RESUBMISSION'
    and document_type.is_required
  order by original.applicant_id, original.document_type_id,
    request.reviewed_at desc, request.id desc
)
select
  latest_requests.applicant_id,
  latest_requests.document_type_id,
  latest_requests.document_type_name,
  latest_requests.request_id,
  latest_requests.document_id,
  latest_requests.requested_at,
  latest_requests.due_at,
  latest_requests.resubmission_submitted_at,
  latest_requests.resubmission_submitted_document_id
from latest_requests
where
  (select private.is_role('APPLICANT'::public.user_role))
  and (select private.owns_applicant(latest_requests.applicant_id))
  and (
    latest_requests.resubmission_submitted_document_id is null
    or exists (
      select 1
      from public.documents as replacement
      where replacement.id = latest_requests.resubmission_submitted_document_id
        and replacement.status <> 'VERIFIED'::public.document_status
    )
  );

revoke all on public.v_applicant_document_resubmissions from public, anon;
grant select on public.v_applicant_document_resubmissions to authenticated;

-- This RPC mirrors apply_to_job while accepting a required document package
-- whose latest submissions are FOR_REVIEW or VERIFIED.
create function public.apply_to_job_with_review_status(
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

  select application.id
  into existing_application_id
  from public.applications as application
  where application.job_id = p_job_id
    and application.applicant_id = target_applicant_id;
  if existing_application_id is not null then
    return existing_application_id;
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

  insert into public.applications (
    job_id, applicant_id, position_id, pds_version_id, status
  )
  values (
    p_job_id, target_applicant_id, p_position_id, target_pds_id, 'SUBMITTED'
  )
  returning id, assigned_evaluator_id
  into new_application_id, target_evaluator_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    target_hr_id,
    'APPLICATION_SUBMITTED',
    'New application received',
    'Applicant ' || target_applicant_number || ' applied for '
      || target_position_title || ' in ' || target_job_title || '.',
    '/hr/applications/' || new_application_id::text
  );

  if target_evaluator_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      target_evaluator_id,
      'APPLICATION_FOR_EVALUATION',
      'Application assigned for evaluation',
      'Applicant ' || target_applicant_number || ' applied for '
        || target_position_title || ' in ' || target_job_title || '.',
      '/evaluator/applications/' || new_application_id::text
    );
  else
    insert into public.notifications (user_id, type, title, body, link)
    select
      profile.id,
      'APPLICATION_UNASSIGNED',
      'Application needs evaluator assignment',
      'Applicant ' || target_applicant_number || ' applied for '
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

create function private.expire_due_document_resubmissions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  overdue_request record;
  rejected_count integer;
  total_rejected integer := 0;
begin
  for overdue_request in
    select
      request.id,
      original.applicant_id,
      document_type.id as document_type_id,
      document_type.name as document_type_name,
      request.resubmission_due_at
    from public.document_reviews as request
    join public.documents as original on original.id = request.document_id
    join public.document_types as document_type
      on document_type.id = original.document_type_id
    where request.status = 'FOR_RESUBMISSION'
      and document_type.is_required
      and request.resubmission_submitted_at is null
      and request.resubmission_due_at <= now()
      and exists (
        select 1
        from public.applications as application
        where application.applicant_id = original.applicant_id
          and application.status::text not in (
            'HIRED', 'NOT_SELECTED', 'NOT_QUALIFIED', 'REJECTED'
          )
      )
      and not exists (
        select 1
        from public.document_reviews as newer_request
        join public.documents as newer_document
          on newer_document.id = newer_request.document_id
        where newer_document.applicant_id = original.applicant_id
          and newer_document.document_type_id = original.document_type_id
          and newer_request.status = 'FOR_RESUBMISSION'
          and (newer_request.reviewed_at, newer_request.id)
            > (request.reviewed_at, request.id)
      )
    order by request.resubmission_due_at
    for update of request skip locked
  loop
    update public.applications as application
    set status = 'REJECTED'::public.application_status,
        status_reason = 'Required document "' || overdue_request.document_type_name
          || '" was not submitted for review by '
          || to_char(
            overdue_request.resubmission_due_at at time zone 'Asia/Manila',
            'Mon DD, YYYY HH12:MI AM'
          ) || ' Philippine time.'
    where application.applicant_id = overdue_request.applicant_id
      and application.status::text not in (
        'HIRED', 'NOT_SELECTED', 'NOT_QUALIFIED', 'REJECTED'
      );
    get diagnostics rejected_count = row_count;
    total_rejected := total_rejected + rejected_count;
  end loop;
  return total_rejected;
end;
$$;

revoke all on function private.expire_due_document_resubmissions()
  from public, anon, authenticated;

create function private.posting_hiring_readiness(p_job_id uuid)
returns table (
  intake_closed boolean,
  pending_applications integer,
  pending_required_documents integer,
  pending_document_corrections integer,
  hired_count integer,
  slot_count integer,
  can_hire boolean
)
language sql
security definer
set search_path = ''
as $$
  with posting as (
    select job.id, job.status, job.deadline, job.slots
    from public.job_postings as job
    where job.id = p_job_id
  ), counts as (
    select
      (
        select count(*)::integer
        from public.applications as application
        where application.job_id = posting.id
          and application.status::text not in (
            'QUALIFIED', 'HIRED', 'NOT_SELECTED', 'NOT_QUALIFIED', 'REJECTED'
          )
      ) as pending_applications,
      (
        select count(*)::integer
        from public.applications as application
        cross join public.document_types as required_type
        left join lateral (
          select document.status
          from public.documents as document
          where document.applicant_id = application.applicant_id
            and document.document_type_id = required_type.id
          order by document.version desc
          limit 1
        ) as latest_document on true
        where application.job_id = posting.id
          and application.status::text not in (
            'HIRED', 'NOT_SELECTED', 'NOT_QUALIFIED', 'REJECTED'
          )
          and required_type.is_required
          and latest_document.status is distinct from 'VERIFIED'::public.document_status
      ) as pending_required_documents,
      (
        select count(*)::integer
        from public.document_reviews as request
        join public.documents as original on original.id = request.document_id
        join public.document_types as required_type
          on required_type.id = original.document_type_id
        where request.status = 'FOR_RESUBMISSION'
          and required_type.is_required
          and request.resubmission_submitted_at is null
          and exists (
            select 1
            from public.applications as application
            where application.job_id = posting.id
              and application.applicant_id = original.applicant_id
              and application.status::text not in (
                'HIRED', 'NOT_SELECTED', 'NOT_QUALIFIED', 'REJECTED'
              )
          )
          and not exists (
            select 1
            from public.document_reviews as newer_request
            join public.documents as newer_document
              on newer_document.id = newer_request.document_id
            where newer_document.applicant_id = original.applicant_id
              and newer_document.document_type_id = original.document_type_id
              and newer_request.status = 'FOR_RESUBMISSION'
              and (newer_request.reviewed_at, newer_request.id)
                > (request.reviewed_at, request.id)
          )
      ) as pending_document_corrections,
      (
        select count(*)::integer
        from public.applications as application
        where application.job_id = posting.id
          and application.status = 'HIRED'::public.application_status
      ) as hired_count
    from posting
  )
  select
    (posting.status = 'CLOSED' or coalesce(posting.deadline <= now(), false)) as intake_closed,
    counts.pending_applications,
    counts.pending_required_documents,
    counts.pending_document_corrections,
    counts.hired_count,
    posting.slots as slot_count,
    (
      (posting.status = 'CLOSED' or coalesce(posting.deadline <= now(), false))
      and counts.pending_applications = 0
      and counts.pending_required_documents = 0
      and counts.pending_document_corrections = 0
      and counts.hired_count < posting.slots
    ) as can_hire
  from posting cross join counts;
$$;

revoke all on function private.posting_hiring_readiness(uuid)
  from public, anon, authenticated;

create function public.get_posting_hiring_readiness(p_job_id uuid)
returns table (
  intake_closed boolean,
  pending_applications integer,
  pending_required_documents integer,
  pending_document_corrections integer,
  hired_count integer,
  slot_count integer,
  can_hire boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_role('HR'::public.user_role)) then
    raise exception 'HR access is required.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.job_postings as job
    where job.id = p_job_id and job.hr_id = (select auth.uid())
  ) then
    raise exception 'This posting is not available.' using errcode = '42501';
  end if;
  return query
  select * from private.posting_hiring_readiness(p_job_id);
end;
$$;

revoke all on function public.get_posting_hiring_readiness(uuid)
  from public, anon;
grant execute on function public.get_posting_hiring_readiness(uuid)
  to authenticated;

create function private.enforce_hiring_readiness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job_id uuid;
  hiring_ready boolean;
begin
  if new.decision <> 'HIRED' then
    return new;
  end if;

  select application.job_id
  into target_job_id
  from public.applications as application
  where application.id = new.application_id;
  if target_job_id is null then
    raise exception 'The application is no longer available.' using errcode = 'P0002';
  end if;

  select readiness.can_hire
  into hiring_ready
  from private.posting_hiring_readiness(target_job_id) as readiness;
  if hiring_ready is distinct from true then
    raise exception 'Hiring is available after intake closes and all application reviews, required document checks, and correction windows are resolved.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger hiring_decision_readiness_before_insert
before insert on public.hiring_decisions
for each row
execute function private.enforce_hiring_readiness();

revoke all on function private.enforce_hiring_readiness()
  from public, anon, authenticated;

create function public.close_job_posting_intake(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_role('HR'::public.user_role)) then
    raise exception 'HR access is required.' using errcode = '42501';
  end if;

  update public.job_postings as job
  set status = 'CLOSED'::public.job_status,
      updated_at = now()
  where job.id = p_job_id
    and job.hr_id = (select auth.uid())
    and job.status = 'OPEN'::public.job_status
    and job.deadline is null;

  if not found then
    raise exception 'Only your open postings without a deadline can be closed here.'
      using errcode = '22023';
  end if;
  return true;
end;
$$;

revoke all on function public.close_job_posting_intake(uuid)
  from public, anon;
grant execute on function public.close_job_posting_intake(uuid)
  to authenticated;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'expire-applicant-document-corrections';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
  perform cron.schedule(
    'expire-applicant-document-corrections',
    '* * * * *',
    'select private.expire_due_document_resubmissions();'
  );
end;
$$;

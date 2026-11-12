alter table public.applications
  add column assigned_evaluator_id uuid default null
  references public.profiles (id)
  on delete set null;

create index applications_assignee_status_applied_at_idx
  on public.applications (assigned_evaluator_id, status, applied_at desc);

create table public.application_assignment_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  previous_evaluator_id uuid references public.profiles (id) on delete set null,
  evaluator_id uuid references public.profiles (id) on delete set null,
  assignment_source text not null check (assignment_source in ('ROUND_ROBIN', 'ADMIN')),
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  constraint application_assignment_history_has_change check (
    previous_evaluator_id is distinct from evaluator_id
  )
);

create index application_assignment_history_application_assigned_at_idx
  on public.application_assignment_history (application_id, assigned_at desc);

alter table public.application_assignment_history enable row level security;
revoke all on public.application_assignment_history from public, anon, authenticated;
grant select on public.application_assignment_history to authenticated;

create policy application_assignment_history_read_admin
on public.application_assignment_history for select to authenticated
using ((select private.is_role('ADMIN'::public.user_role)));

create table private.evaluator_assignment_rotation (
  singleton boolean primary key default true check (singleton),
  last_evaluator_id uuid references public.profiles (id) on delete set null
);

insert into private.evaluator_assignment_rotation (singleton)
values (true);

revoke all on private.evaluator_assignment_rotation from public, anon, authenticated;

create function private.next_evaluator_for_assignment()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_evaluator_id uuid;
  previous_created_at timestamptz;
  next_evaluator_id uuid;
begin
  select rotation.last_evaluator_id
  into previous_evaluator_id
  from private.evaluator_assignment_rotation as rotation
  where rotation.singleton
  for update;

  if previous_evaluator_id is not null then
    select profile.created_at
    into previous_created_at
    from public.profiles as profile
    where profile.id = previous_evaluator_id;
  end if;

  select profile.id
  into next_evaluator_id
  from public.profiles as profile
  where profile.role = 'EVALUATOR'
    and (
      previous_created_at is null
      or (profile.created_at, profile.id) > (previous_created_at, previous_evaluator_id)
    )
  order by profile.created_at, profile.id
  limit 1;

  if next_evaluator_id is null then
    select profile.id
    into next_evaluator_id
    from public.profiles as profile
    where profile.role = 'EVALUATOR'
    order by profile.created_at, profile.id
    limit 1;
  end if;

  if next_evaluator_id is not null then
    update private.evaluator_assignment_rotation
    set last_evaluator_id = next_evaluator_id
    where singleton;
  end if;

  return next_evaluator_id;
end;
$$;

revoke all on function private.next_evaluator_for_assignment() from public, anon, authenticated;

create function private.assign_application_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'SUBMITTED' and new.assigned_evaluator_id is null then
    new.assigned_evaluator_id := private.next_evaluator_for_assignment();
  end if;

  return new;
end;
$$;

revoke all on function private.assign_application_on_insert() from public, anon, authenticated;

create function private.record_application_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_id uuid;
  source text;
begin
  if tg_op = 'INSERT' then
    previous_id := null;
    if new.assigned_evaluator_id is null then
      return new;
    end if;
    source := 'ROUND_ROBIN';
  else
    previous_id := old.assigned_evaluator_id;
    if new.assigned_evaluator_id is not distinct from previous_id then
      return new;
    end if;
    source := case
      when current_setting('app.assignment_source', true) = 'ROUND_ROBIN'
        then 'ROUND_ROBIN'
      else 'ADMIN'
    end;
  end if;

  insert into public.application_assignment_history (
    application_id,
    previous_evaluator_id,
    evaluator_id,
    assignment_source,
    assigned_by
  )
  values (
    new.id,
    previous_id,
    new.assigned_evaluator_id,
    source,
    case when source = 'ADMIN' then (select auth.uid()) else null end
  );

  return new;
end;
$$;

revoke all on function private.record_application_assignment() from public, anon, authenticated;

create trigger applications_assign_evaluator_before_insert
before insert on public.applications
for each row
execute function private.assign_application_on_insert();

create trigger applications_record_evaluator_assignment
after insert or update of assigned_evaluator_id on public.applications
for each row
execute function private.record_application_assignment();

create function private.is_current_evaluator_assigned_to_application(
  target_application_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_role('EVALUATOR'::public.user_role))
    and exists (
      select 1
      from public.applications as application
      where application.id = target_application_id
        and application.assigned_evaluator_id = (select auth.uid())
    )
$$;

revoke all on function private.is_current_evaluator_assigned_to_application(uuid)
  from public, anon;
grant execute on function private.is_current_evaluator_assigned_to_application(uuid)
  to authenticated;

create function private.is_current_evaluator_assigned_to_document(
  target_document_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_role('EVALUATOR'::public.user_role))
    and exists (
      select 1
      from public.documents as document
      join public.applications as application
        on application.applicant_id = document.applicant_id
      where document.id = target_document_id
        and application.assigned_evaluator_id = (select auth.uid())
    )
$$;

revoke all on function private.is_current_evaluator_assigned_to_document(uuid)
  from public, anon;
grant execute on function private.is_current_evaluator_assigned_to_document(uuid)
  to authenticated;

create function public.reassign_application_evaluator(
  p_application_id uuid,
  p_evaluator_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_evaluator_id uuid;
begin
  if not (select private.is_role('ADMIN'::public.user_role)) then
    raise exception 'Admin access is required.' using errcode = '42501';
  end if;

  if p_evaluator_id is not null and not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_evaluator_id
      and profile.role = 'EVALUATOR'
  ) then
    raise exception 'Choose an eligible evaluator.' using errcode = '22023';
  end if;

  select application.assigned_evaluator_id
  into current_evaluator_id
  from public.applications as application
  where application.id = p_application_id
    and application.status not in ('HIRED', 'REJECTED')
  for update;

  if not found then
    raise exception 'Application was not found.' using errcode = 'P0002';
  end if;

  if current_evaluator_id is not distinct from p_evaluator_id then
    return false;
  end if;

  perform set_config('app.assignment_source', 'ADMIN', true);

  update public.applications
  set assigned_evaluator_id = p_evaluator_id
  where id = p_application_id;

  if p_evaluator_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    select
      p_evaluator_id,
      'APPLICATION_FOR_EVALUATION',
      'Application assigned for evaluation',
      'Applicant ' || applicant.applicant_number || ' has been assigned to your review queue for '
        || job.title || '.',
      '/evaluator/applications/' || application.id::text
    from public.applications as application
    join public.applicants as applicant on applicant.id = application.applicant_id
    join public.job_postings as job on job.id = application.job_id
    where application.id = p_application_id;
  end if;

  return true;
end;
$$;

revoke all on function public.reassign_application_evaluator(uuid, uuid)
  from public, anon;
grant execute on function public.reassign_application_evaluator(uuid, uuid)
  to authenticated;

create function public.schedule_application_assessment(
  p_application_id uuid,
  p_scheduled_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status public.application_status;
begin
  if not (select private.is_role('EVALUATOR'::public.user_role)) then
    raise exception 'Evaluator access is required.' using errcode = '42501';
  end if;

  if p_scheduled_at is null or p_scheduled_at <= now() then
    raise exception 'Choose a future assessment date and time.'
      using errcode = '22023';
  end if;

  select application.status
  into target_status
  from public.applications as application
  where application.id = p_application_id
    and application.assigned_evaluator_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'This application is no longer assigned to you.'
      using errcode = '42501';
  end if;

  if target_status in ('HIRED', 'REJECTED') then
    return false;
  end if;

  update public.applications
  set scheduled_assessment_at = p_scheduled_at,
      status = 'ASSESSMENT_SCHEDULED'
  where id = p_application_id;

  return true;
end;
$$;

revoke all on function public.schedule_application_assessment(uuid, timestamptz)
  from public, anon;
grant execute on function public.schedule_application_assessment(uuid, timestamptz)
  to authenticated;

create function public.save_application_criterion_score(
  p_application_id uuid,
  p_criterion_id uuid,
  p_points numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job_id uuid;
  target_position_id uuid;
  target_status public.application_status;
  target_maximum_points numeric(5, 2);
begin
  if not (select private.is_role('EVALUATOR'::public.user_role)) then
    raise exception 'Evaluator access is required.' using errcode = '42501';
  end if;

  select application.job_id, application.position_id, application.status
  into target_job_id, target_position_id, target_status
  from public.applications as application
  where application.id = p_application_id
    and application.assigned_evaluator_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'This application is no longer assigned to you.'
      using errcode = '42501';
  end if;

  if target_status in ('HIRED', 'REJECTED') then
    raise exception 'This application already has a final hiring decision.'
      using errcode = '22023';
  end if;

  if target_position_id is null then
    raise exception 'A position must be selected before criterion scores can be entered.'
      using errcode = '22023';
  end if;

  select weight.points
  into target_maximum_points
  from public.job_posting_positions as job_position
  join public.position_criterion_weights as weight
    on weight.profile_id = job_position.weight_profile_id
  join public.position_criteria as criterion
    on criterion.id = weight.criterion_id
  where job_position.job_id = target_job_id
    and job_position.position_id = target_position_id
    and criterion.id = p_criterion_id
    and criterion.position_id = target_position_id
    and criterion.criterion_key = 'CLASSROOM_OBSERVATION';

  if target_maximum_points is null then
    raise exception 'Only the configured demo teaching observation score can be entered here.'
      using errcode = '22023';
  end if;

  if p_points is null
    or p_points < 0
    or p_points > target_maximum_points
    or abs(p_points * 100 - round(p_points * 100)) >= 0.00000001
  then
    raise exception 'The score is outside the configured criterion maximum.'
      using errcode = '22023';
  end if;

  insert into public.application_criterion_scores (
    application_id,
    criterion_id,
    evaluator_id,
    points,
    updated_at
  )
  values (
    p_application_id,
    p_criterion_id,
    (select auth.uid()),
    p_points,
    now()
  )
  on conflict (application_id, criterion_id)
  do update set
    evaluator_id = excluded.evaluator_id,
    points = excluded.points,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.save_application_criterion_score(uuid, uuid, numeric)
  from public, anon;
grant execute on function public.save_application_criterion_score(uuid, uuid, numeric)
  to authenticated;

drop policy application_criterion_scores_read_by_role
  on public.application_criterion_scores;
create policy application_criterion_scores_read_by_role
on public.application_criterion_scores for select to authenticated
using (
  (
    (select private.is_role('EVALUATOR'::public.user_role))
    and (
      evaluator_id = (select auth.uid())
      or (
        select private.is_current_evaluator_assigned_to_application(application_id)
      )
    )
  )
  or (
    (select private.is_role('HR'::public.user_role))
    and (select private.hr_owns_application(application_id))
  )
);

drop policy applications_read_by_role on public.applications;
create policy applications_read_by_role
on public.applications for select to authenticated
using (
  ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_application(id)))
  or ((select private.is_role('HR'::public.user_role)) and (select private.hr_owns_application(id)))
  or (
    (select private.is_role('EVALUATOR'::public.user_role))
    and assigned_evaluator_id = (select auth.uid())
  )
);

drop policy document_reviews_read_by_role on public.document_reviews;
create policy document_reviews_read_by_role
on public.document_reviews for select to authenticated
using (
  ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_document(document_id)))
  or (
    (select private.is_role('EVALUATOR'::public.user_role))
    and (
      evaluator_id = (select auth.uid())
      or (select private.is_current_evaluator_assigned_to_document(document_id))
    )
  )
  or ((select private.is_role('HR'::public.user_role)) and (select private.hr_owns_document(document_id)))
);

drop policy document_reviews_add_evaluator_review on public.document_reviews;
create policy document_reviews_add_evaluator_review
on public.document_reviews for insert to authenticated
with check (
  (select private.is_role('EVALUATOR'::public.user_role))
  and evaluator_id = (select auth.uid())
  and (select private.is_current_evaluator_assigned_to_document(document_id))
);

drop policy application_evaluations_read_by_role on public.application_evaluations;
create policy application_evaluations_read_by_role
on public.application_evaluations for select to authenticated
using (
  ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_application(application_id)))
  or (
    (select private.is_role('EVALUATOR'::public.user_role))
    and (
      evaluator_id = (select auth.uid())
      or (select private.is_current_evaluator_assigned_to_application(application_id))
    )
  )
  or ((select private.is_role('HR'::public.user_role)) and (select private.hr_owns_application(application_id)))
);

drop policy application_evaluations_add_evaluator_result
  on public.application_evaluations;
create policy application_evaluations_add_evaluator_result
on public.application_evaluations for insert to authenticated
with check (
  (select private.is_role('EVALUATOR'::public.user_role))
  and evaluator_id = (select auth.uid())
  and (select private.is_current_evaluator_assigned_to_application(application_id))
);

create policy profiles_read_admin_evaluators
on public.profiles for select to authenticated
using (
  (select private.is_role('ADMIN'::public.user_role))
  and role = 'EVALUATOR'
);

create or replace view private.authorized_anonymized_applications
with (security_barrier = true)
as
select
  application.id as application_id,
  application.job_id,
  application.status as application_status,
  application.applied_at,
  applicant.applicant_number,
  application.pds_version_id,
  application.applicant_id
from public.applications as application
join public.job_postings as job on job.id = application.job_id
join public.applicants as applicant on applicant.id = application.applicant_id
join public.pds_versions as pds on pds.id = application.pds_version_id
where pds.status = 'SUBMITTED'
  and (
    (
      (select private.is_role('EVALUATOR'::public.user_role))
      and application.assigned_evaluator_id = (select auth.uid())
    )
    or (
      (select private.is_role('HR'::public.user_role))
      and job.hr_id = (select auth.uid())
    )
  );

create or replace view public.v_anonymized_documents
with (security_barrier = true)
as
select
  application.id as application_id,
  job.id as job_id,
  applicant.applicant_number,
  document.id as document_id,
  document.file_path as storage_key,
  document_type.name as document_type,
  document.status as document_status,
  document.uploaded_at
from public.documents as document
join public.applicants as applicant on applicant.id = document.applicant_id
join public.document_types as document_type on document_type.id = document.document_type_id
join public.applications as application on application.applicant_id = applicant.id
join public.pds_versions as pds on pds.id = application.pds_version_id
join public.job_postings as job on job.id = application.job_id
where pds.status = 'SUBMITTED'
  and (
    (
      (select private.is_role('EVALUATOR'::public.user_role))
      and application.assigned_evaluator_id = (select auth.uid())
    )
    or (
      (select private.is_role('HR'::public.user_role))
      and job.hr_id = (select auth.uid())
    )
  );

revoke all on public.v_anonymized_documents from public, anon, authenticated;
grant select on public.v_anonymized_documents to authenticated;

create or replace function private.can_access_document_path(target_file_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.documents as document
    join public.applicants as applicant on applicant.id = document.applicant_id
    where document.file_path = target_file_path
      and (
        (
          (select private.is_role('APPLICANT'::public.user_role))
          and applicant.profile_id = (select auth.uid())
        )
        or (
          (select private.is_role('EVALUATOR'::public.user_role))
          and exists (
            select 1
            from public.applications as application
            join public.pds_versions as pds on pds.id = application.pds_version_id
            where application.applicant_id = applicant.id
              and application.assigned_evaluator_id = (select auth.uid())
              and pds.status = 'SUBMITTED'
          )
        )
        or (
          (select private.is_role('HR'::public.user_role))
          and exists (
            select 1
            from public.applications as application
            join public.job_postings as job on job.id = application.job_id
            where application.applicant_id = applicant.id
              and job.hr_id = (select auth.uid())
          )
        )
      )
  )
$$;

revoke all on function private.can_access_document_path(text)
  from public, anon, authenticated;
grant execute on function private.can_access_document_path(text)
  to authenticated;

create or replace function public.apply_to_job(
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
  join public.positions as position
    on position.id = job_position.position_id
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

revoke all on function public.apply_to_job(uuid, uuid) from public, anon;
grant execute on function public.apply_to_job(uuid, uuid) to authenticated;

create or replace function public.handle_new_document_for_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.documents
  set status = 'FOR_REVIEW'
  where id = new.id
    and status = 'PENDING';

  if exists (
    select 1
    from public.applications as application
    join public.pds_versions as pds on pds.id = application.pds_version_id
    where application.applicant_id = new.applicant_id
      and pds.status = 'SUBMITTED'
      and application.status not in ('HIRED', 'REJECTED')
  ) then
    insert into public.notifications (user_id, type, title, body, link)
    select distinct
      application.assigned_evaluator_id,
      'DOCUMENT_FOR_REVIEW',
      'Document ready for review',
      'A supporting document is ready for evaluation.',
      '/evaluator/documents/' || new.id::text
    from public.applications as application
    join public.pds_versions as pds on pds.id = application.pds_version_id
    where application.applicant_id = new.applicant_id
      and pds.status = 'SUBMITTED'
      and application.status not in ('HIRED', 'REJECTED')
      and application.assigned_evaluator_id is not null;
  end if;

  return new;
end;
$$;

create or replace function public.handle_submitted_pds_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'SUBMITTED' or new.status <> 'SUBMITTED' then
    return new;
  end if;

  update public.applications
  set pds_version_id = new.id,
      status = 'UNDER_EVALUATION'
  where applicant_id = new.applicant_id
    and status in ('SUBMITTED', 'UNDER_EVALUATION', 'QUALIFIED', 'NOT_QUALIFIED');

  update public.documents
  set status = 'FOR_REVIEW'
  where applicant_id = new.applicant_id
    and status <> 'FOR_REVIEW';

  insert into public.notifications (user_id, type, title, body, link)
  select
    application.assigned_evaluator_id,
    'PDS_FOR_REVIEW',
    'Updated PDS ready for review',
    'Applicant ' || applicant.applicant_number || ' submitted an updated PDS.',
    '/evaluator/applications/' || application.id::text
  from public.applications as application
  join public.applicants as applicant on applicant.id = application.applicant_id
  where application.applicant_id = new.applicant_id
    and application.pds_version_id = new.id
    and application.status = 'UNDER_EVALUATION'
    and application.assigned_evaluator_id is not null;

  return new;
end;
$$;

revoke all on function public.handle_new_document_for_review() from public, anon;
revoke all on function public.handle_submitted_pds_version() from public, anon;

create view public.v_evaluator_review_queue
with (security_barrier = true)
as
select
  applicant.application_id,
  applicant.applicant_number,
  applicant.application_status,
  applicant.applied_at,
  applicant.job_id,
  job.title as job_title,
  applicant.position_title,
  applicant.position_track,
  case
    when applicant.application_status = 'UNDER_EVALUATION'
      or (
        applicant.application_status in ('QUALIFIED', 'NOT_QUALIFIED')
        and document_review.needs_review
      )
      then 'REREVIEW'
    else 'INITIAL'
  end as review_kind
from public.v_anonymized_applicants as applicant
join public.job_postings as job on job.id = applicant.job_id
join public.applications as application
  on application.id = applicant.application_id
cross join lateral (
  select exists (
    select 1
    from public.documents as document
    where document.applicant_id = application.applicant_id
      and document.status = 'FOR_REVIEW'
      and not exists (
        select 1
        from public.documents as newer
        where newer.applicant_id = document.applicant_id
          and newer.document_type_id = document.document_type_id
          and (newer.uploaded_at, newer.id) > (document.uploaded_at, document.id)
      )
  ) as needs_review
) as document_review
where (select private.is_role('EVALUATOR'::public.user_role))
  and (
    applicant.application_status in ('SUBMITTED', 'UNDER_EVALUATION', 'ASSESSMENT_SCHEDULED')
    or (
      applicant.application_status in ('QUALIFIED', 'NOT_QUALIFIED')
      and document_review.needs_review
    )
  );

revoke all on public.v_evaluator_review_queue from public, anon, authenticated;
grant select on public.v_evaluator_review_queue to authenticated;

create view public.v_evaluator_review_queue_summary
with (security_barrier = true)
as
select
  queue.job_id,
  queue.job_title,
  count(*)::integer as waiting_count,
  count(*) filter (where queue.review_kind = 'REREVIEW')::integer as rereview_count
from public.v_evaluator_review_queue as queue
group by queue.job_id, queue.job_title;

revoke all on public.v_evaluator_review_queue_summary from public, anon, authenticated;
grant select on public.v_evaluator_review_queue_summary to authenticated;

create view public.v_admin_application_assignments
with (security_barrier = true)
as
select
  application.id as application_id,
  applicant.applicant_number,
  application.job_id,
  job.title as job_title,
  application.status as application_status,
  application.applied_at,
  application.assigned_evaluator_id,
  evaluator.email as assigned_evaluator_email
from public.applications as application
join public.applicants as applicant on applicant.id = application.applicant_id
join public.job_postings as job on job.id = application.job_id
left join public.profiles as evaluator
  on evaluator.id = application.assigned_evaluator_id
where (select private.is_role('ADMIN'::public.user_role))
  and application.status not in ('HIRED', 'REJECTED');

revoke all on public.v_admin_application_assignments from public, anon, authenticated;
grant select on public.v_admin_application_assignments to authenticated;

create view public.v_admin_evaluator_assignment_counts
with (security_barrier = true)
as
select
  evaluator.id as evaluator_id,
  evaluator.email as evaluator_email,
  count(application.id)::integer as assigned_count
from public.profiles as evaluator
left join public.applications as application
  on application.assigned_evaluator_id = evaluator.id
  and application.status not in ('HIRED', 'REJECTED')
where (select private.is_role('ADMIN'::public.user_role))
  and evaluator.role = 'EVALUATOR'
group by evaluator.id, evaluator.email;

revoke all on public.v_admin_evaluator_assignment_counts from public, anon, authenticated;
grant select on public.v_admin_evaluator_assignment_counts to authenticated;

create view public.v_admin_application_assignment_history
with (security_barrier = true)
as
select
  history.id,
  history.application_id,
  history.assignment_source,
  history.assigned_at,
  previous_evaluator.email as previous_evaluator_email,
  evaluator.email as evaluator_email,
  assigned_by.email as assigned_by_email
from public.application_assignment_history as history
left join public.profiles as previous_evaluator
  on previous_evaluator.id = history.previous_evaluator_id
left join public.profiles as evaluator
  on evaluator.id = history.evaluator_id
left join public.profiles as assigned_by
  on assigned_by.id = history.assigned_by
where (select private.is_role('ADMIN'::public.user_role));

revoke all on public.v_admin_application_assignment_history from public, anon, authenticated;
grant select on public.v_admin_application_assignment_history to authenticated;

do $$
declare
  application_to_assign record;
begin
  perform set_config('app.assignment_source', 'ROUND_ROBIN', true);

  for application_to_assign in
    select application.id
    from public.applications as application
    where application.assigned_evaluator_id is null
      and application.status not in ('HIRED', 'REJECTED')
    order by application.applied_at, application.id
  loop
    update public.applications
    set assigned_evaluator_id = private.next_evaluator_for_assignment()
    where id = application_to_assign.id;
  end loop;
end;
$$;
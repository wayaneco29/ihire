create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role public.user_role;
begin
  assigned_role := case new.raw_app_meta_data ->> 'role'
    when 'HR' then 'HR'::public.user_role
    when 'EVALUATOR' then 'EVALUATOR'::public.user_role
    when 'DOCUMENT_REVIEWER' then 'DOCUMENT_REVIEWER'::public.user_role
    when 'ADMIN' then 'ADMIN'::public.user_role
    else 'APPLICANT'::public.user_role
  end;

  insert into public.profiles (id, role, email)
  values (new.id, assigned_role, new.email);

  if assigned_role = 'APPLICANT'::public.user_role then
    insert into public.applicants (profile_id)
    values (new.id);
  end if;

  return new;
end;
$$;

create or replace function public.sync_profile_role_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role public.user_role;
begin
  assigned_role := case new.raw_app_meta_data ->> 'role'
    when 'HR' then 'HR'::public.user_role
    when 'EVALUATOR' then 'EVALUATOR'::public.user_role
    when 'DOCUMENT_REVIEWER' then 'DOCUMENT_REVIEWER'::public.user_role
    when 'ADMIN' then 'ADMIN'::public.user_role
    else 'APPLICANT'::public.user_role
  end;

  update public.profiles
  set role = assigned_role
  where id = new.id;

  if assigned_role = 'APPLICANT'::public.user_role then
    insert into public.applicants (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  else
    delete from public.applicants applicant
    where applicant.profile_id = new.id
      and not exists (
        select 1
        from public.pds_versions pds
        where pds.applicant_id = applicant.id
      )
      and not exists (
        select 1
        from public.documents document
        where document.applicant_id = applicant.id
      )
      and not exists (
        select 1
        from public.applications application
        where application.applicant_id = applicant.id
      );
  end if;

  return new;
end;
$$;

create function private.can_review_document_path(target_file_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.documents as document
    where document.file_path = target_file_path
      and document.status = 'FOR_REVIEW'
      and (select private.is_role('DOCUMENT_REVIEWER'::public.user_role))
  )
$$;

revoke all on function private.can_review_document_path(text)
  from public, anon, authenticated;
grant execute on function private.can_review_document_path(text)
  to authenticated;

create policy document_reviewer_read_for_review
on storage.objects for select to authenticated
using (
  bucket_id = 'applicant-documents'
  and (select private.can_review_document_path(name))
);

drop policy documents_read_applicant_own on public.documents;
create policy documents_read_applicant_own
on public.documents for select to authenticated
using (
  (
    (select private.is_role('APPLICANT'::public.user_role))
    and (select private.owns_applicant(applicant_id))
  )
  or (
    (select private.is_role('DOCUMENT_REVIEWER'::public.user_role))
    and status = 'FOR_REVIEW'
  )
);

drop policy document_reviews_read_by_role on public.document_reviews;
drop policy document_reviews_add_evaluator_review
  on public.document_reviews;

alter table public.document_reviews
  rename column evaluator_id to reviewer_id;

alter table public.document_reviews
  rename constraint document_reviews_evaluator_id_fkey
  to document_reviews_reviewer_id_fkey;

create policy document_reviews_read_by_role
on public.document_reviews for select to authenticated
using (
  ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_document(document_id)))
  or (
    (select private.is_role('DOCUMENT_REVIEWER'::public.user_role))
    and exists (
      select 1
      from public.documents as document
      where document.id = document_reviews.document_id
    )
  )
  or (
    (select private.is_role('EVALUATOR'::public.user_role))
    and (
      reviewer_id = (select auth.uid())
      or (select private.is_current_evaluator_assigned_to_document(document_id))
    )
  )
  or ((select private.is_role('HR'::public.user_role)) and (select private.hr_owns_document(document_id)))
);

create policy document_reviews_add_document_reviewer_review
on public.document_reviews for insert to authenticated
with check (
  (select private.is_role('DOCUMENT_REVIEWER'::public.user_role))
  and reviewer_id = (select auth.uid())
  and exists (
    select 1
    from public.documents as document
    where document.id = document_reviews.document_id
      and document.status = 'FOR_REVIEW'
  )
);

drop trigger document_after_insert_for_review on public.documents;

create function public.handle_submitted_pds_version_for_document_workflow()
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

drop trigger pds_version_after_submit on public.pds_versions;
create trigger pds_version_after_submit
after update of status on public.pds_versions
for each row
when (old.status is distinct from new.status)
execute function public.handle_submitted_pds_version_for_document_workflow();

revoke all on function public.handle_submitted_pds_version_for_document_workflow()
  from public, anon;

create or replace function public.submit_applicant_documents_for_review()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_applicant_id uuid;
  submitted_count integer;
begin
  if not (select private.is_role('APPLICANT'::public.user_role)) then
    raise exception 'Only applicants can submit documents for review.'
      using errcode = '42501';
  end if;

  select applicant.id
  into target_applicant_id
  from public.applicants as applicant
  where applicant.profile_id = (select auth.uid())
  for update;

  if target_applicant_id is null then
    raise exception 'Applicant profile was not found.' using errcode = 'P0002';
  end if;

  update public.documents as document
  set status = 'FOR_REVIEW'
  from public.document_types as document_type
  where document.applicant_id = target_applicant_id
    and document.document_type_id = document_type.id
    and document.status = 'PENDING'
    and (
      (
        document_type.name = 'Training and Seminar Certificates'
        and not exists (
          select 1
          from public.documents as replacement
          where replacement.replaces_document_id = document.id
        )
      )
      or (
        document_type.name <> 'Training and Seminar Certificates'
        and document.version = (
          select max(latest.version)
          from public.documents as latest
          where latest.applicant_id = document.applicant_id
            and latest.document_type_id = document.document_type_id
        )
      )
    );
  get diagnostics submitted_count = row_count;

  if submitted_count > 0 then
    insert into public.notifications (user_id, type, title, body, link)
    select
      profile.id,
      'DOCUMENT_FOR_REVIEW',
      'Documents ready for review',
      'An applicant submitted supporting documents for review.',
      '/document-reviewer/documents'
    from public.profiles as profile
    where profile.role = 'DOCUMENT_REVIEWER';
  end if;

  return submitted_count;
end;
$$;

revoke all on function public.submit_applicant_documents_for_review()
  from public, anon;
grant execute on function public.submit_applicant_documents_for_review()
  to authenticated;

create or replace function private.prevent_verified_document_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'VERIFIED' then
    raise exception 'Verified documents are locked and cannot be changed or deleted.'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger documents_lock_verified
before update or delete on public.documents
for each row
execute function private.prevent_verified_document_mutation();

revoke all on function private.prevent_verified_document_mutation()
  from public, anon, authenticated;

create or replace function private.prevent_verified_document_replacement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_type_name text;
  latest_status public.document_status;
begin
  select document_type.name
  into target_type_name
  from public.document_types as document_type
  where document_type.id = new.document_type_id;

  if target_type_name = 'Training and Seminar Certificates' then
    if new.replaces_document_id is not null and exists (
      select 1
      from public.documents as previous
      where previous.id = new.replaces_document_id
        and previous.applicant_id = new.applicant_id
        and previous.document_type_id = new.document_type_id
        and previous.status = 'VERIFIED'
    ) then
      raise exception 'Verified documents are locked and cannot be replaced.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  select document.status
  into latest_status
  from public.documents as document
  where document.applicant_id = new.applicant_id
    and document.document_type_id = new.document_type_id
  order by document.version desc
  limit 1;

  if latest_status = 'VERIFIED' then
    raise exception 'Verified documents are locked. Request resubmission before uploading a replacement.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger documents_prevent_verified_replacement
before insert on public.documents
for each row
execute function private.prevent_verified_document_replacement();

revoke all on function private.prevent_verified_document_replacement()
  from public, anon, authenticated;

create or replace function private.get_authorized_document_metrics(
  target_document_id uuid
)
returns table (
  training_hours numeric(8, 2),
  total_units numeric(10, 2),
  ocr_training_hours numeric(8, 2),
  ocr_total_units numeric(10, 2),
  ocr_confidence numeric(5, 2),
  ocr_processed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    document.training_hours,
    document.total_units,
    document.ocr_training_hours,
    document.ocr_total_units,
    document.ocr_confidence,
    document.ocr_processed_at
  from public.documents as document
  where document.id = target_document_id
    and (select auth.uid()) is not null
    and (
      exists (
        select 1
        from public.v_anonymized_documents as visible_document
        where visible_document.document_id = document.id
      )
      or (
        (select private.is_role('DOCUMENT_REVIEWER'::public.user_role))
        and document.status = 'FOR_REVIEW'
      )
    )
$$;

create or replace function private.get_authorized_document_education_attainment(
  target_document_id uuid
)
returns public.education_level
language sql
stable
security definer
set search_path = ''
as $$
  select document.current_highest_education_level
  from public.documents as document
  where document.id = target_document_id
    and (select auth.uid()) is not null
    and (
      exists (
        select 1
        from public.v_anonymized_documents as visible_document
        where visible_document.document_id = document.id
      )
      or (
        (select private.is_role('DOCUMENT_REVIEWER'::public.user_role))
        and document.status = 'FOR_REVIEW'
      )
    )
$$;

create or replace view public.v_anonymized_document_metrics
with (security_barrier = true, security_invoker = true)
as
with visible_documents as (
  select visible_document.document_id
  from public.v_anonymized_documents as visible_document
  union
  select document.id
  from public.documents as document
  where (select private.is_role('DOCUMENT_REVIEWER'::public.user_role))
    and document.status = 'FOR_REVIEW'
)
select
  visible_document.document_id,
  metrics.training_hours::numeric(8, 2) as training_hours,
  metrics.total_units::numeric(10, 2) as total_units,
  metrics.ocr_training_hours::numeric(8, 2) as ocr_training_hours,
  metrics.ocr_total_units::numeric(10, 2) as ocr_total_units,
  metrics.ocr_confidence::numeric(5, 2) as ocr_confidence,
  metrics.ocr_processed_at,
  private.get_authorized_document_education_attainment(
    visible_document.document_id
  ) as current_highest_education_level
from visible_documents as visible_document
cross join lateral private.get_authorized_document_metrics(
  visible_document.document_id
) as metrics;

create function private.get_document_review_queue()
returns table (
document_id uuid,
applicant_number text,
document_type text,
storage_key text,
document_status public.document_status,
uploaded_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
select
  document.id as document_id,
  applicant.applicant_number,
  document_type.name as document_type,
  document.file_path as storage_key,
  document.status as document_status,
  document.uploaded_at
from public.documents as document
join public.applicants as applicant on applicant.id = document.applicant_id
join public.document_types as document_type
  on document_type.id = document.document_type_id
where document.status = 'FOR_REVIEW'
  and (select private.is_role('DOCUMENT_REVIEWER'::public.user_role))
$$;

revoke all on function private.get_document_review_queue()
from public, anon, authenticated;
grant execute on function private.get_document_review_queue()
to authenticated;

create view public.v_document_review_queue
with (security_barrier = true, security_invoker = true)
as
select *
from private.get_document_review_queue();

revoke all on public.v_document_review_queue from public, anon;
grant select on public.v_document_review_queue to authenticated;

create view public.v_applicant_document_status
with (security_barrier = true, security_invoker = true)
as
with latest_documents as (
  select distinct on (document.applicant_id, document.document_type_id)
    document.applicant_id,
    document.document_type_id,
    document.status
  from public.documents as document
  order by
    document.applicant_id,
    document.document_type_id,
    document.version desc
),
summary as (
  select
    applicant.id as applicant_id,
    count(document_type.id)::integer as required_document_count,
    count(latest_documents.document_type_id)::integer as uploaded_required_count,
    count(*) filter (where latest_documents.status = 'VERIFIED')::integer
      as verified_required_count,
    count(*) filter (
      where latest_documents.status in ('REJECTED', 'FOR_RESUBMISSION')
    )::integer as resubmission_required_count,
    count(*) filter (where latest_documents.status = 'PENDING')::integer
      as pending_required_count
  from public.applicants as applicant
  left join public.document_types as document_type
    on document_type.is_required
  left join latest_documents
    on latest_documents.applicant_id = applicant.id
    and latest_documents.document_type_id = document_type.id
  group by applicant.id
)
select
  summary.applicant_id,
  case
    when summary.required_document_count = 0
      or summary.uploaded_required_count < summary.required_document_count
      then 'INCOMPLETE'::public.document_package_status
    when summary.resubmission_required_count > 0
      then 'NEEDS_RESUBMISSION'::public.document_package_status
    when summary.verified_required_count = summary.required_document_count
      then 'APPROVED'::public.document_package_status
    when summary.pending_required_count > 0
      then 'PENDING'::public.document_package_status
    else 'FOR_REVIEW'::public.document_package_status
  end as status,
  summary.required_document_count,
  summary.verified_required_count
from summary
where (select private.is_role('APPLICANT'::public.user_role))
  and (select private.owns_applicant(summary.applicant_id));

revoke all on public.v_applicant_document_status from public, anon;
grant select on public.v_applicant_document_status to authenticated;

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

  if not exists (
    select 1
    from public.document_types as required_type
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
      and latest_document.status is distinct from 'VERIFIED'::public.document_status
  ) then
    raise exception 'All required documents must be approved before applying.'
      using errcode = 'P0001';
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
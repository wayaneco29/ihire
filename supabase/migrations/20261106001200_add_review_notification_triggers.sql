create function public.handle_new_document_for_review()
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
    select
      profile.id,
      'DOCUMENT_FOR_REVIEW',
      'Document ready for review',
      'A supporting document is ready for evaluation.',
      '/evaluator/documents/' || new.id::text
    from public.profiles as profile
    where profile.role = 'EVALUATOR';
  end if;

  return new;
end;
$$;

create function public.notify_document_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  applicant_profile_id uuid;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select applicant.profile_id
  into applicant_profile_id
  from public.applicants as applicant
  where applicant.id = new.applicant_id;

  if applicant_profile_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      applicant_profile_id,
      'DOCUMENT_STATUS',
      'Document status updated',
      'A supporting document status changed to ' || new.status::text || '.',
      '/applicant/documents'
    );
  end if;

  return new;
end;
$$;

create function public.handle_document_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.documents
  set status = new.status
  where id = new.document_id;

  return new;
end;
$$;

create function public.handle_submitted_pds_version()
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
    profile.id,
    'PDS_FOR_REVIEW',
    'Updated PDS ready for review',
    'Applicant ' || applicant.applicant_number || ' submitted an updated PDS.',
    '/evaluator/applications/' || application.id::text
  from public.applications as application
  join public.applicants as applicant on applicant.id = application.applicant_id
  join public.profiles as profile on profile.role = 'EVALUATOR'
  where application.applicant_id = new.applicant_id
    and application.pds_version_id = new.id
    and application.status = 'UNDER_EVALUATION';

  return new;
end;
$$;

create function public.handle_application_evaluation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.applications
  set status = new.result::public.application_status
  where id = new.application_id
    and status not in ('HIRED', 'REJECTED');

  return new;
end;
$$;

create function public.handle_hiring_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.applications
  set status = new.decision::public.application_status
  where id = new.application_id;

  return new;
end;
$$;

create function public.notify_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  applicant_profile_id uuid;
  target_applicant_number text;
  target_job_title text;
  target_hr_id uuid;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select applicant.profile_id, applicant.applicant_number, job.title, job.hr_id
  into applicant_profile_id, target_applicant_number, target_job_title, target_hr_id
  from public.applicants as applicant
  join public.job_postings as job on job.id = new.job_id
  where applicant.id = new.applicant_id;

  if applicant_profile_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      applicant_profile_id,
      'APPLICATION_STATUS',
      'Application status updated',
      'Your application status changed to ' || new.status::text || '.',
      '/applicant/applications/' || new.id::text
    );
  end if;

  if new.status = 'QUALIFIED' and target_hr_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      target_hr_id,
      'APPLICANT_QUALIFIED',
      'Applicant qualified',
      'Applicant ' || target_applicant_number || ' qualified for ' || target_job_title || '.',
      '/hr/applications/' || new.id::text
    );
  end if;

  return new;
end;
$$;

create function public.notify_invitation_accepted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.accepted_at is null and new.accepted_at is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      new.invited_by,
      'INVITATION_ACCEPTED',
      'Invitation accepted',
      'An invited ' || new.role::text || ' account accepted the invitation.',
      '/admin/invitations'
    );
  end if;

  return new;
end;
$$;

create trigger pds_version_after_submit
after update of status on public.pds_versions
for each row
when (old.status is distinct from new.status)
execute function public.handle_submitted_pds_version();

create trigger document_after_insert_for_review
after insert on public.documents
for each row
execute function public.handle_new_document_for_review();

create trigger document_after_status_change
after update of status on public.documents
for each row
when (old.status is distinct from new.status)
execute function public.notify_document_status_change();

create trigger document_review_after_insert
after insert on public.document_reviews
for each row
execute function public.handle_document_review();

create trigger application_evaluation_after_insert
after insert on public.application_evaluations
for each row
execute function public.handle_application_evaluation();

create trigger hiring_decision_after_write
after insert or update on public.hiring_decisions
for each row
execute function public.handle_hiring_decision();

create trigger application_after_status_change
after update of status on public.applications
for each row
when (old.status is distinct from new.status)
execute function public.notify_application_status_change();

create trigger invitation_after_accept
after update of accepted_at on public.invitations
for each row
when (old.accepted_at is null and new.accepted_at is not null)
execute function public.notify_invitation_accepted();


revoke all on function public.handle_new_document_for_review() from public, anon;
revoke all on function public.notify_document_status_change() from public, anon;
revoke all on function public.handle_document_review() from public, anon;
revoke all on function public.handle_submitted_pds_version() from public, anon;
revoke all on function public.handle_application_evaluation() from public, anon;
revoke all on function public.handle_hiring_decision() from public, anon;
revoke all on function public.notify_application_status_change() from public, anon;
revoke all on function public.notify_invitation_accepted() from public, anon;

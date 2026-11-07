create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.profiles as profile
  where profile.id = (select auth.uid())
  limit 1
$$;

create function private.is_role(required_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_user_role() = required_role, false)
$$;

create function private.owns_applicant(target_applicant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.applicants as applicant
    where applicant.id = target_applicant_id
      and applicant.profile_id = (select auth.uid())
  )
$$;

create function private.owns_pds_version(target_pds_version_id uuid, draft_only boolean default false)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.pds_versions as pds
    join public.applicants as applicant on applicant.id = pds.applicant_id
    where pds.id = target_pds_version_id
      and applicant.profile_id = (select auth.uid())
      and (not draft_only or pds.status = 'DRAFT')
  )
$$;

create function private.owns_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.applications as application
    join public.applicants as applicant on applicant.id = application.applicant_id
    where application.id = target_application_id
      and applicant.profile_id = (select auth.uid())
  )
$$;

create function private.hr_owns_job(target_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.job_postings as job
    where job.id = target_job_id
      and job.hr_id = (select auth.uid())
  )
$$;

create function private.hr_owns_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.applications as application
    join public.job_postings as job on job.id = application.job_id
    where application.id = target_application_id
      and job.hr_id = (select auth.uid())
  )
$$;

create function private.hr_owns_applicant(target_applicant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.applications as application
    join public.job_postings as job on job.id = application.job_id
    where application.applicant_id = target_applicant_id
      and job.hr_id = (select auth.uid())
  )
$$;

create function private.owns_document(target_document_id uuid)
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
    where document.id = target_document_id
      and applicant.profile_id = (select auth.uid())
  )
$$;

create function private.hr_owns_document(target_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.documents as document
    join public.applications as application on application.applicant_id = document.applicant_id
    join public.job_postings as job on job.id = application.job_id
    where document.id = target_document_id
      and job.hr_id = (select auth.uid())
  )
$$;

revoke all on function private.current_user_role() from public, anon;
revoke all on function private.is_role(public.user_role) from public, anon;
revoke all on function private.owns_applicant(uuid) from public, anon;
revoke all on function private.owns_pds_version(uuid, boolean) from public, anon;
revoke all on function private.owns_application(uuid) from public, anon;
revoke all on function private.hr_owns_job(uuid) from public, anon;
revoke all on function private.hr_owns_application(uuid) from public, anon;
revoke all on function private.hr_owns_applicant(uuid) from public, anon;
revoke all on function private.owns_document(uuid) from public, anon;
revoke all on function private.hr_owns_document(uuid) from public, anon;

grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_role(public.user_role) to authenticated;
grant execute on function private.owns_applicant(uuid) to authenticated;
grant execute on function private.owns_pds_version(uuid, boolean) to authenticated;
grant execute on function private.owns_application(uuid) to authenticated;
grant execute on function private.hr_owns_job(uuid) to authenticated;
grant execute on function private.hr_owns_application(uuid) to authenticated;
grant execute on function private.hr_owns_applicant(uuid) to authenticated;
grant execute on function private.owns_document(uuid) to authenticated;
grant execute on function private.hr_owns_document(uuid) to authenticated;

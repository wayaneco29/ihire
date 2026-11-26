-- Promote ADMIN to SUPER_ADMIN, add hiring/view roles, and expose names only to
-- the designated hiring staff. Evaluator views remain anonymized.
alter table public.profiles
  add column phone_number text,
  add column phone_verified_at timestamptz;

drop index if exists public.profiles_single_admin_idx;

update public.profiles set role = 'SUPER_ADMIN'::public.user_role where role = 'ADMIN'::public.user_role;

create or replace function private.is_role(required_role public.user_role)
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    private.current_user_role() = required_role
    or (required_role = 'ADMIN'::public.user_role and private.current_user_role() = 'SUPER_ADMIN'::public.user_role),
    false
  )
$$;

create or replace view private.authorized_anonymized_applications
with (security_barrier = true) as
select application.id as application_id, application.job_id, application.status as application_status,
  application.applied_at, applicant.applicant_number, application.pds_version_id,
  application.applicant_id
from public.applications application
join public.job_postings job on job.id = application.job_id
join public.applicants applicant on applicant.id = application.applicant_id
join public.pds_versions pds on pds.id = application.pds_version_id
where pds.status = 'SUBMITTED'
  and (((select private.is_role('EVALUATOR'::public.user_role))
      and application.assigned_evaluator_id = (select auth.uid()))
    or ((select private.is_role('HR'::public.user_role)) and job.hr_id = (select auth.uid()))
    or (select private.is_role('SDS'::public.user_role))
    or (select private.is_role('ASDS'::public.user_role)));

alter table public.invitations drop constraint if exists invitations_role_check;
update public.invitations set role = 'SUPER_ADMIN' where role = 'ADMIN';
alter table public.invitations add constraint invitations_role_check
  check (role in ('HR', 'EVALUATOR', 'DOCUMENT_REVIEWER', 'SDS', 'ASDS', 'SUPER_ADMIN'));

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare assigned_role public.user_role;
begin
  assigned_role := case new.raw_app_meta_data ->> 'role'
    when 'HR' then 'HR'::public.user_role
    when 'EVALUATOR' then 'EVALUATOR'::public.user_role
    when 'DOCUMENT_REVIEWER' then 'DOCUMENT_REVIEWER'::public.user_role
    when 'SDS' then 'SDS'::public.user_role
    when 'ASDS' then 'ASDS'::public.user_role
    when 'SUPER_ADMIN' then 'SUPER_ADMIN'::public.user_role
    when 'ADMIN' then 'SUPER_ADMIN'::public.user_role
    when 'APPLICANT' then 'APPLICANT'::public.user_role
    else null
  end;

  if assigned_role is null then
    raise exception 'Accounts must be created through an approved invitation or verified applicant signup.' using errcode = '42501';
  end if;
  if assigned_role = 'APPLICANT'::public.user_role and (
    new.raw_app_meta_data ->> 'phone_verified' is distinct from 'true'
    or coalesce(new.raw_app_meta_data ->> 'phone_number', '') !~ '^[+]639[0-9]{9}$'
  ) then
    raise exception 'Applicants must verify a Philippine mobile number before account creation.' using errcode = '42501';
  end if;

  insert into public.profiles (id, role, email, phone_number, phone_verified_at)
  values (
    new.id, assigned_role, new.email,
    case when assigned_role = 'APPLICANT'::public.user_role then new.raw_app_meta_data ->> 'phone_number' else null end,
    case when assigned_role = 'APPLICANT'::public.user_role then now() else null end
  );
  if assigned_role = 'APPLICANT'::public.user_role then
    insert into public.applicants (profile_id) values (new.id);
  end if;
  return new;
end;
$$;

create or replace function public.sync_profile_role_from_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare assigned_role public.user_role;
begin
  assigned_role := case new.raw_app_meta_data ->> 'role'
    when 'HR' then 'HR'::public.user_role
    when 'EVALUATOR' then 'EVALUATOR'::public.user_role
    when 'DOCUMENT_REVIEWER' then 'DOCUMENT_REVIEWER'::public.user_role
    when 'SDS' then 'SDS'::public.user_role
    when 'ASDS' then 'ASDS'::public.user_role
    when 'SUPER_ADMIN' then 'SUPER_ADMIN'::public.user_role
    when 'ADMIN' then 'SUPER_ADMIN'::public.user_role
    when 'APPLICANT' then 'APPLICANT'::public.user_role
    else null
  end;
  if assigned_role is null then return new; end if;
  update public.profiles
  set role = assigned_role,
      phone_number = case when assigned_role = 'APPLICANT'::public.user_role then new.raw_app_meta_data ->> 'phone_number' else phone_number end,
      phone_verified_at = case when assigned_role = 'APPLICANT'::public.user_role and new.raw_app_meta_data ->> 'phone_verified' = 'true' then coalesce(phone_verified_at, now()) else phone_verified_at end
  where id = new.id;
  if assigned_role = 'APPLICANT'::public.user_role then
    insert into public.applicants (profile_id) values (new.id) on conflict (profile_id) do nothing;
  else
    delete from public.applicants applicant where applicant.profile_id = new.id
      and not exists (select 1 from public.pds_versions pds where pds.applicant_id = applicant.id)
      and not exists (select 1 from public.documents document where document.applicant_id = applicant.id)
      and not exists (select 1 from public.applications application where application.applicant_id = applicant.id);
  end if;
  return new;
end;
$$;

-- Run only after the compatibility mapper is installed so legacy ADMIN
-- metadata is normalized to SUPER_ADMIN instead of resetting profiles.
update auth.users
set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'::jsonb), '{role}', '"SUPER_ADMIN"'::jsonb, true)
where raw_app_meta_data ->> 'role' = 'ADMIN';

create or replace view private.authorized_staff_applications
with (security_barrier = true) as
select application.id as application_id, application.job_id, application.applicant_id,
  application.pds_version_id, application.status as application_status, application.applied_at,
  applicant.applicant_number, job.title as job_title, job.hr_id,
  position.title as position_title,
  concat_ws(' ', personal.first_name, nullif(personal.middle_name, ''), personal.surname, nullif(personal.name_extension, '')) as applicant_name
from public.applications application
join public.applicants applicant on applicant.id = application.applicant_id
join public.pds_versions pds on pds.id = application.pds_version_id and pds.status = 'SUBMITTED'
join public.pds_personal_info personal on personal.pds_version_id = pds.id
join public.job_postings job on job.id = application.job_id
left join public.applications app_position on app_position.id = application.id
left join public.positions position on position.id = app_position.position_id
where ((select private.is_role('HR'::public.user_role)) and job.hr_id = (select auth.uid()))
   or (select private.is_role('SDS'::public.user_role))
   or (select private.is_role('ASDS'::public.user_role));

revoke all on private.authorized_staff_applications from public, anon, authenticated;
create or replace view public.v_staff_application_reviews
with (security_barrier = true) as
select application_id, job_id, applicant_id, pds_version_id, application_status,
  applied_at, applicant_number, job_title, position_title, applicant_name
from private.authorized_staff_applications;
revoke all on public.v_staff_application_reviews from public, anon;
grant select on public.v_staff_application_reviews to authenticated;

alter table public.hiring_decisions
  add column decision_remarks text not null default 'Legacy hiring decision';

drop function if exists public.hire_qualified_applicant(uuid);
create function public.hire_qualified_applicant(p_application_id uuid, p_remarks text)
returns text language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_job_id uuid; target_slots integer;
  current_status public.application_status; hired_count integer := 0; filled_last_slot boolean := false;
begin
  if actor_id is null or not (select private.is_role('SDS'::public.user_role)) then
    raise exception 'SDS access is required.' using errcode = '42501';
  end if;
  if nullif(btrim(p_remarks), '') is null or length(btrim(p_remarks)) > 2000 then
    raise exception 'Hiring remarks are required and must be 2,000 characters or fewer.' using errcode = '22023';
  end if;
  select application.job_id into target_job_id from public.applications application where application.id = p_application_id;
  if target_job_id is null then raise exception 'The application is no longer available.' using errcode = 'P0002'; end if;
  select job.slots into target_slots from public.job_postings job where job.id = target_job_id for update;
  select application.status into current_status from public.applications application
    where application.id = p_application_id and application.job_id = target_job_id for update;
  if current_status is distinct from 'QUALIFIED'::public.application_status then
    raise exception 'Only qualified applicants can be hired.' using errcode = '23514';
  end if;
  select count(*)::integer into hired_count from public.applications application
    where application.job_id = target_job_id and application.status = 'HIRED';
  if hired_count >= target_slots then raise exception 'All available slots have already been filled.' using errcode = '23514'; end if;
  insert into public.hiring_decisions (application_id, hr_id, decision, decision_remarks)
  values (p_application_id, actor_id, 'HIRED', btrim(p_remarks));
  update public.applications set status = 'HIRED'::public.application_status where id = p_application_id;
  if hired_count + 1 >= target_slots then
    filled_last_slot := true;
    update public.job_postings set status = 'CLOSED', updated_at = now() where id = target_job_id and status = 'OPEN';
    update public.applications set status = 'NOT_SELECTED'::public.application_status
      where job_id = target_job_id and status = 'QUALIFIED'::public.application_status and id <> p_application_id;
  end if;
  return case when filled_last_slot then 'HIRED_AND_FILLED_SLOTS' else 'HIRED' end;
end;
$$;
revoke all on function public.hire_qualified_applicant(uuid, text) from public, anon;
grant execute on function public.hire_qualified_applicant(uuid, text) to authenticated;

create or replace function public.record_hr_hiring_decision(target_application_id uuid, target_decision text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Only the School Division Superintendent can record a hiring decision.' using errcode = '42501';
end;
$$;
revoke all on function public.record_hr_hiring_decision(uuid, text) from public, anon, authenticated;

notify pgrst, 'reload schema';

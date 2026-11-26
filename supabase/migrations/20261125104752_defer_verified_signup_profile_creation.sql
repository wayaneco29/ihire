create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare assigned_role public.user_role; current_auth_user auth.users%rowtype;
begin
  select * into current_auth_user from auth.users where id = new.id;
  if not found then return new; end if;
  assigned_role := case current_auth_user.raw_app_meta_data ->> 'role'
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
    current_auth_user.raw_app_meta_data ->> 'phone_verified' is distinct from 'true'
    or coalesce(current_auth_user.raw_app_meta_data ->> 'phone_number', '') !~ '^[+]639[0-9]{9}$'
  ) then
    raise exception 'Applicants must verify a Philippine mobile number before account creation.' using errcode = '42501';
  end if;

  insert into public.profiles (id, role, email, phone_number, phone_verified_at)
  values (
    new.id, assigned_role, current_auth_user.email,
    case when assigned_role = 'APPLICANT'::public.user_role then current_auth_user.raw_app_meta_data ->> 'phone_number' else null end,
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
  -- Initial creation is handled by the deferred insert trigger.
  if not exists (select 1 from public.profiles where id = new.id) then return new; end if;
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

-- Auth admin creation inserts the user before updating app_metadata in the
-- same transaction. Validate the final stored metadata at transaction end.
drop trigger on_auth_user_created on auth.users;
create constraint trigger on_auth_user_created
  after insert on auth.users
  deferrable initially deferred
  for each row execute function public.handle_new_auth_user();

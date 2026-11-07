create function public.sync_profile_role_from_auth_user()
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

revoke all on function public.sync_profile_role_from_auth_user() from public;

create trigger on_auth_app_metadata_updated
after update of raw_app_meta_data on auth.users
for each row
when (old.raw_app_meta_data is distinct from new.raw_app_meta_data)
execute function public.sync_profile_role_from_auth_user();

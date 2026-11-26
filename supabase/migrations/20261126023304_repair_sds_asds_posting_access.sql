-- Keep the database role used by RLS aligned with the server-managed role in
-- auth metadata for existing SDS/ASDS accounts.
update public.profiles as profile
set role = (auth_user.raw_app_meta_data ->> 'role')::public.user_role
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.raw_app_meta_data ->> 'role' in ('SDS', 'ASDS')
  and profile.role is distinct from
    (auth_user.raw_app_meta_data ->> 'role')::public.user_role;

-- Recreate the staff read policies so this migration also repairs a project
-- where the earlier workflow migration was only partially applied.
drop policy if exists job_postings_read_sds_asds on public.job_postings;
create policy job_postings_read_sds_asds
on public.job_postings for select to authenticated
using (
  (select private.is_role('SDS'::public.user_role))
  or (select private.is_role('ASDS'::public.user_role))
);

drop policy if exists job_posting_positions_read_sds_asds
  on public.job_posting_positions;
create policy job_posting_positions_read_sds_asds
on public.job_posting_positions for select to authenticated
using (
  (select private.is_role('SDS'::public.user_role))
  or (select private.is_role('ASDS'::public.user_role))
);

notify pgrst, 'reload schema';

-- Reassert the staff application view after earlier migrations may already
-- have been applied with SDS-only access. ASDS can inspect the same records
-- while hiring actions remain restricted to SDS.
update public.profiles as profile
set role = (auth_user.raw_app_meta_data ->> 'role')::public.user_role
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.raw_app_meta_data ->> 'role' in ('SDS', 'ASDS')
  and profile.role is distinct from
    (auth_user.raw_app_meta_data ->> 'role')::public.user_role;

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

create or replace view private.authorized_staff_applications
with (security_barrier = true) as
select application.id as application_id,
  application.job_id,
  application.applicant_id,
  application.pds_version_id,
  application.status as application_status,
  application.applied_at,
  applicant.applicant_number,
  job.title as job_title,
  job.hr_id,
  position.title as position_title,
  concat_ws(
    ' ',
    personal.first_name,
    nullif(personal.middle_name, ''),
    personal.surname,
    nullif(personal.name_extension, '')
  ) as applicant_name
from public.applications as application
join public.applicants as applicant
  on applicant.id = application.applicant_id
join public.pds_versions as pds
  on pds.id = application.pds_version_id
  and pds.status = 'SUBMITTED'
join public.pds_personal_info as personal
  on personal.pds_version_id = pds.id
join public.job_postings as job
  on job.id = application.job_id
left join public.positions as position
  on position.id = application.position_id
where (
  ((select private.is_role('HR'::public.user_role))
    and job.hr_id = (select auth.uid()))
  or (select private.is_role('SDS'::public.user_role))
  or (select private.is_role('ASDS'::public.user_role))
);

revoke all on private.authorized_staff_applications
  from public, anon, authenticated;

create or replace view public.v_staff_application_reviews
with (security_barrier = true) as
select application_id,
  job_id,
  applicant_id,
  pds_version_id,
  application_status,
  applied_at,
  applicant_number,
  job_title,
  position_title,
  applicant_name
from private.authorized_staff_applications;

revoke all on public.v_staff_application_reviews from public, anon;
grant select on public.v_staff_application_reviews to authenticated;

drop policy if exists applications_read_by_superintendent
  on public.applications;
create policy applications_read_by_superintendent
on public.applications for select to authenticated
using (
  (select private.is_role('SDS'::public.user_role))
  or (select private.is_role('ASDS'::public.user_role))
);

drop policy if exists application_criterion_scores_read_by_superintendent
  on public.application_criterion_scores;
create policy application_criterion_scores_read_by_superintendent
on public.application_criterion_scores for select to authenticated
using (
  (select private.is_role('SDS'::public.user_role))
  or (select private.is_role('ASDS'::public.user_role))
);

revoke all on public.v_staff_application_scores from public, anon;
grant select on public.v_staff_application_scores to authenticated;

notify pgrst, 'reload schema';

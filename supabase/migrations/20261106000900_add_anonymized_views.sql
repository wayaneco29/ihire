create view private.authorized_anonymized_applications
with (security_barrier = true)
as
select
  application.id as application_id,
  application.job_id,
  application.status as application_status,
  application.applied_at,
  applicant.applicant_number,
  application.pds_version_id
from public.applications as application
join public.job_postings as job on job.id = application.job_id
join public.applicants as applicant on applicant.id = application.applicant_id
join public.pds_versions as pds on pds.id = application.pds_version_id
where pds.status = 'SUBMITTED'
  and (
    (select private.is_role('EVALUATOR'::public.user_role))
    or (
      (select private.is_role('HR'::public.user_role))
      and job.hr_id = (select auth.uid())
    )
  );

revoke all on private.authorized_anonymized_applications from public, anon, authenticated;

create view public.v_anonymized_applicants
with (security_barrier = true)
as
select
  authorized.application_id,
  authorized.job_id,
  authorized.application_status,
  authorized.applied_at,
  authorized.applicant_number,
  coalesce(
    (
      select array_agg(distinct education.level::text order by education.level::text)
      from public.pds_education as education
      where education.pds_version_id = authorized.pds_version_id
    ),
    array[]::text[]
  ) as education_levels,
  coalesce(
    (
      select round(
        sum((coalesce(work.date_to, current_date) - work.date_from)::numeric / 365.25),
        2
      )
      from public.pds_work_experience as work
      where work.pds_version_id = authorized.pds_version_id
    ),
    0
  ) as experience_years,
  coalesce(
    (
      select sum(learning.hours)
      from public.pds_learning_development as learning
      where learning.pds_version_id = authorized.pds_version_id
    ),
    0
  ) as training_hours,
  coalesce(
    (
      select array_agg(distinct other_info.description order by other_info.description)
      from public.pds_other_info as other_info
      where other_info.pds_version_id = authorized.pds_version_id
        and other_info.category = 'SKILL_HOBBY'
    ),
    array[]::text[]
  ) as skills
from private.authorized_anonymized_applications as authorized;

create view public.v_anonymized_credibility
with (security_barrier = true)
as
select
  application_id,
  job_id,
  applicant_number,
  education_levels,
  experience_years,
  training_hours,
  skills
from public.v_anonymized_applicants;

create view public.v_anonymized_questionnaire
with (security_barrier = true)
as
select
  authorized.application_id,
  authorized.job_id,
  authorized.applicant_number,
  questionnaire.question_code,
  questionnaire.answer
from private.authorized_anonymized_applications as authorized
join public.pds_questionnaire as questionnaire
  on questionnaire.pds_version_id = authorized.pds_version_id;

revoke all on public.v_anonymized_applicants from public, anon;
revoke all on public.v_anonymized_credibility from public, anon;
revoke all on public.v_anonymized_questionnaire from public, anon;
grant select on public.v_anonymized_applicants to authenticated;
grant select on public.v_anonymized_credibility to authenticated;
grant select on public.v_anonymized_questionnaire to authenticated;

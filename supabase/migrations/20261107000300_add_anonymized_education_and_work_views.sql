create view public.v_anonymized_education
with (security_barrier = true)
as
select
  authorized.application_id,
  education.id as education_id,
  education.level::text as level,
  education.school_name,
  education.degree_course,
  education.period_from,
  education.period_to,
  education.highest_level_units_earned,
  education.year_graduated,
  education.honors_received,
  education.sort_order
from private.authorized_anonymized_applications as authorized
join public.pds_education as education
  on education.pds_version_id = authorized.pds_version_id;

create view public.v_anonymized_work_experience
with (security_barrier = true)
as
select
  authorized.application_id,
  experience.id as experience_id,
  experience.date_from,
  experience.date_to,
  experience.position_title,
  experience.agency_company,
  experience.appointment_status,
  experience.is_gov_service,
  experience.duties_description,
  experience.sort_order
from private.authorized_anonymized_applications as authorized
join public.pds_work_experience as experience
  on experience.pds_version_id = authorized.pds_version_id;

revoke all on public.v_anonymized_education from public, anon;
revoke all on public.v_anonymized_work_experience from public, anon;
grant select on public.v_anonymized_education to authenticated;
grant select on public.v_anonymized_work_experience to authenticated;

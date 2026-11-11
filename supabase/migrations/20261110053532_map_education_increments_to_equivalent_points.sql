create or replace function public.education_equivalent_points(
  p_position_id uuid,
  p_applicant_level integer,
  p_maximum_points numeric
)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when position.base_qualification_level is null
      or p_applicant_level is null
      or p_applicant_level not between 1 and 31
      or p_maximum_points is null
      or p_maximum_points < 0
      then null
    else round(
      p_maximum_points * case
        when p_applicant_level - position.base_qualification_level >= 10 then 1
        when p_applicant_level - position.base_qualification_level between 8 and 9 then 0.8
        when p_applicant_level - position.base_qualification_level between 6 and 7 then 0.6
        when p_applicant_level - position.base_qualification_level between 4 and 5 then 0.4
        when p_applicant_level - position.base_qualification_level between 2 and 3 then 0.2
        else 0
      end
    )::integer
  end
  from public.positions as position
  where position.id = p_position_id;
$$;

revoke all on function public.education_equivalent_points(uuid, integer, numeric)
  from public, anon;
grant execute on function public.education_equivalent_points(uuid, integer, numeric)
  to authenticated, service_role;

create or replace function public.education_points(
  p_position_id uuid,
  p_applicant_level integer
)
returns integer
language sql
stable
set search_path = ''
as $$
  select public.education_equivalent_points(
    p_position_id,
    p_applicant_level,
    10
  );
$$;

create or replace view public.v_anonymized_application_education_points
with (security_barrier = true)
as
select
  authorized.application_id,
  applicant_education.qualification_level as applicant_qualification_level,
  position.base_qualification_level,
  public.education_equivalent_points(
    position.id,
    applicant_education.qualification_level,
    education_weight.points
  ) as education_points
from private.authorized_anonymized_applications as authorized
join public.applications as application
  on application.id = authorized.application_id
left join public.positions as position
  on position.id = application.position_id
left join public.job_posting_positions as posting_position
  on posting_position.job_id = application.job_id
  and posting_position.position_id = application.position_id
left join lateral (
  select weights.points
  from public.position_criterion_weights as weights
  join public.position_criteria as criterion
    on criterion.id = weights.criterion_id
  where weights.profile_id = posting_position.weight_profile_id
    and criterion.criterion_key = 'EDUCATION'
  limit 1
) as education_weight on true
left join lateral (
  select max(education.qualification_level) as qualification_level
  from public.pds_education as education
  where education.pds_version_id = authorized.pds_version_id
) as applicant_education on true;
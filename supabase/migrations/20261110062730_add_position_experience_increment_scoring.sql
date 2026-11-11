alter table public.positions
  add column if not exists base_experience_increment_level smallint null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'positions_base_experience_increment_level_check'
      and conrelid = 'public.positions'::regclass
  ) then
    alter table public.positions
      add constraint positions_base_experience_increment_level_check
      check (
        base_experience_increment_level between 1 and 31
        or base_experience_increment_level is null
      );
  end if;
end
$$;

grant update (base_experience_increment_level)
  on public.positions to authenticated;

create or replace function public.experience_equivalent_points(
  p_position_id uuid,
  p_applicant_level integer,
  p_maximum_points numeric
)
returns numeric
language sql
stable
set search_path = ''
as $$
  select case
    when position.base_experience_increment_level is null
      or p_applicant_level is null
      or p_applicant_level not between 1 and 31
      or p_maximum_points is null
      or p_maximum_points < 0
      then null
    else round(
      p_maximum_points * case
        when p_applicant_level - position.base_experience_increment_level >= 10
          then 1
        when p_applicant_level - position.base_experience_increment_level between 8 and 9
          then 0.8
        when p_applicant_level - position.base_experience_increment_level between 6 and 7
          then 0.6
        when p_applicant_level - position.base_experience_increment_level between 4 and 5
          then 0.4
        when p_applicant_level - position.base_experience_increment_level between 2 and 3
          then 0.2
        else 0
      end,
      2
    )
  end
  from public.positions as position
  where position.id = p_position_id;
$$;

revoke all on function public.experience_equivalent_points(uuid, integer, numeric)
  from public, anon;
grant execute on function public.experience_equivalent_points(uuid, integer, numeric)
  to authenticated, service_role;

create or replace view public.v_anonymized_application_experience_standards
with (security_barrier = true)
as
select
  authorized.application_id,
  position.id as position_id,
  position.base_experience_increment_level
    as minimum_experience_increment_level,
  experience_weight.points as maximum_experience_points
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
    and criterion.criterion_key = 'EXPERIENCE'
  limit 1
) as experience_weight on true;

revoke all on public.v_anonymized_application_experience_standards
  from public, anon;
grant select on public.v_anonymized_application_experience_standards
  to authenticated;
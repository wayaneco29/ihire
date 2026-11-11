alter table public.positions
  add column if not exists base_training_increment_level smallint null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'positions_base_training_increment_level_check'
      and conrelid = 'public.positions'::regclass
  ) then
    alter table public.positions
      add constraint positions_base_training_increment_level_check
      check (
        base_training_increment_level between 1 and 31
        or base_training_increment_level is null
      );
  end if;
end
$$;

grant update (base_training_increment_level) on public.positions to authenticated;

create or replace function public.training_equivalent_points(
  p_position_id uuid,
  p_training_hours numeric,
  p_maximum_points numeric
)
returns numeric
language sql
stable
set search_path = ''
as $$
  select case
    when position.base_training_increment_level is null
      or p_training_hours is null
      or p_training_hours < 0
      or p_maximum_points is null
      or p_maximum_points < 0
      then null
    else round(
      p_maximum_points * case
        when (
          case
            when p_training_hours >= 240 then 31
            else floor(p_training_hours / 8)::integer + 1
          end
        )
          - position.base_training_increment_level >= 10 then 1
        when (
          case
            when p_training_hours >= 240 then 31
            else floor(p_training_hours / 8)::integer + 1
          end
        )
          - position.base_training_increment_level between 8 and 9 then 0.8
        when (
          case
            when p_training_hours >= 240 then 31
            else floor(p_training_hours / 8)::integer + 1
          end
        )
          - position.base_training_increment_level between 6 and 7 then 0.6
        when (
          case
            when p_training_hours >= 240 then 31
            else floor(p_training_hours / 8)::integer + 1
          end
        )
          - position.base_training_increment_level between 4 and 5 then 0.4
        when (
          case
            when p_training_hours >= 240 then 31
            else floor(p_training_hours / 8)::integer + 1
          end
        )
          - position.base_training_increment_level between 2 and 3 then 0.2
        else 0
      end,
      2
    )
  end
  from public.positions as position
  where position.id = p_position_id;
$$;

revoke all on function public.training_equivalent_points(uuid, numeric, numeric)
  from public, anon;
grant execute on function public.training_equivalent_points(uuid, numeric, numeric)
  to authenticated, service_role;

create or replace view public.v_anonymized_application_training_points
with (security_barrier = true)
as
select
  authorized.application_id,
  applicant_data.training_hours,
  training_weight.points as maximum_training_points,
  position.base_training_increment_level as minimum_training_increment_level,
  case
    when applicant_data.training_hours is null
      or applicant_data.training_hours < 0 then null
    when applicant_data.training_hours >= 240 then 31
    else least(
      31, floor(applicant_data.training_hours / 8)::integer + 1
    )::integer
  end as applicant_training_increment_level,
  public.training_equivalent_points(
    position.id,
    applicant_data.training_hours,
    training_weight.points
  ) as training_points
from private.authorized_anonymized_applications as authorized
join public.applications as application
  on application.id = authorized.application_id
left join public.v_anonymized_applicants as applicant_data
  on applicant_data.application_id = authorized.application_id
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
    and criterion.criterion_key = 'TRAINING'
  limit 1
) as training_weight on true;

revoke all on public.v_anonymized_application_training_points from public, anon;
grant select on public.v_anonymized_application_training_points to authenticated;
create or replace function public.save_application_criterion_score(
  p_application_id uuid,
  p_criterion_id uuid,
  p_points numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job_id uuid;
  target_position_id uuid;
  target_status public.application_status;
  target_maximum_points numeric(5, 2);
begin
  if not (select private.is_role('EVALUATOR'::public.user_role)) then
    raise exception 'Evaluator access is required.' using errcode = '42501';
  end if;

  select application.job_id, application.position_id, application.status
  into target_job_id, target_position_id, target_status
  from public.applications as application
  where application.id = p_application_id
    and application.assigned_evaluator_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'This application is no longer assigned to you.' using errcode = '42501';
  end if;
  if target_status in ('HIRED', 'REJECTED') then
    raise exception 'This application already has a final hiring decision.' using errcode = '22023';
  end if;
  if target_position_id is null then
    raise exception 'A position must be selected before criterion scores can be entered.' using errcode = '22023';
  end if;

  select weight.points
  into target_maximum_points
  from public.job_posting_positions as job_position
  join public.position_criterion_weights as weight
    on weight.profile_id = job_position.weight_profile_id
  join public.position_criteria as criterion
    on criterion.id = weight.criterion_id
  where job_position.job_id = target_job_id
    and job_position.position_id = target_position_id
    and criterion.id = p_criterion_id
    and criterion.position_id = target_position_id
    and criterion.criterion_key in ('CLASSROOM_OBSERVATION', 'TEACHER_REFLECTION');

  if target_maximum_points is null then
    raise exception 'Only configured teaching assessment scores can be entered here.' using errcode = '22023';
  end if;
  if p_points is null
    or p_points < 0
    or p_points > target_maximum_points
    or abs(p_points * 100 - round(p_points * 100)) >= 0.00000001
  then
    raise exception 'The score is outside the configured criterion maximum.' using errcode = '22023';
  end if;

  insert into public.application_criterion_scores (
    application_id, criterion_id, evaluator_id, points, updated_at
  )
  values (
    p_application_id, p_criterion_id, (select auth.uid()), p_points, now()
  )
  on conflict (application_id, criterion_id)
  do update set
    evaluator_id = excluded.evaluator_id,
    points = excluded.points,
    updated_at = excluded.updated_at;
end;
$$;

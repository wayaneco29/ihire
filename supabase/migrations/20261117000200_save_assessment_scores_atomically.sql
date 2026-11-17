drop function if exists public.save_application_criterion_score(uuid, uuid, numeric);

create function public.save_application_assessment_scores(
  p_application_id uuid,
  p_scores jsonb
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
  score_ids uuid[];
  score_values numeric[];
  score_count integer;
  maximum_points numeric(5, 2);
  score_index integer;
begin
  if not (select private.is_role('EVALUATOR'::public.user_role)) then
    raise exception 'Evaluator access is required.' using errcode = '42501';
  end if;

  select
    array_agg((score.value ->> 'criterion_id')::uuid order by score.ordinality),
    array_agg((score.value ->> 'points')::numeric order by score.ordinality),
    count(*)::integer
  into score_ids, score_values, score_count
  from jsonb_array_elements(p_scores) with ordinality as score(value, ordinality);

  if score_count <> 2
    or array_length(score_ids, 1) <> 2
    or score_ids[1] = score_ids[2]
    or score_values[1] is null
    or score_values[2] is null
  then
    raise exception 'Submit both teaching assessment scores.' using errcode = '22023';
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

  for score_index in 1..2 loop
    select weight.points into maximum_points
    from public.job_posting_positions as job_position
    join public.position_criterion_weights as weight
      on weight.profile_id = job_position.weight_profile_id
    join public.position_criteria as criterion
      on criterion.id = weight.criterion_id
    where job_position.job_id = target_job_id
      and job_position.position_id = target_position_id
      and criterion.id = score_ids[score_index]
      and criterion.position_id = target_position_id
      and criterion.criterion_key in ('CLASSROOM_OBSERVATION', 'TEACHER_REFLECTION');

    if maximum_points is null then
      raise exception 'Both configured teaching assessment criteria are required.' using errcode = '22023';
    end if;
    if score_values[score_index] < 0
      or score_values[score_index] > maximum_points
      or abs(score_values[score_index] * 100 - round(score_values[score_index] * 100)) >= 0.00000001
    then
      raise exception 'The score is outside the configured criterion maximum.' using errcode = '22023';
    end if;
  end loop;

  insert into public.application_criterion_scores (
    application_id, criterion_id, evaluator_id, points, updated_at
  )
  select p_application_id, score_ids[index], (select auth.uid()), score_values[index], now()
  from generate_subscripts(score_ids, 1) as s(index)
  on conflict (application_id, criterion_id)
  do update set
    evaluator_id = excluded.evaluator_id,
    points = excluded.points,
    updated_at = excluded.updated_at;

  -- Mark the application as ready for HR only after both scores have been
  -- validated and saved. The status trigger notifies the assigned HR user.
  update public.applications
  set status = 'QUALIFIED'::public.application_status
  where id = p_application_id
    and status <> 'QUALIFIED'::public.application_status;
end;
$$;

revoke all on function public.save_application_assessment_scores(uuid, jsonb)
  from public, anon;
grant execute on function public.save_application_assessment_scores(uuid, jsonb)
  to authenticated;

-- HR reviews applicants from the posting roster, so send the notification to
-- that existing page instead of the unsupported /hr/applications/[id] route.
create or replace function public.notify_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  applicant_profile_id uuid;
  target_applicant_number text;
  target_job_title text;
  target_job_id uuid;
  target_hr_id uuid;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select applicant.profile_id, applicant.applicant_number, job.title, job.id, job.hr_id
  into applicant_profile_id, target_applicant_number, target_job_title, target_job_id, target_hr_id
  from public.applicants as applicant
  join public.job_postings as job on job.id = new.job_id
  where applicant.id = new.applicant_id;

  if applicant_profile_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      applicant_profile_id,
      'APPLICATION_STATUS',
      'Application status updated',
      'Your application status changed to ' || new.status::text || '.',
      '/applicant/applications/' || new.id::text
    );
  end if;

  if new.status = 'QUALIFIED' and target_hr_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      target_hr_id,
      'APPLICANT_QUALIFIED',
      'Applicant qualified',
      'Applicant ' || target_applicant_number || ' qualified for ' || target_job_title || '.',
      '/hr/postings/' || target_job_id::text
    );
  end if;

  return new;
end;
$$;

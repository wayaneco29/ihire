create or replace function public.save_application_assessment_scores(
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
  if target_status <> 'ASSESSMENT_SCHEDULED' then
    raise exception 'Only scheduled assessments can be scored.' using errcode = '22023';
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

  -- Mark the assessment scored only after both scores have been validated and saved.
  update public.applications
  set status = 'ASSESSMENT_SCORED'::public.application_status
  where id = p_application_id
    and status = 'ASSESSMENT_SCHEDULED'::public.application_status;
end;
$$;

-- The existing evaluation trigger remains in place. The application action
-- requires scored teaching assessments before it inserts a decision.
create view public.v_evaluator_review_queue_with_scored
with (security_barrier = true)
as
select
  queue.application_id,
  queue.applicant_number,
  queue.application_status,
  queue.applied_at,
  queue.job_id,
  queue.job_title,
  queue.position_title,
  queue.position_track,
  queue.review_kind
from public.v_evaluator_review_queue as queue
union all
select
  applicant.application_id,
  applicant.applicant_number,
  applicant.application_status,
  applicant.applied_at,
  applicant.job_id,
  job.title as job_title,
  applicant.position_title,
  applicant.position_track,
  'ASSESSMENT'::text as review_kind
from public.v_anonymized_applicants as applicant
join public.job_postings as job on job.id = applicant.job_id
where (select private.is_role('EVALUATOR'::public.user_role))
  and applicant.application_status = 'ASSESSMENT_SCORED';

revoke all on public.v_evaluator_review_queue_with_scored
  from public, anon, authenticated;
grant select on public.v_evaluator_review_queue_with_scored
  to authenticated;

create view public.v_evaluator_review_queue_with_scored_summary
with (security_barrier = true)
as
select
  queue.job_id,
  queue.job_title,
  count(*)::integer as waiting_count,
  count(*) filter (where queue.review_kind = 'REREVIEW')::integer as rereview_count
from public.v_evaluator_review_queue_with_scored as queue
group by queue.job_id, queue.job_title;

revoke all on public.v_evaluator_review_queue_with_scored_summary
  from public, anon, authenticated;
grant select on public.v_evaluator_review_queue_with_scored_summary
  to authenticated;

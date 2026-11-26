-- Minimum total score per posting position. Existing open postings without a
-- cutoff remain open; newly opened postings must provide one.
alter table public.job_posting_positions
  add column minimum_total_points numeric(5, 2)
  check (minimum_total_points between 0 and 100);

create function private.require_minimum_score_before_open()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'OPEN' and (
    (tg_op = 'INSERT') or (tg_op = 'UPDATE' and old.status is distinct from 'OPEN')
  ) and exists (
      select 1 from public.job_posting_positions job_position
      where job_position.job_id = new.id and job_position.minimum_total_points is null
    ) then
    raise exception 'Set a minimum total score for each position before opening this posting.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger job_postings_require_minimum_score
before insert or update of status on public.job_postings
for each row execute function private.require_minimum_score_before_open();

create function private.application_score_summary(p_application_id uuid)
returns table(is_complete boolean, total_points numeric)
language sql stable security definer set search_path = '' as $$
  with application_data as (
    select application.job_id, application.position_id
    from public.applications application where application.id = p_application_id
  ), configured as (
    select criterion.criterion_key,
      case when criterion.criterion_key in ('EDUCATION', 'TRAINING', 'EXPERIENCE')
        then automatic.points else manual.points end as points
    from application_data application
    join public.job_posting_positions job_position
      on job_position.job_id = application.job_id
      and job_position.position_id = application.position_id
    join public.position_criterion_weights weight on weight.profile_id = job_position.weight_profile_id
    join public.position_criteria criterion on criterion.id = weight.criterion_id
    left join lateral private.application_scoring(p_application_id) automatic
      on automatic.criterion_key = criterion.criterion_key
    left join public.application_criterion_scores manual
      on manual.application_id = p_application_id and manual.criterion_id = criterion.id
  )
  select count(*) > 0 and count(points) = count(*), coalesce(sum(points), 0)
  from configured
$$;

create function private.apply_minimum_score_result(p_application_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare threshold numeric; summary record; current_status public.application_status;
begin
  select job_position.minimum_total_points into threshold
  from public.applications application
  join public.job_posting_positions job_position
    on job_position.job_id = application.job_id and job_position.position_id = application.position_id
  where application.id = p_application_id;
  if threshold is null then return; end if;
  select * into summary from private.application_score_summary(p_application_id);
  select status into current_status from public.applications where id = p_application_id for update;
  if current_status in ('HIRED', 'NOT_SELECTED', 'REJECTED')
    or not coalesce(summary.is_complete, false) then return; end if;
  if summary.total_points < threshold then
    update public.applications set status = 'NOT_QUALIFIED'::public.application_status,
      status_reason = 'AUTO_MINIMUM_TOTAL_SCORE'
    where id = p_application_id and status <> 'HIRED'::public.application_status;
  end if;
end;
$$;

create or replace view public.v_staff_application_scores
with (security_barrier = true) as
select authorized.application_id,
  criterion.criterion_key,
  criterion.title as criterion_title,
  weight.points as maximum_points,
  case when criterion.criterion_key in ('EDUCATION', 'TRAINING', 'EXPERIENCE')
    then automatic.points else manual.points end as points,
  job_position.minimum_total_points,
  summary.is_complete,
  summary.total_points
from private.authorized_staff_applications authorized
join public.applications application on application.id = authorized.application_id
join public.job_posting_positions job_position
  on job_position.job_id = application.job_id and job_position.position_id = application.position_id
join public.position_criterion_weights weight on weight.profile_id = job_position.weight_profile_id
join public.position_criteria criterion on criterion.id = weight.criterion_id
left join lateral private.application_scoring(application.id) automatic
  on automatic.criterion_key = criterion.criterion_key
left join public.application_criterion_scores manual
  on manual.application_id = application.id and manual.criterion_id = criterion.id
cross join lateral private.application_score_summary(application.id) summary;
revoke all on public.v_staff_application_scores from public, anon;
grant select on public.v_staff_application_scores to authenticated;

create policy applications_read_by_superintendent
on public.applications for select to authenticated
using (
  (select private.is_role('SDS'::public.user_role))
  or (select private.is_role('ASDS'::public.user_role))
);
create policy application_criterion_scores_read_by_superintendent
on public.application_criterion_scores for select to authenticated
using (
  (select private.is_role('SDS'::public.user_role))
  or (select private.is_role('ASDS'::public.user_role))
);

create function private.lock_minimum_score_after_scoring()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.minimum_total_points is not null
    and new.minimum_total_points is distinct from old.minimum_total_points
    and exists (
      select 1 from public.applications application
      where application.job_id = new.job_id and application.position_id = new.position_id
        and (application.status in ('ASSESSMENT_SCORED', 'QUALIFIED', 'NOT_QUALIFIED', 'HIRED')
          or exists (select 1 from public.application_criterion_scores score where score.application_id = application.id))
    ) then
    raise exception 'The minimum total score is locked after application scoring begins.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger job_posting_position_minimum_lock
before update of minimum_total_points on public.job_posting_positions
for each row execute function private.lock_minimum_score_after_scoring();

create function private.prevent_qualification_below_minimum()
returns trigger language plpgsql security definer set search_path = '' as $$
declare threshold numeric; summary record;
begin
  if new.status = 'QUALIFIED'::public.application_status and old.status is distinct from new.status then
    select minimum_total_points into threshold from public.job_posting_positions
    where job_id = new.job_id and position_id = new.position_id;
    if threshold is not null then
      select * into summary from private.application_score_summary(new.id);
      if not coalesce(summary.is_complete, false) then
        raise exception 'All configured criterion points must be rated before qualification.' using errcode = '23514';
      end if;
      if summary.total_points < threshold then
        raise exception 'This applicant is below the minimum total score.' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger applications_prevent_qualification_below_minimum
before update of status on public.applications
for each row execute function private.prevent_qualification_below_minimum();

-- Force HR posting updates through the validated cutoff-aware RPC. The
-- security-definer posting implementation can still call these functions.
revoke all on function public.save_scored_posting(
  uuid, text, text, text, integer, public.job_status, timestamptz, uuid[], jsonb
) from public, anon, authenticated;
revoke all on function private.save_scored_posting(
  uuid, text, text, text, integer, public.job_status, timestamptz, uuid[], jsonb
) from public, anon, authenticated;
revoke all on function public.set_job_posting_positions(uuid, uuid[])
  from public, anon, authenticated;

create or replace function public.save_application_assessment_scores(
  p_application_id uuid,
  p_scores jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
declare target_job_id uuid; target_position_id uuid; target_status public.application_status;
  expected_count integer; score_count integer;
begin
  if not (select private.is_role('EVALUATOR'::public.user_role)) then
    raise exception 'Evaluator access is required.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_scores) <> 'array' then
    raise exception 'Submit a score for every configured criterion.' using errcode = '22023';
  end if;
  select application.job_id, application.position_id, application.status
    into target_job_id, target_position_id, target_status
  from public.applications application
  where application.id = p_application_id and application.assigned_evaluator_id = (select auth.uid())
  for update;
  if not found then raise exception 'This application is no longer assigned to you.' using errcode = '42501'; end if;
  if target_status not in ('ASSESSMENT_SCHEDULED', 'ASSESSMENT_SCORED') then
    raise exception 'Only scheduled assessments can be scored.' using errcode = '22023';
  end if;
  if target_position_id is null then raise exception 'A position must be selected before criterion scores can be entered.' using errcode = '22023'; end if;

  select count(*)::integer into expected_count
  from public.job_posting_positions job_position
  join public.position_criterion_weights weight on weight.profile_id = job_position.weight_profile_id
  join public.position_criteria criterion on criterion.id = weight.criterion_id
  where job_position.job_id = target_job_id and job_position.position_id = target_position_id
    and criterion.criterion_key not in ('EDUCATION', 'TRAINING', 'EXPERIENCE');
  select count(*)::integer into score_count from jsonb_array_elements(p_scores);
  if expected_count = 0 or score_count <> expected_count
    or (select count(distinct (item.value ->> 'criterion_id')::uuid) from jsonb_array_elements(p_scores) item) <> expected_count then
    raise exception 'Submit one score for every configured assessment criterion.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_scores) item
    left join public.position_criteria criterion on criterion.id = (item.value ->> 'criterion_id')::uuid
    left join public.job_posting_positions job_position on job_position.job_id = target_job_id and job_position.position_id = target_position_id
    left join public.position_criterion_weights weight on weight.profile_id = job_position.weight_profile_id and weight.criterion_id = criterion.id
    where criterion.id is null or weight.criterion_id is null
      or criterion.criterion_key in ('EDUCATION', 'TRAINING', 'EXPERIENCE')
      or nullif(item.value ->> 'points', '') is null
      or (item.value ->> 'points')::numeric < 0
      or (item.value ->> 'points')::numeric > weight.points
      or abs((item.value ->> 'points')::numeric * 100 - round((item.value ->> 'points')::numeric * 100)) >= 0.00000001
  ) then
    raise exception 'A score is missing, invalid, or above its configured criterion maximum.' using errcode = '22023';
  end if;
  insert into public.application_criterion_scores (application_id, criterion_id, evaluator_id, points, updated_at)
  select p_application_id, (item.value ->> 'criterion_id')::uuid, (select auth.uid()), (item.value ->> 'points')::numeric, now()
  from jsonb_array_elements(p_scores) item
  on conflict (application_id, criterion_id) do update
    set evaluator_id = excluded.evaluator_id, points = excluded.points, updated_at = excluded.updated_at;
  update public.applications set status = 'ASSESSMENT_SCORED'::public.application_status
    where id = p_application_id and status in ('ASSESSMENT_SCHEDULED', 'ASSESSMENT_SCORED');
  perform private.apply_minimum_score_result(p_application_id);
end;
$$;
revoke all on function public.save_application_assessment_scores(uuid, jsonb) from public, anon;
grant execute on function public.save_application_assessment_scores(uuid, jsonb) to authenticated;

create function public.save_scored_posting_with_minimums(
  p_job_id uuid, p_title text, p_description text, p_requirements text,
  p_slots integer, p_status public.job_status, p_deadline timestamptz,
  p_position_ids uuid[], p_scoring jsonb, p_minimum_scores jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; entry record; existing_minimum numeric;
  current_status public.job_status; intermediate_status public.job_status;
begin
  if auth.uid() is null or not private.is_role('HR'::public.user_role) then raise exception 'HR access is required.' using errcode = '42501'; end if;
  if p_job_id is not null then
    select status into current_status from public.job_postings where id = p_job_id;
  end if;
  if jsonb_typeof(p_minimum_scores) is distinct from 'array' then
    raise exception 'Set a valid minimum score for every position.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_minimum_scores) <> coalesce(array_length(p_position_ids, 1), 0)
    or exists (select 1 from jsonb_to_recordset(p_minimum_scores) as x(position_id uuid, minimum_total_points numeric)
      where x.position_id is null or x.minimum_total_points < 0 or x.minimum_total_points > 100)
    or exists (select 1 from unnest(p_position_ids) id where not exists (
      select 1 from jsonb_to_recordset(p_minimum_scores) as x(position_id uuid, minimum_total_points numeric) where x.position_id = id
    )) then
    raise exception 'Set a valid minimum score for every position.' using errcode = '22023';
  end if;
  if p_status = 'OPEN' and exists (
    select 1 from jsonb_to_recordset(p_minimum_scores) as x(position_id uuid, minimum_total_points numeric)
    where x.minimum_total_points is null and not (
      current_status = 'OPEN'::public.job_status
      and exists (
        select 1 from public.job_posting_positions existing
        where existing.job_id = p_job_id and existing.position_id = x.position_id
          and existing.minimum_total_points is null
      )
    )
  ) then raise exception 'Set a minimum total score for each position before opening this posting.' using errcode = '22023'; end if;

  intermediate_status := case when current_status = 'OPEN' and p_status = 'OPEN'
    then 'OPEN'::public.job_status else 'DRAFT'::public.job_status end;
  result := private.save_scored_posting(p_job_id, p_title, p_description, p_requirements,
    p_slots, intermediate_status, p_deadline, p_position_ids, p_scoring);
  for entry in select * from jsonb_to_recordset(p_minimum_scores) as x(position_id uuid, minimum_total_points numeric) loop
    select minimum_total_points into existing_minimum from public.job_posting_positions
    where job_id = result and position_id = entry.position_id;
    if not found then raise exception 'A position in this posting could not be updated.' using errcode = '22023'; end if;
    update public.job_posting_positions set minimum_total_points = entry.minimum_total_points
      where job_id = result and position_id = entry.position_id;
    if existing_minimum is null and entry.minimum_total_points is not null then
      perform private.apply_minimum_score_result(application.id)
      from public.applications application
      where application.job_id = result and application.position_id = entry.position_id
        and application.status <> 'HIRED'::public.application_status;
    end if;
  end loop;
  perform private.save_posting_scoring(result, p_scoring, p_status <> 'DRAFT');
  perform public.update_job_posting_with_positions(result, p_title, p_description,
    p_requirements, p_slots, p_status, p_deadline, p_position_ids);
  return result;
end;
$$;
revoke all on function public.save_scored_posting_with_minimums(uuid,text,text,text,integer,public.job_status,timestamptz,uuid[],jsonb,jsonb) from public, anon;
grant execute on function public.save_scored_posting_with_minimums(uuid,text,text,text,integer,public.job_status,timestamptz,uuid[],jsonb,jsonb) to authenticated;

notify pgrst, 'reload schema';

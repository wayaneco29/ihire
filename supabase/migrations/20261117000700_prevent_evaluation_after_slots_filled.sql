create function public.prevent_evaluation_after_slots_filled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job_id uuid;
  target_slots integer;
  hired_count integer := 0;
begin
  select application.job_id
  into target_job_id
  from public.applications as application
  where application.id = new.application_id;

  if target_job_id is null then
    raise exception 'The application is no longer available.' using errcode = 'P0002';
  end if;

  -- Match the hiring function's lock order so a last-slot hire and an
  -- evaluator submission cannot race each other.
  select job.slots
  into target_slots
  from public.job_postings as job
  where job.id = target_job_id
  for update;

  if target_slots is null then
    raise exception 'The job posting is no longer available.' using errcode = 'P0002';
  end if;

  select count(*)::integer
  into hired_count
  from public.applications as application
  where application.job_id = target_job_id
    and application.status = 'HIRED'::public.application_status;

  if hired_count >= target_slots then
    raise exception 'All hiring slots have been filled; evaluations are closed.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_evaluation_after_slots_filled()
  from public, anon, authenticated;

create trigger application_evaluation_capacity_guard
before insert on public.application_evaluations
for each row
execute function public.prevent_evaluation_after_slots_filled();

create function private.guard_job_posting_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hired_count integer := 0;
begin
  if tg_op = 'UPDATE' then
    select count(*)::integer
    into hired_count
    from public.applications as application
    where application.job_id = new.id
      and application.status = 'HIRED';
  end if;

  if new.slots < hired_count then
    raise exception 'Slots cannot be lower than the number of hired applicants.'
      using errcode = '23514';
  end if;

  if new.status = 'OPEN' and new.deadline is not null and new.deadline <= now() then
    raise exception 'A posting with an expired deadline cannot be opened.'
      using errcode = '23514';
  end if;

  if new.status = 'OPEN' and hired_count >= new.slots then
    raise exception 'A posting cannot be opened after all slots are filled.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_job_posting_capacity() from public, anon, authenticated;

create trigger job_postings_guard_capacity
before insert or update of slots, status, deadline on public.job_postings
for each row
execute function private.guard_job_posting_capacity();

revoke insert, update, delete on public.hiring_decisions from authenticated;

create function public.record_hr_hiring_decision(
  target_application_id uuid,
  target_decision text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_job_id uuid;
  target_slots integer;
  current_status public.application_status;
  hired_count integer := 0;
begin
  if actor_id is null or not (select private.is_role('HR'::public.user_role)) then
    raise exception 'HR access is required.' using errcode = '42501';
  end if;

  if target_decision is null or target_decision not in ('HIRED', 'REJECTED') then
    raise exception 'The hiring decision is invalid.' using errcode = '22023';
  end if;

  select application.job_id
  into target_job_id
  from public.applications as application
  where application.id = target_application_id;

  if target_job_id is null then
    raise exception 'The application is no longer available.' using errcode = 'P0002';
  end if;

  select job.slots
  into target_slots
  from public.job_postings as job
  where job.id = target_job_id
    and job.hr_id = actor_id
  for update;

  if target_slots is null then
    raise exception 'This application does not belong to your posting.' using errcode = '42501';
  end if;

  select application.status
  into current_status
  from public.applications as application
  where application.id = target_application_id
    and application.job_id = target_job_id
  for update;

  if current_status is null or current_status in ('HIRED', 'REJECTED') then
    raise exception 'This application already has a final decision.' using errcode = '23505';
  end if;

  if target_decision = 'HIRED' and current_status <> 'QUALIFIED' then
    raise exception 'Only qualified applicants can be hired.' using errcode = '23514';
  end if;

  if target_decision = 'REJECTED' and current_status not in ('QUALIFIED', 'NOT_QUALIFIED') then
    raise exception 'An applicant must be evaluated before a decision is recorded.' using errcode = '23514';
  end if;

  select count(*)::integer
  into hired_count
  from public.applications as application
  where application.job_id = target_job_id
    and application.status = 'HIRED';

  if target_decision = 'HIRED' and hired_count >= target_slots then
    raise exception 'All available slots have already been filled.' using errcode = '23514';
  end if;

  insert into public.hiring_decisions (application_id, hr_id, decision)
  values (target_application_id, actor_id, target_decision)
  on conflict (application_id) do nothing;

  if not found then
    raise exception 'A hiring decision already exists for this application.' using errcode = '23505';
  end if;

  if target_decision = 'HIRED' and hired_count + 1 >= target_slots then
    update public.job_postings
    set status = 'CLOSED', updated_at = now()
    where id = target_job_id and status = 'OPEN';
  end if;

  return target_decision;
end;
$$;

revoke all on function public.record_hr_hiring_decision(uuid, text) from public, anon;
grant execute on function public.record_hr_hiring_decision(uuid, text) to authenticated;

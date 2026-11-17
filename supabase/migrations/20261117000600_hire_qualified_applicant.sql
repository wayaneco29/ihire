create function public.hire_qualified_applicant(p_application_id uuid)
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
  filled_last_slot boolean := false;
begin
  if actor_id is null or not (select private.is_role('HR'::public.user_role)) then
    raise exception 'HR access is required.' using errcode = '42501';
  end if;

  select application.job_id
  into target_job_id
  from public.applications as application
  where application.id = p_application_id;

  if target_job_id is null then
    raise exception 'The application is no longer available.' using errcode = 'P0002';
  end if;

  -- Serialize hires for one posting so concurrent requests cannot exceed slots.
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
  where application.id = p_application_id
    and application.job_id = target_job_id
  for update;

  if current_status is distinct from 'QUALIFIED'::public.application_status then
    raise exception 'Only qualified applicants can be hired.' using errcode = '23514';
  end if;

  select count(*)::integer
  into hired_count
  from public.applications as application
  where application.job_id = target_job_id
    and application.status = 'HIRED';

  if hired_count >= target_slots then
    raise exception 'All available slots have already been filled.' using errcode = '23514';
  end if;

  insert into public.hiring_decisions (application_id, hr_id, decision)
  values (p_application_id, actor_id, 'HIRED')
  on conflict (application_id) do nothing;

  if not found then
    raise exception 'A hiring decision already exists for this application.' using errcode = '23505';
  end if;

  if hired_count + 1 >= target_slots then
    filled_last_slot := true;
    update public.job_postings
    set status = 'CLOSED', updated_at = now()
    where id = target_job_id and status = 'OPEN';

    update public.applications
    set status = 'NOT_SELECTED'::public.application_status
    where job_id = target_job_id
      and status = 'QUALIFIED'::public.application_status
      and id <> p_application_id;
  end if;

  return case when filled_last_slot then 'HIRED_AND_FILLED_SLOTS' else 'HIRED' end;
end;
$$;

revoke all on function public.hire_qualified_applicant(uuid)
  from public, anon;
grant execute on function public.hire_qualified_applicant(uuid)
  to authenticated;

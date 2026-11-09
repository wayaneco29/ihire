create or replace function public.create_job_posting_with_positions(
  p_title text,
  p_description text,
  p_requirements text,
  p_slots integer,
  p_status public.job_status,
  p_deadline timestamptz,
  p_position_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_job_id uuid;
begin
  if not (select private.is_role('HR'::public.user_role)) then
    raise exception 'HR access is required.' using errcode = '42501';
  end if;

  if p_title is null or length(btrim(p_title)) not between 3 and 160
    or p_description is null or length(btrim(p_description)) not between 10 and 10000
    or length(coalesce(p_requirements, '')) > 10000
    or p_slots is null or p_slots < 1
    or p_status is null
    or (p_status = 'OPEN' and p_deadline is not null and p_deadline <= now())
  then
    raise exception 'Check the job posting details.' using errcode = '22023';
  end if;

  insert into public.job_postings (
    hr_id, title, description, requirements, slots, status, deadline
  )
  values (
    (select auth.uid()),
    btrim(p_title),
    btrim(p_description),
    nullif(btrim(coalesce(p_requirements, '')), ''),
    p_slots,
    p_status,
    p_deadline
  )
  returning id into new_job_id;

  perform public.set_job_posting_positions(new_job_id, p_position_ids);
  return new_job_id;
end;
$$;

create or replace function public.update_job_posting_with_positions(
  p_job_id uuid,
  p_title text,
  p_description text,
  p_requirements text,
  p_slots integer,
  p_status public.job_status,
  p_deadline timestamptz,
  p_position_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_job_id uuid;
begin
  if not (select private.is_role('HR'::public.user_role)) then
    raise exception 'HR access is required.' using errcode = '42501';
  end if;

  if p_title is null or length(btrim(p_title)) not between 3 and 160
    or p_description is null or length(btrim(p_description)) not between 10 and 10000
    or length(coalesce(p_requirements, '')) > 10000
    or p_slots is null or p_slots < 1
    or p_status is null
    or (p_status = 'OPEN' and p_deadline is not null and p_deadline <= now())
  then
    raise exception 'Check the job posting details.' using errcode = '22023';
  end if;

  update public.job_postings as job
  set title = btrim(p_title),
      description = btrim(p_description),
      requirements = nullif(btrim(coalesce(p_requirements, '')), ''),
      slots = p_slots,
      status = p_status,
      deadline = p_deadline,
      updated_at = now()
  where job.id = p_job_id
    and job.hr_id = (select auth.uid())
  returning job.id into updated_job_id;

  if updated_job_id is null then
    raise exception 'This job posting is unavailable.' using errcode = 'P0002';
  end if;

  perform public.set_job_posting_positions(updated_job_id, p_position_ids);
  return updated_job_id;
end;
$$;

revoke insert, update, delete on public.job_postings from authenticated;
revoke all on function public.create_job_posting_with_positions(
  text, text, text, integer, public.job_status, timestamptz, uuid[]
) from public, anon;
revoke all on function public.update_job_posting_with_positions(
  uuid, text, text, text, integer, public.job_status, timestamptz, uuid[]
) from public, anon;
grant execute on function public.create_job_posting_with_positions(
  text, text, text, integer, public.job_status, timestamptz, uuid[]
) to authenticated;
grant execute on function public.update_job_posting_with_positions(
  uuid, text, text, text, integer, public.job_status, timestamptz, uuid[]
) to authenticated;
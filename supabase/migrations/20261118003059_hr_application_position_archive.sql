alter table public.positions
  add column is_active boolean not null default true;

create function public.update_hr_position(
  p_position_id uuid,
  p_title text,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_title text;
begin
  if not (select private.is_role('HR'::public.user_role)) then
    raise exception 'HR access is required.' using errcode = '42501';
  end if;

  if p_position_id is null
    or (p_title is null and p_is_active is null)
    or (p_title is not null and length(btrim(p_title)) not between 2 and 160)
  then
    raise exception 'Enter a valid position title and status.' using errcode = '22023';
  end if;

  select position.title
  into current_title
  from public.positions as position
  where position.id = p_position_id
  for update;

  if not found then
    raise exception 'This position is unavailable.' using errcode = 'P0002';
  end if;

  if p_title is not null
    and btrim(p_title) is distinct from current_title
    and exists (
      select 1
      from public.job_posting_positions as job_position
      where job_position.position_id = p_position_id
    )
  then
    raise exception 'Positions already used by postings cannot be renamed. Archive this position and add a new one instead.'
      using errcode = 'P0001';
  end if;

  update public.positions
  set title = coalesce(btrim(p_title), title),
      is_active = coalesce(p_is_active, is_active)
  where id = p_position_id;
exception
  when unique_violation then
    raise exception 'A position with that title already exists for this hiring type.'
      using errcode = '23505';
end;
$$;

revoke all on function public.update_hr_position(uuid, text, boolean)
  from public, anon;
grant execute on function public.update_hr_position(uuid, text, boolean)
  to authenticated;

create or replace function public.set_job_posting_positions(
  p_job_id uuid,
  p_position_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_count integer;
  configured_count integer;
  current_ids uuid[];
  requested_ids uuid[];
begin
  if not (select private.is_role('HR'::public.user_role))
    or not (select private.hr_owns_job(p_job_id))
  then
    raise exception 'This job posting is unavailable.' using errcode = '42501';
  end if;

  select coalesce(array_agg(selected.position_id order by selected.position_id), array[]::uuid[])
  into requested_ids
  from unnest(coalesce(p_position_ids, array[]::uuid[])) as selected(position_id);
  selected_count := cardinality(requested_ids);

  if selected_count = 0 then
    raise exception 'Select at least one position.' using errcode = '22023';
  end if;

  if selected_count <> (
    select count(distinct selected.position_id)
    from unnest(requested_ids) as selected(position_id)
  ) then
    raise exception 'Do not select a position more than once.' using errcode = '22023';
  end if;

  select coalesce(array_agg(link.position_id order by link.position_id), array[]::uuid[])
  into current_ids
  from public.job_posting_positions as link
  where link.job_id = p_job_id;

  perform position.id
  from public.positions as position
  where position.id = any(requested_ids)
  order by position.id
  for update;

  select count(*)
  into configured_count
  from public.positions as position
  join public.position_weight_profiles as profile
    on profile.position_id = position.id
    and profile.is_current
  where position.id = any(requested_ids);

  if configured_count <> selected_count then
    raise exception 'Every selected position must have a published 100-point weight profile.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(requested_ids) as selected(position_id)
    join public.positions as position on position.id = selected.position_id
    where not position.is_active
      and not (position.id = any(current_ids))
  ) then
    raise exception 'Archived positions cannot be added to a posting.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.applications as application
    where application.job_id = p_job_id
  ) then
    if current_ids is distinct from requested_ids then
      raise exception 'Positions cannot change after applications have been received.'
        using errcode = 'P0001';
    end if;

    return;
  end if;

  delete from public.job_posting_positions
  where job_id = p_job_id;

  insert into public.job_posting_positions (
    job_id, position_id, weight_profile_id
  )
  select p_job_id, position.id, profile.id
  from public.positions as position
  join public.position_weight_profiles as profile
    on profile.position_id = position.id
    and profile.is_current
  where position.id = any(requested_ids);
end;
$$;

revoke all on function public.set_job_posting_positions(uuid, uuid[])
  from public, anon;
grant execute on function public.set_job_posting_positions(uuid, uuid[])
  to authenticated;

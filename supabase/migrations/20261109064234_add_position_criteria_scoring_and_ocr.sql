create table public.positions (
  id uuid primary key default gen_random_uuid(),
  track text not null check (track in ('TEACHING', 'NON_TEACHING')),
  title text not null check (length(btrim(title)) between 2 and 160),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint positions_track_title_unique unique (track, title)
);

create table public.position_criteria (
  id uuid primary key default gen_random_uuid(),
  track text not null check (track in ('TEACHING', 'NON_TEACHING')),
  criterion_key text not null check (length(btrim(criterion_key)) > 0),
  title text not null check (length(btrim(title)) > 0),
  display_order smallint not null check (display_order > 0),
  constraint position_criteria_track_key_unique unique (track, criterion_key),
  constraint position_criteria_track_order_unique unique (track, display_order)
);

insert into public.position_criteria (track, criterion_key, title, display_order)
values
  ('TEACHING', 'EDUCATION', 'Education', 1),
  ('TEACHING', 'TRAINING', 'Training', 2),
  ('TEACHING', 'EXPERIENCE', 'Experience', 3),
  ('TEACHING', 'PERFORMANCE', 'Performance', 4),
  ('TEACHING', 'CLASSROOM_OBSERVATION', 'Classroom Observation/Demo Teaching (PPST COIs)', 5),
  ('TEACHING', 'TEACHER_REFLECTION', 'Teacher Reflection Form (PPST NCOIs)', 6),
  ('NON_TEACHING', 'EDUCATION', 'Education', 1),
  ('NON_TEACHING', 'TRAINING', 'Training', 2),
  ('NON_TEACHING', 'EXPERIENCE', 'Experience', 3),
  ('NON_TEACHING', 'PERFORMANCE', 'Performance', 4),
  ('NON_TEACHING', 'ACCOMPLISHMENTS', 'Accomplishments', 5),
  ('NON_TEACHING', 'APPLICATION_OF_EDUCATION', 'Application of Education', 6),
  ('NON_TEACHING', 'APPLICATION_OF_LEARNING', 'Application of Learning and Development', 7),
  ('NON_TEACHING', 'POTENTIAL', 'Potential', 8);

create table public.position_weight_profiles (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.positions (id) on delete restrict,
  version integer not null check (version > 0),
  is_current boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint position_weight_profiles_position_version_unique
    unique (position_id, version),
  constraint position_weight_profiles_id_position_unique
    unique (id, position_id)
);

create unique index position_weight_profiles_one_current_idx
  on public.position_weight_profiles (position_id)
  where is_current;

create table public.position_criterion_weights (
  profile_id uuid not null references public.position_weight_profiles (id) on delete restrict,
  criterion_id uuid not null references public.position_criteria (id) on delete restrict,
  points numeric(5, 2) not null check (points between 0 and 100),
  primary key (profile_id, criterion_id)
);

create table public.job_posting_positions (
  job_id uuid not null references public.job_postings (id) on delete cascade,
  position_id uuid not null references public.positions (id) on delete restrict,
  weight_profile_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (job_id, position_id),
  constraint job_posting_positions_profile_position_fkey
    foreign key (weight_profile_id, position_id)
    references public.position_weight_profiles (id, position_id)
    on delete restrict
);

create index job_posting_positions_position_job_idx
  on public.job_posting_positions (position_id, job_id);

alter table public.positions enable row level security;
alter table public.position_criteria enable row level security;
alter table public.position_weight_profiles enable row level security;
alter table public.position_criterion_weights enable row level security;
alter table public.job_posting_positions enable row level security;

revoke all on public.positions, public.position_criteria,
  public.position_weight_profiles, public.position_criterion_weights,
  public.job_posting_positions from anon, authenticated;

grant select on public.positions, public.position_criteria,
  public.position_weight_profiles, public.position_criterion_weights,
  public.job_posting_positions to authenticated;
grant insert on public.positions to authenticated;

create policy positions_read_authenticated
on public.positions for select to authenticated
using (
  is_active
  or (select private.is_role('HR'::public.user_role))
);

create policy positions_create_hr
on public.positions for insert to authenticated
with check (
  (select private.is_role('HR'::public.user_role))
  and created_by = (select auth.uid())
);

create policy position_criteria_read_authenticated
on public.position_criteria for select to authenticated
using (true);

create policy position_weight_profiles_read_authenticated
on public.position_weight_profiles for select to authenticated
using (true);

create policy position_criterion_weights_read_authenticated
on public.position_criterion_weights for select to authenticated
using (true);

create policy job_posting_positions_read_visible
on public.job_posting_positions for select to authenticated
using (
  exists (
    select 1
    from public.job_postings as job
    where job.id = job_id
      and (
        ((select private.is_role('APPLICANT'::public.user_role)) and job.status = 'OPEN')
        or ((select private.is_role('HR'::public.user_role)) and job.hr_id = (select auth.uid()))
        or ((select private.is_role('EVALUATOR'::public.user_role)) and job.status <> 'DRAFT')
      )
  )
);

create function public.save_position_weight_profile(
  p_position_id uuid,
  p_weights jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_track text;
  next_version integer;
  new_profile_id uuid;
  submitted_count integer;
  unique_criterion_count integer;
  matching_criterion_count integer;
  total_points numeric;
begin
  if not (select private.is_role('HR'::public.user_role)) then
    raise exception 'HR access is required.' using errcode = '42501';
  end if;

  if p_weights is null or jsonb_typeof(p_weights) <> 'array' then
    raise exception 'Enter a weight for every criterion.' using errcode = '22023';
  end if;

  select position.track
  into target_track
  from public.positions as position
  where position.id = p_position_id
    and position.is_active
  for update;

  if target_track is null then
    raise exception 'This position is unavailable.' using errcode = 'P0002';
  end if;

  select count(*), count(distinct submitted.criterion_id), sum(submitted.points)
  into submitted_count, unique_criterion_count, total_points
  from jsonb_to_recordset(p_weights) as submitted(
    criterion_id uuid,
    points numeric
  );

  select count(*)
  into matching_criterion_count
  from public.position_criteria as criterion
  join jsonb_to_recordset(p_weights) as submitted(
    criterion_id uuid,
    points numeric
  ) on submitted.criterion_id = criterion.id
  where criterion.track = target_track
    and submitted.points between 0 and 100
    and submitted.points = round(submitted.points, 2);

  if submitted_count <> matching_criterion_count
    or unique_criterion_count <> matching_criterion_count
    or matching_criterion_count <> (
      select count(*)
      from public.position_criteria as criterion
      where criterion.track = target_track
    )
    or total_points <> 100
  then
    raise exception 'Enter a valid weight for every criterion. The total must equal 100.'
      using errcode = '22023';
  end if;

  select coalesce(max(profile.version), 0) + 1
  into next_version
  from public.position_weight_profiles as profile
  where profile.position_id = p_position_id;

  insert into public.position_weight_profiles (
    position_id, version, created_by
  )
  values (p_position_id, next_version, (select auth.uid()))
  returning id into new_profile_id;

  insert into public.position_criterion_weights (
    profile_id, criterion_id, points
  )
  select new_profile_id, submitted.criterion_id, submitted.points
  from jsonb_to_recordset(p_weights) as submitted(
    criterion_id uuid,
    points numeric
  );

  update public.position_weight_profiles
  set is_current = false
  where position_id = p_position_id
    and is_current;

  update public.position_weight_profiles
  set is_current = true
  where id = new_profile_id;

  return new_profile_id;
end;
$$;

create function public.set_job_posting_positions(
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
  active_count integer;
  current_ids uuid[];
  requested_ids uuid[];
begin
  if not (select private.is_role('HR'::public.user_role))
    or not (select private.hr_owns_job(p_job_id))
  then
    raise exception 'This job posting is unavailable.' using errcode = '42501';
  end if;

  requested_ids := coalesce(p_position_ids, array[]::uuid[]);
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

  select count(*)
  into active_count
  from public.positions as position
  join public.position_weight_profiles as profile
    on profile.position_id = position.id
    and profile.is_current
  where position.id = any(requested_ids)
    and position.is_active;

  if active_count <> selected_count then
    raise exception 'Every selected position must be active and have a published 100-point weight profile.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.applications as application
    where application.job_id = p_job_id
  ) then
    select coalesce(array_agg(link.position_id order by link.position_id), array[]::uuid[])
    into current_ids
    from public.job_posting_positions as link
    where link.job_id = p_job_id;

    select coalesce(array_agg(selected.position_id order by selected.position_id), array[]::uuid[])
    into requested_ids
    from unnest(requested_ids) as selected(position_id);

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
  where position.id = any(requested_ids)
    and position.is_active;
end;
$$;

revoke all on function public.save_position_weight_profile(uuid, jsonb)
  from public, anon;
revoke all on function public.set_job_posting_positions(uuid, uuid[])
  from public, anon;
grant execute on function public.save_position_weight_profile(uuid, jsonb)
  to authenticated;
grant execute on function public.set_job_posting_positions(uuid, uuid[])
  to authenticated;

create function public.create_job_posting_with_positions(
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

create function public.update_job_posting_with_positions(
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
  uuid, text, text, integer, public.job_status, timestamptz, uuid[]
) from public, anon;
grant execute on function public.create_job_posting_with_positions(
  text, text, text, integer, public.job_status, timestamptz, uuid[]
) to authenticated;
grant execute on function public.update_job_posting_with_positions(
  uuid, text, text, integer, public.job_status, timestamptz, uuid[]
) to authenticated;
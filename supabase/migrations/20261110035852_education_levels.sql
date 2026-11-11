create table if not exists public.education_levels (
  qualification_level integer not null,
  description text not null,
  constraint education_levels_pkey primary key (qualification_level),
  constraint education_levels_description_check
    check (length(btrim(description)) >= 2),
  constraint education_levels_range_check
    check (qualification_level between 1 and 31)
);

alter table public.education_levels enable row level security;

revoke all on public.education_levels from anon, authenticated;
grant select on public.education_levels to authenticated, service_role;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'education_levels'
      and policyname = 'education_levels readable by authenticated'
  ) then
    create policy "education_levels readable by authenticated"
      on public.education_levels
      for select
      to authenticated
      using (true);
  end if;
end
$$;

insert into public.education_levels (qualification_level, description)
values
  (1, 'Can Read and Write'),
  (2, 'Elementary Graduate'),
  (3, 'Completed Junior High School (K-12)'),
  (4, 'Senior High School Graduate (K to 12) / High School Graduate (Old curriculum)'),
  (5, 'Completed 5 years in College'),
  (6, 'Bachelor''s Degree'),
  (7, '6 Units earned towards the completion of Master''s Degree'),
  (8, '9 Units earned towards the completion of Master''s Degree'),
  (9, '12 Units earned towards the completion of Master''s Degree'),
  (10, '15 Units earned towards the completion of Master''s Degree'),
  (11, '18 Units earned towards the completion of Master''s Degree'),
  (12, '21 Units earned towards the completion of Master''s Degree'),
  (13, '24 Units earned towards the completion of Master''s Degree'),
  (14, '27 Units earned towards the completion of Master''s Degree'),
  (15, '30 Units earned towards the completion of Master''s Degree'),
  (16, '33 Units earned towards the completion of Master''s Degree'),
  (17, '36 Units earned towards the completion of Master''s Degree'),
  (18, '39 Units earned towards the completion of Master''s Degree'),
  (19, '42 Units earned towards the completion of Master''s Degree'),
  (20, 'Complete Academic Requirements completed towards completion of Master''s Degree'),
  (21, 'Master''s Degree'),
  (22, '3 Units earned towards the completion of a Doctorate'),
  (23, '6 Units earned towards the completion of a Doctorate'),
  (24, '9 Units earned towards the completion of a Doctorate'),
  (25, '12 Units earned towards the completion of a Doctorate'),
  (26, '15 Units earned towards the completion of a Doctorate'),
  (27, '18 Units earned towards the completion of a Doctorate'),
  (28, '21 Units earned towards the completion of a Doctorate'),
  (29, '24 Units earned towards the completion of a Doctorate'),
  (30, 'Complete Academic Requirements completed towards completion of a Doctorate'),
  (31, 'Doctorate')
on conflict (qualification_level) do update
set description = excluded.description;

alter table public.positions
  add column if not exists base_qualification_level integer null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'positions_base_qualification_level_fkey'
      and conrelid = 'public.positions'::regclass
  ) then
    alter table public.positions
      add constraint positions_base_qualification_level_fkey
      foreign key (base_qualification_level)
      references public.education_levels (qualification_level)
      on delete restrict;
  end if;
end
$$;

create index if not exists positions_base_qualification_level_idx
  on public.positions using btree (base_qualification_level);

grant update (base_qualification_level) on public.positions to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'positions'
      and policyname = 'positions_update_hr_education_standard'
  ) then
    create policy positions_update_hr_education_standard
      on public.positions
      for update
      to authenticated
      using ((select private.is_role('HR'::public.user_role)))
      with check ((select private.is_role('HR'::public.user_role)));
  end if;
end
$$;

alter table public.applicants
  add column if not exists qualification_level integer null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'applicants_qualification_level_fkey'
      and conrelid = 'public.applicants'::regclass
  ) then
    alter table public.applicants
      add constraint applicants_qualification_level_fkey
      foreign key (qualification_level)
      references public.education_levels (qualification_level)
      on delete restrict;
  end if;
end
$$;

create or replace function public.education_points(
  p_position_id uuid,
  p_applicant_level integer
)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when position.base_qualification_level is null
      or p_applicant_level is null
      or p_applicant_level not between 1 and 31
      then null
    else greatest(
      p_applicant_level - position.base_qualification_level,
      0
    )
  end
  from public.positions as position
  where position.id = p_position_id;
$$;

revoke all on function public.education_points(uuid, integer)
  from public, anon;
grant execute on function public.education_points(uuid, integer)
  to authenticated, service_role;
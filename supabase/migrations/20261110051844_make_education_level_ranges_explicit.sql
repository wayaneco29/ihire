alter table public.education_levels
  add column if not exists graduate_degree_type text null,
  add column if not exists attainment_status text null,
  add column if not exists minimum_units integer null,
  add column if not exists maximum_units integer null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'education_levels_graduate_degree_type_check'
      and conrelid = 'public.education_levels'::regclass
  ) then
    alter table public.education_levels
      add constraint education_levels_graduate_degree_type_check
      check (
        graduate_degree_type is null
        or graduate_degree_type in ('MASTERS', 'DOCTORATE')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'education_levels_attainment_status_check'
      and conrelid = 'public.education_levels'::regclass
  ) then
    alter table public.education_levels
      add constraint education_levels_attainment_status_check
      check (
        attainment_status is null
        or attainment_status in (
          'UNITS_EARNED',
          'ACADEMIC_REQUIREMENTS',
          'DEGREE_COMPLETED'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'education_levels_unit_range_check'
      and conrelid = 'public.education_levels'::regclass
  ) then
    alter table public.education_levels
      add constraint education_levels_unit_range_check
      check (
        (minimum_units is null or minimum_units >= 0)
        and (maximum_units is null or maximum_units >= 0)
        and (
          minimum_units is null
          or maximum_units is null
          or maximum_units >= minimum_units
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'education_levels_graduate_mapping_check'
      and conrelid = 'public.education_levels'::regclass
  ) then
    alter table public.education_levels
      add constraint education_levels_graduate_mapping_check
      check (
        (
          graduate_degree_type is null
          and attainment_status is null
          and minimum_units is null
          and maximum_units is null
        )
        or (
          graduate_degree_type is not null
          and attainment_status = 'UNITS_EARNED'
          and minimum_units is not null
          and maximum_units is not null
        )
        or (
          graduate_degree_type is not null
          and attainment_status = 'ACADEMIC_REQUIREMENTS'
          and minimum_units is not null
          and maximum_units is null
        )
        or (
          graduate_degree_type is not null
          and attainment_status = 'DEGREE_COMPLETED'
          and minimum_units is null
          and maximum_units is null
        )
      );
  end if;
end
$$;

update public.education_levels
set graduate_degree_type = case
      when qualification_level between 7 and 21 then 'MASTERS'
      when qualification_level between 22 and 31 then 'DOCTORATE'
      else null
    end,
    attainment_status = case
      when qualification_level between 7 and 19
        or qualification_level between 22 and 29 then 'UNITS_EARNED'
      when qualification_level in (20, 30) then 'ACADEMIC_REQUIREMENTS'
      when qualification_level in (21, 31) then 'DEGREE_COMPLETED'
      else null
    end,
    minimum_units = case
      when qualification_level between 7 and 19
        then 6 + ((qualification_level - 7) * 3)
      when qualification_level = 20 then 45
      when qualification_level between 22 and 29
        then 3 + ((qualification_level - 22) * 3)
      when qualification_level = 30 then 27
      else null
    end,
    maximum_units = case
      when qualification_level between 7 and 19
        then 8 + ((qualification_level - 7) * 3)
      when qualification_level between 22 and 29
        then 5 + ((qualification_level - 22) * 3)
      else null
    end;

create or replace function private.derive_pds_education_qualification_level()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_degree_type text;
  v_qualification_level integer;
begin
  if new.level <> 'GRADUATE_STUDIES' then
    new.graduate_degree_type := null;
    new.graduate_degree_completed := null;
    new.graduate_units_earned := null;
  end if;

  if new.level = 'GRADUATE_STUDIES' then
    v_degree_type := new.graduate_degree_type;

    if new.graduate_degree_completed is true then
      select qualification.qualification_level
      into v_qualification_level
      from public.education_levels as qualification
      where qualification.graduate_degree_type = v_degree_type
        and qualification.attainment_status = 'DEGREE_COMPLETED'
      limit 1;
    elsif new.graduate_degree_completed is false
      and new.graduate_units_earned is not null
    then
      select qualification.qualification_level
      into v_qualification_level
      from public.education_levels as qualification
      where qualification.graduate_degree_type = v_degree_type
        and qualification.attainment_status in (
          'UNITS_EARNED',
          'ACADEMIC_REQUIREMENTS'
        )
        and qualification.minimum_units <= new.graduate_units_earned
        and (
          qualification.maximum_units is null
          or qualification.maximum_units >= new.graduate_units_earned
        )
      order by qualification.minimum_units desc
      limit 1;

      if v_qualification_level is null then
        v_qualification_level := case v_degree_type
          when 'MASTERS' then 6
          when 'DOCTORATE' then 21
          else null
        end;
      end if;
    end if;
  else
    v_qualification_level := case
      when new.level = 'ELEMENTARY' and new.year_graduated is not null then 2
      when new.level = 'ELEMENTARY' then 1
      when new.level = 'SECONDARY' and new.year_graduated is not null then 4
      when new.level = 'SECONDARY' then 3
      when new.level = 'COLLEGE' and new.year_graduated is not null then 6
      when new.level = 'COLLEGE'
        and new.period_from is not null
        and new.period_to - new.period_from >= 4 then 5
      else null
    end;
  end if;

  new.qualification_level := v_qualification_level;
  return new;
end;
$$;

update public.pds_education
set graduate_degree_type = graduate_degree_type
where level = 'GRADUATE_STUDIES';
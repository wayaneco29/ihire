alter table public.pds_education
  add column if not exists graduate_degree_type text null
    check (graduate_degree_type in ('MASTERS', 'DOCTORATE')),
  add column if not exists graduate_degree_completed boolean null,
  add column if not exists graduate_units_earned integer null
    check (graduate_units_earned >= 0);

update public.pds_education
set graduate_degree_type = case
      when qualification_level between 7 and 21 then 'MASTERS'
      when qualification_level between 22 and 31 then 'DOCTORATE'
      else null
    end,
    graduate_degree_completed = case
      when qualification_level in (21, 31) then true
      when qualification_level between 7 and 20
        or qualification_level between 22 and 30 then false
      else null
    end,
    graduate_units_earned = case
      when qualification_level between 7 and 19
        then 6 + ((qualification_level - 7) * 3)
      when qualification_level = 20 then 45
      when qualification_level between 22 and 29
        then 3 + ((qualification_level - 22) * 3)
      when qualification_level = 30 then 27
      else null
    end
where level = 'GRADUATE_STUDIES'
  and graduate_degree_type is null;

create function private.inherit_pds_graduate_studies_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.level = 'GRADUATE_STUDIES'
    and new.graduate_degree_type is null
    and new.graduate_degree_completed is null
    and new.graduate_units_earned is null
  then
    select
      source_education.graduate_degree_type,
      source_education.graduate_degree_completed,
      source_education.graduate_units_earned
    into
      new.graduate_degree_type,
      new.graduate_degree_completed,
      new.graduate_units_earned
    from public.pds_versions as draft
    join public.pds_versions as source
      on source.applicant_id = draft.applicant_id
     and source.status = 'SUBMITTED'
    join public.pds_education as source_education
      on source_education.pds_version_id = source.id
     and source_education.level = new.level
    where draft.id = new.pds_version_id
      and draft.status = 'DRAFT'
    order by source.version_no desc
    limit 1;
  end if;

  return new;
end;
$$;

revoke all on function private.inherit_pds_graduate_studies_fields()
  from public, anon, authenticated;

create trigger pds_education_inherit_graduate_fields_before_insert
before insert on public.pds_education
for each row
execute function private.inherit_pds_graduate_studies_fields();

create function private.derive_pds_education_qualification_level()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.level <> 'GRADUATE_STUDIES' then
    new.graduate_degree_type := null;
    new.graduate_degree_completed := null;
    new.graduate_units_earned := null;
  end if;

  new.qualification_level := case
    when new.level = 'GRADUATE_STUDIES'
      and new.graduate_degree_type = 'MASTERS'
      and new.graduate_degree_completed is true then 21
    when new.level = 'GRADUATE_STUDIES'
      and new.graduate_degree_type = 'MASTERS'
      and new.graduate_degree_completed is false
      and new.graduate_units_earned >= 45 then 20
    when new.level = 'GRADUATE_STUDIES'
      and new.graduate_degree_type = 'MASTERS'
      and new.graduate_degree_completed is false
      and new.graduate_units_earned >= 6 then least(
        19,
        7 + floor((new.graduate_units_earned - 6)::numeric / 3)::integer
      )
    when new.level = 'GRADUATE_STUDIES'
      and new.graduate_degree_type = 'MASTERS'
      and new.graduate_degree_completed is false
      and new.graduate_units_earned >= 0 then 6
    when new.level = 'GRADUATE_STUDIES'
      and new.graduate_degree_type = 'DOCTORATE'
      and new.graduate_degree_completed is true then 31
    when new.level = 'GRADUATE_STUDIES'
      and new.graduate_degree_type = 'DOCTORATE'
      and new.graduate_degree_completed is false
      and new.graduate_units_earned >= 27 then 30
    when new.level = 'GRADUATE_STUDIES'
      and new.graduate_degree_type = 'DOCTORATE'
      and new.graduate_degree_completed is false
      and new.graduate_units_earned >= 3 then least(
        29,
        22 + floor((new.graduate_units_earned - 3)::numeric / 3)::integer
      )
    when new.level = 'GRADUATE_STUDIES'
      and new.graduate_degree_type = 'DOCTORATE'
      and new.graduate_degree_completed is false
      and new.graduate_units_earned >= 0 then 21
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

  return new;
end;
$$;

revoke all on function private.derive_pds_education_qualification_level()
  from public, anon, authenticated;

create trigger pds_education_z_derive_qualification_level_before_write
before insert or update
on public.pds_education
for each row
execute function private.derive_pds_education_qualification_level();

update public.pds_education
set graduate_degree_type = graduate_degree_type;

create or replace view public.v_anonymized_education
with (security_barrier = true)
as
select
  authorized.application_id,
  education.id as education_id,
  education.level::text as level,
  education.school_name,
  education.degree_course,
  education.period_from,
  education.period_to,
  education.highest_level_units_earned,
  education.year_graduated,
  education.honors_received,
  education.sort_order,
  education.qualification_level,
  qualification.description as qualification_description,
  education.graduate_degree_type,
  education.graduate_degree_completed,
  education.graduate_units_earned
from private.authorized_anonymized_applications as authorized
join public.pds_education as education
  on education.pds_version_id = authorized.pds_version_id
left join public.education_levels as qualification
  on qualification.qualification_level = education.qualification_level;
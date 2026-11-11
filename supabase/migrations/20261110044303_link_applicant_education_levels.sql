alter table public.pds_education
  add column if not exists qualification_level integer null
  references public.education_levels (qualification_level)
  on delete restrict;

create index if not exists pds_education_qualification_level_idx
  on public.pds_education using btree (qualification_level);

create function private.inherit_pds_education_qualification_level()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.qualification_level is null then
    select source_education.qualification_level
    into new.qualification_level
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

revoke all on function private.inherit_pds_education_qualification_level()
  from public, anon, authenticated;

create trigger pds_education_inherit_qualification_level_before_insert
before insert on public.pds_education
for each row
execute function private.inherit_pds_education_qualification_level();

create or replace function private.sync_applicant_qualification_level_on_pds_submit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_qualification_level integer;
begin
  if not exists (
    select 1
    from public.applicants as applicant
    where applicant.id = new.applicant_id
      and applicant.profile_id = (select auth.uid())
  ) then
    raise exception 'Applicants may only submit their own PDS.'
      using errcode = '42501';
  end if;

  select max(education.qualification_level)
  into target_qualification_level
  from public.pds_education as education
  where education.pds_version_id = new.id;

  update public.applicants
  set qualification_level = target_qualification_level
  where id = new.applicant_id;

  return new;
end;
$$;

revoke all on function private.sync_applicant_qualification_level_on_pds_submit()
  from public, anon, authenticated;

create trigger pds_versions_sync_qualification_level_after_submit
after update of status on public.pds_versions
for each row
when (old.status is distinct from new.status and new.status = 'SUBMITTED')
execute function private.sync_applicant_qualification_level_on_pds_submit();

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
  qualification.description as qualification_description
from private.authorized_anonymized_applications as authorized
join public.pds_education as education
  on education.pds_version_id = authorized.pds_version_id
left join public.education_levels as qualification
  on qualification.qualification_level = education.qualification_level;

create view public.v_anonymized_application_education_points
with (security_barrier = true)
as
select
  authorized.application_id,
  applicant_education.qualification_level as applicant_qualification_level,
  position.base_qualification_level,
  public.education_points(
    position.id,
    applicant_education.qualification_level
  ) as education_points
from private.authorized_anonymized_applications as authorized
join public.applications as application
  on application.id = authorized.application_id
left join public.positions as position
  on position.id = application.position_id
left join lateral (
  select max(education.qualification_level) as qualification_level
  from public.pds_education as education
  where education.pds_version_id = authorized.pds_version_id
) as applicant_education on true;

revoke all on public.v_anonymized_education from public, anon;
revoke all on public.v_anonymized_application_education_points from public, anon;
grant select on public.v_anonymized_education to authenticated;
grant select on public.v_anonymized_application_education_points to authenticated;

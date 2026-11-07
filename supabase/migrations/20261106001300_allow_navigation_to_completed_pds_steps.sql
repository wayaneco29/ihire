create or replace function public.set_pds_current_step(
  p_pds_version_id uuid,
  p_step_number smallint
)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_pds public.pds_versions%rowtype;
  next_unfinished_step smallint;
begin
  if not (select private.is_role('APPLICANT'::public.user_role)) then
    raise exception 'Only applicants can navigate PDS steps.' using errcode = '42501';
  end if;

  select pds.*
  into target_pds
  from public.pds_versions as pds
  join public.applicants as applicant on applicant.id = pds.applicant_id
  where pds.id = p_pds_version_id
    and pds.status = 'DRAFT'
    and applicant.profile_id = (select auth.uid())
  for update of pds;

  if target_pds.id is null then
    raise exception 'The draft PDS was not found.' using errcode = 'P0002';
  end if;

  if p_step_number is null or p_step_number not between 1 and 11 then
    raise exception 'PDS step must be between 1 and 11.' using errcode = '22023';
  end if;

  select coalesce(min(steps.step_number), 11)
  into next_unfinished_step
  from generate_series(1, 11) as steps(step_number)
  where not (steps.step_number = any(target_pds.completed_steps));

  if p_step_number > next_unfinished_step
    or (
      p_step_number <> next_unfinished_step
      and not (p_step_number = any(target_pds.completed_steps))
    )
  then
    raise exception 'PDS steps can only be opened after completion.' using errcode = 'P0001';
  end if;

  update public.pds_versions
  set current_step = p_step_number,
      updated_at = now()
  where id = target_pds.id;

  return p_step_number;
end;
$$;

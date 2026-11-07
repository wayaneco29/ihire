alter table public.pds_versions
add column draft_data jsonb not null default '{}'::jsonb;

create function public.save_pds_step_draft(
  p_pds_version_id uuid,
  p_step_number smallint,
  p_payload jsonb
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_pds public.pds_versions%rowtype;
  next_unfinished_step smallint;
  saved_at timestamptz;
begin
  if not (select private.is_role('APPLICANT'::public.user_role)) then
    raise exception 'Only applicants can save PDS drafts.' using errcode = '42501';
  end if;

  if p_step_number is null
    or p_step_number not between 1 and 11
    or p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
    or octet_length(p_payload::text) > 50000
  then
    raise exception 'The PDS draft data is invalid.' using errcode = '22023';
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
    raise exception 'Complete earlier PDS steps before saving this section.' using errcode = 'P0001';
  end if;

  update public.pds_versions
  set draft_data = jsonb_set(
        coalesce(draft_data, '{}'::jsonb),
        array[p_step_number::text],
        p_payload,
        true
      ),
      updated_at = now()
  where id = target_pds.id
  returning updated_at into saved_at;

  return saved_at;
end;
$$;

revoke all on function public.save_pds_step_draft(uuid, smallint, jsonb) from public, anon;
grant execute on function public.save_pds_step_draft(uuid, smallint, jsonb) to authenticated;

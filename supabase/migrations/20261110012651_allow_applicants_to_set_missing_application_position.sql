create function public.set_application_position(
  p_application_id uuid,
  p_position_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job_id uuid;
  current_position_id uuid;
begin
  if not (select private.is_role('APPLICANT'::public.user_role))
    or not (select private.owns_application(p_application_id))
  then
    raise exception 'This application is unavailable.' using errcode = '42501';
  end if;

  select application.job_id, application.position_id
  into target_job_id, current_position_id
  from public.applications as application
  where application.id = p_application_id
  for update;

  if target_job_id is null then
    raise exception 'This application is unavailable.' using errcode = 'P0002';
  end if;

  if current_position_id is not null then
    if current_position_id = p_position_id then
      return;
    end if;
    raise exception 'A position has already been saved for this application.'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.job_posting_positions as job_position
    where job_position.job_id = target_job_id
      and job_position.position_id = p_position_id
  ) then
    raise exception 'Choose a position included in this job posting.'
      using errcode = '22023';
  end if;

  update public.applications
  set position_id = p_position_id
  where id = p_application_id
    and position_id is null;
end;
$$;

revoke all on function public.set_application_position(uuid, uuid)
  from public, anon;
grant execute on function public.set_application_position(uuid, uuid)
  to authenticated;

drop policy positions_read_authenticated on public.positions;
create policy positions_read_authenticated
on public.positions for select to authenticated
using (
  is_active
  or (select private.is_role('HR'::public.user_role))
  or (
    (select private.is_role('APPLICANT'::public.user_role))
    and exists (
      select 1
      from public.job_posting_positions as job_position
      join public.applications as application
        on application.job_id = job_position.job_id
      where job_position.position_id = positions.id
        and (select private.owns_application(application.id))
    )
  )
);

drop policy job_posting_positions_read_visible
  on public.job_posting_positions;
create policy job_posting_positions_read_visible
on public.job_posting_positions for select to authenticated
using (
  exists (
    select 1
    from public.job_postings as job
    where job.id = job_id
      and (
        (
          (select private.is_role('APPLICANT'::public.user_role))
          and (
            job.status = 'OPEN'
            or exists (
              select 1
              from public.applications as application
              where application.job_id = job.id
                and (select private.owns_application(application.id))
            )
          )
        )
        or (
          (select private.is_role('HR'::public.user_role))
          and job.hr_id = (select auth.uid())
        )
        or (
          (select private.is_role('EVALUATOR'::public.user_role))
          and job.status <> 'DRAFT'
        )
      )
  )
);
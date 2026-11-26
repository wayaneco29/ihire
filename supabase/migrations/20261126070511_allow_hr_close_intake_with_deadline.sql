-- Manual closure is available for all of the HR owner's open postings,
-- including postings whose scheduled deadline has not yet arrived.
create or replace function public.close_job_posting_intake(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not (select private.is_role('HR'::public.user_role)) then
    raise exception 'HR access is required.' using errcode = '42501';
  end if;

  update public.job_postings as job
  set status = 'CLOSED'::public.job_status,
      updated_at = now()
  where job.id = p_job_id
    and job.hr_id = (select auth.uid())
    and job.status = 'OPEN'::public.job_status;

  if not found then
    raise exception 'Only your open postings can be closed here.' using errcode = '22023';
  end if;
  return true;
end;
$$;

revoke all on function public.close_job_posting_intake(uuid) from public, anon;
grant execute on function public.close_job_posting_intake(uuid) to authenticated;

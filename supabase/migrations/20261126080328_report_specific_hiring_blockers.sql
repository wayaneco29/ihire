-- Keep the existing readiness rules, but report only the unresolved blockers.
create or replace function private.enforce_hiring_readiness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job_id uuid;
  readiness record;
  blockers text[] := array[]::text[];
begin
  if new.decision <> 'HIRED' then return new; end if;
  select application.job_id into target_job_id
  from public.applications as application where application.id = new.application_id;
  if target_job_id is null then
    raise exception 'The application is no longer available.' using errcode = 'P0002';
  end if;
  select * into readiness from private.posting_hiring_readiness(target_job_id);
  if not found then
    raise exception 'The posting is no longer available.' using errcode = 'P0002';
  end if;
  if readiness.can_hire is true then return new; end if;
  if not readiness.intake_closed then
    blockers := array_append(blockers, 'This posting is still open in the database. Ask HR to close intake for this posting.');
  end if;
  if readiness.pending_applications > 0 then
    blockers := array_append(blockers, format('%s active application(s) still need evaluation.', readiness.pending_applications));
  end if;
  if readiness.pending_required_documents > 0 then
    blockers := array_append(blockers, format('%s required document(s) are missing or awaiting verification.', readiness.pending_required_documents));
  end if;
  if readiness.pending_document_corrections > 0 then
    blockers := array_append(blockers, format('%s document correction window(s) remain unresolved.', readiness.pending_document_corrections));
  end if;
  if readiness.hired_count >= readiness.slot_count then
    blockers := array_append(blockers, 'No hiring slots are available.');
  end if;
  raise exception 'Hiring blocked: %', array_to_string(blockers, ' ') using errcode = '23514';
end;
$$;

revoke all on function private.enforce_hiring_readiness() from public, anon, authenticated;

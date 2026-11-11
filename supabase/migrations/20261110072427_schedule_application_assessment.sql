alter type public.application_status
  add value if not exists 'ASSESSMENT_SCHEDULED';

alter table public.applications
  add column scheduled_assessment_at timestamptz;

create function private.preserve_assessment_scheduled_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status::text = 'ASSESSMENT_SCHEDULED'
     and old.scheduled_assessment_at is not null
     and new.status::text = 'UNDER_EVALUATION' then
    new.status := old.status;
  end if;

  return new;
end;
$$;

create trigger preserve_assessment_scheduled_status
before update of status, pds_version_id on public.applications
for each row
execute function private.preserve_assessment_scheduled_status();

revoke all on function private.preserve_assessment_scheduled_status()
  from public, anon, authenticated;

create function private.notify_scheduled_application_pds_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.pds_version_id is not distinct from new.pds_version_id
     or new.status::text <> 'ASSESSMENT_SCHEDULED' then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  select
    profile.id,
    'PDS_FOR_REVIEW',
    'Updated PDS ready for review',
    'Applicant ' || applicant.applicant_number || ' submitted an updated PDS.',
    '/evaluator/applications/' || new.id::text
  from public.applicants as applicant
  join public.profiles as profile on profile.role = 'EVALUATOR'
  where applicant.id = new.applicant_id;

  return new;
end;
$$;

create trigger notify_scheduled_application_pds_change
after update of pds_version_id on public.applications
for each row
execute function private.notify_scheduled_application_pds_change();

revoke all on function private.notify_scheduled_application_pds_change()
  from public, anon, authenticated;
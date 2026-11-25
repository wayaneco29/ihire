alter table public.job_postings
  add column requirements_items jsonb not null default '[]'::jsonb,
  add constraint job_postings_requirements_items_array_check
    check (jsonb_typeof(requirements_items) = 'array');

update public.job_postings as job
set requirements_items = coalesce(
  (
    select jsonb_agg(to_jsonb(parsed.requirement_text) order by parsed.ordinal)
    from (
      select
        legacy.ordinal,
        btrim(regexp_replace(
          legacy.raw_line,
          '^([[:space:]]*([-*]|[0-9]+[.)])[[:space:]]*)',
          ''
        )) as requirement_text
      from regexp_split_to_table(coalesce(job.requirements, ''), '\r?\n')
        with ordinality as legacy(raw_line, ordinal)
    ) as parsed
    where parsed.requirement_text <> ''
  ),
  '[]'::jsonb
)
where job.requirements is not null;

drop function public.save_scored_posting(
  uuid, text, text, text, integer, public.job_status, timestamptz, uuid[], jsonb
);
drop function private.save_scored_posting(
  uuid, text, text, text, integer, public.job_status, timestamptz, uuid[], jsonb
);

create function private.save_scored_posting(
  p_job_id uuid,
  p_title text,
  p_description text,
  p_requirements text,
  p_slots integer,
  p_status public.job_status,
  p_deadline timestamptz,
  p_position_ids uuid[],
  p_scoring jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  result uuid;
  requirement_items jsonb;
  legacy_requirements text;
begin
  if auth.uid() is null or not private.is_role('HR') then
    raise exception 'HR access is required.' using errcode = '42501';
  end if;

  if p_requirements is null or btrim(p_requirements) = '' then
    raise exception 'Add at least one job requirement.' using errcode = '22023';
  end if;
  if length(p_requirements) > 25000 then
    raise exception 'The requirements list is too long.' using errcode = '22023';
  end if;

  begin
    requirement_items := p_requirements::jsonb;
  exception when others then
    requirement_items := null;
  end;

  if requirement_items is null or jsonb_typeof(requirement_items) <> 'array' then
    select coalesce(
      jsonb_agg(to_jsonb(parsed.requirement_text) order by parsed.ordinal),
      '[]'::jsonb
    )
    into requirement_items
    from (
      select
        legacy.ordinal,
        btrim(regexp_replace(
          legacy.raw_line,
          '^([[:space:]]*([-*]|[0-9]+[.)])[[:space:]]*)',
          ''
        )) as requirement_text
      from regexp_split_to_table(p_requirements, '\r?\n')
        with ordinality as legacy(raw_line, ordinal)
    ) as parsed
    where parsed.requirement_text <> '';
  end if;

  if jsonb_array_length(requirement_items) not between 1 and 50
    or exists (
      select 1
      from jsonb_array_elements(requirement_items) as item(value)
      where jsonb_typeof(item.value) <> 'string'
        or length(btrim(item.value #>> '{}')) not between 1 and 10000
    )
  then
    raise exception 'Job requirements must contain 1 to 50 non-empty items.'
      using errcode = '22023';
  end if;

  select jsonb_agg(to_jsonb(btrim(item.value #>> '{}')) order by item.ordinality)
  into requirement_items
  from jsonb_array_elements(requirement_items) with ordinality as item(value, ordinality);

  select string_agg(item.value #>> '{}', E'\n' order by item.ordinality)
  into legacy_requirements
  from jsonb_array_elements(requirement_items) with ordinality as item(value, ordinality);

  if length(legacy_requirements) > 10000 then
    raise exception 'The requirements list is too long.' using errcode = '22023';
  end if;

  if p_job_id is null then
    result := public.create_job_posting_with_positions(
      p_title, p_description, legacy_requirements, p_slots, 'DRAFT',
      p_deadline, p_position_ids
    );
  else
    if not private.hr_owns_job(p_job_id) then
      raise exception 'Posting unavailable.' using errcode = '42501';
    end if;
    perform id from public.job_postings where id = p_job_id for update;
    result := public.update_job_posting_with_positions(
      p_job_id, p_title, p_description, legacy_requirements, p_slots,
      (select status from public.job_postings where id = p_job_id),
      p_deadline, p_position_ids
    );
  end if;

  perform private.save_posting_scoring(result, p_scoring, p_status <> 'DRAFT');
  perform public.update_job_posting_with_positions(
    result, p_title, p_description, legacy_requirements, p_slots, p_status,
    p_deadline, p_position_ids
  );

  update public.job_postings as job
  set requirements_items = requirement_items
  where job.id = result and job.hr_id = auth.uid();

  if not found then
    raise exception 'This job posting is unavailable.' using errcode = '42501';
  end if;

  return result;
end;
$$;

create function public.save_scored_posting(
  p_job_id uuid,
  p_title text,
  p_description text,
  p_requirements text,
  p_slots integer,
  p_status public.job_status,
  p_deadline timestamptz,
  p_position_ids uuid[],
  p_scoring jsonb
) returns uuid
language sql
set search_path = ''
as $$
  select private.save_scored_posting(
    p_job_id, p_title, p_description, p_requirements, p_slots,
    p_status, p_deadline, p_position_ids, p_scoring
  )
$$;

revoke all on function private.save_scored_posting(
  uuid, text, text, text, integer, public.job_status, timestamptz, uuid[], jsonb
), public.save_scored_posting(
  uuid, text, text, text, integer, public.job_status, timestamptz, uuid[], jsonb
) from public, anon;

grant execute on function private.save_scored_posting(
  uuid, text, text, text, integer, public.job_status, timestamptz, uuid[], jsonb
), public.save_scored_posting(
  uuid, text, text, text, integer, public.job_status, timestamptz, uuid[], jsonb
) to authenticated;

notify pgrst, 'reload schema';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'job-posting-requirements',
  'job-posting-requirements',
  false,
  20971520,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function private.can_manage_job_requirement_pdf(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_path ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/requirements[.]pdf$'
    and exists (
      select 1
      from public.job_postings as job
      where job.id::text = lower(split_part(target_path, '/', 1))
        and job.hr_id = (select auth.uid())
        and (select private.is_role('HR'::public.user_role))
    )
$$;

create function private.can_access_job_requirement_pdf(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_path ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/requirements[.]pdf$'
    and exists (
      select 1
      from public.job_postings as job
      where job.id::text = lower(split_part(target_path, '/', 1))
        and (
          (
            (select private.is_role('HR'::public.user_role))
            and job.hr_id = (select auth.uid())
          )
          or (select private.is_role('ADMIN'::public.user_role))
          or (
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
            (select private.is_role('EVALUATOR'::public.user_role))
            and job.status <> 'DRAFT'
          )
        )
    )
$$;

revoke all on function private.can_manage_job_requirement_pdf(text),
  private.can_access_job_requirement_pdf(text) from public, anon;
grant execute on function private.can_manage_job_requirement_pdf(text),
  private.can_access_job_requirement_pdf(text) to authenticated;

create policy job_posting_requirements_select
on storage.objects for select to authenticated
using (
  bucket_id = 'job-posting-requirements'
  and (select private.can_access_job_requirement_pdf(name))
);

create policy job_posting_requirements_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'job-posting-requirements'
  and (select private.can_manage_job_requirement_pdf(name))
);

create policy job_posting_requirements_update
on storage.objects for update to authenticated
using (
  bucket_id = 'job-posting-requirements'
  and (select private.can_manage_job_requirement_pdf(name))
)
with check (
  bucket_id = 'job-posting-requirements'
  and (select private.can_manage_job_requirement_pdf(name))
);

create policy job_posting_requirements_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'job-posting-requirements'
  and (select private.can_manage_job_requirement_pdf(name))
);

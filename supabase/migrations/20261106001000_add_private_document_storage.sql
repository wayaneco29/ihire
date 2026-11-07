alter table public.documents
  alter column file_path set default gen_random_uuid()::text;

alter table public.documents
  add constraint documents_file_path_is_opaque_uuid check (
    file_path ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
  );

revoke insert on public.documents from authenticated;
grant insert (applicant_id, document_type_id, version, status)
  on public.documents to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'applicant-documents',
  'applicant-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function private.can_access_document_path(target_file_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.documents as document
    join public.applicants as applicant on applicant.id = document.applicant_id
    where document.file_path = target_file_path
      and (
        (
          (select private.is_role('APPLICANT'::public.user_role))
          and applicant.profile_id = (select auth.uid())
        )
        or (
          (select private.is_role('EVALUATOR'::public.user_role))
          and exists (
            select 1
            from public.applications as application
            join public.pds_versions as pds on pds.id = application.pds_version_id
            where application.applicant_id = applicant.id
              and pds.status = 'SUBMITTED'
          )
        )
        or (
          (select private.is_role('HR'::public.user_role))
          and exists (
            select 1
            from public.applications as application
            join public.job_postings as job on job.id = application.job_id
            where application.applicant_id = applicant.id
              and job.hr_id = (select auth.uid())
          )
        )
      )
  )
$$;

revoke all on function private.can_access_document_path(text) from public, anon;
grant execute on function private.can_access_document_path(text) to authenticated;

alter table storage.objects enable row level security;
grant select, insert on storage.objects to authenticated;

create policy applicant_documents_read_authorized
on storage.objects for select to authenticated
using (
  bucket_id = 'applicant-documents'
  and (select private.can_access_document_path(name))
);

create policy applicant_documents_upload_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'applicant-documents'
  and (select private.is_role('APPLICANT'::public.user_role))
  and (select private.can_access_document_path(name))
);

create view public.v_anonymized_documents
with (security_barrier = true)
as
select
  application.id as application_id,
  job.id as job_id,
  applicant.applicant_number,
  document.id as document_id,
  document.file_path as storage_key,
  document_type.name as document_type,
  document.status as document_status,
  document.uploaded_at
from public.documents as document
join public.applicants as applicant on applicant.id = document.applicant_id
join public.document_types as document_type on document_type.id = document.document_type_id
join public.applications as application on application.applicant_id = applicant.id
join public.pds_versions as pds on pds.id = application.pds_version_id
join public.job_postings as job on job.id = application.job_id
where pds.status = 'SUBMITTED'
  and (
    (select private.is_role('EVALUATOR'::public.user_role))
    or (
      (select private.is_role('HR'::public.user_role))
      and job.hr_id = (select auth.uid())
    )
  );

revoke all on public.v_anonymized_documents from public, anon;
grant select on public.v_anonymized_documents to authenticated;

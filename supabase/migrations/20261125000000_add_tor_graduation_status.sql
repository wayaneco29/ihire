alter table public.documents
  add column is_graduated boolean,
  drop constraint documents_education_link_requires_units,
  add constraint documents_education_link_requires_units
    check (
      pds_education_id is null
      or total_units is not null
      or is_graduated is true
    ),
  drop constraint documents_current_highest_education_requires_units,
  add constraint documents_current_highest_education_requires_units
    check (
      current_highest_education_level is null
      or total_units is not null
      or is_graduated is true
    ),
  add constraint documents_graduated_tor_without_units
    check (is_graduated is not true or total_units is null);

create function private.get_authorized_document_graduation_status(
  target_document_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select document.is_graduated
  from public.documents as document
  where document.id = target_document_id
    and (select auth.uid()) is not null
    and (
      exists (
        select 1
        from public.v_anonymized_documents as visible_document
        where visible_document.document_id = document.id
      )
      or (
        (select private.is_role('DOCUMENT_REVIEWER'::public.user_role))
        and document.status = 'FOR_REVIEW'
      )
    )
$$;

revoke all on function private.get_authorized_document_graduation_status(uuid)
  from public, anon, authenticated;
grant execute on function private.get_authorized_document_graduation_status(uuid)
  to authenticated;

create or replace view public.v_anonymized_document_metrics
with (security_barrier = true, security_invoker = true)
as
with visible_documents as (
  select visible_document.document_id
  from public.v_anonymized_documents as visible_document
  union
  select document.id
  from public.documents as document
  where (select private.is_role('DOCUMENT_REVIEWER'::public.user_role))
    and document.status = 'FOR_REVIEW'
)
select
  visible_document.document_id,
  metrics.training_hours::numeric(8, 2) as training_hours,
  metrics.total_units::numeric(10, 2) as total_units,
  metrics.ocr_training_hours::numeric(8, 2) as ocr_training_hours,
  metrics.ocr_total_units::numeric(10, 2) as ocr_total_units,
  metrics.ocr_confidence::numeric(5, 2) as ocr_confidence,
  metrics.ocr_processed_at,
  private.get_authorized_document_education_attainment(
    visible_document.document_id
  ) as current_highest_education_level,
  private.get_authorized_document_graduation_status(
    visible_document.document_id
  ) as is_graduated
from visible_documents as visible_document
cross join lateral private.get_authorized_document_metrics(
  visible_document.document_id
) as metrics;

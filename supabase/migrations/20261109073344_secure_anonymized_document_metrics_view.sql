create or replace function private.get_authorized_document_metrics(
  target_document_id uuid
)
returns table (
  training_hours numeric(8, 2),
  total_units numeric(10, 2),
  ocr_training_hours numeric(8, 2),
  ocr_total_units numeric(10, 2),
  ocr_confidence numeric(5, 2),
  ocr_processed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    document.training_hours,
    document.total_units,
    document.ocr_training_hours,
    document.ocr_total_units,
    document.ocr_confidence,
    document.ocr_processed_at
  from public.documents as document
  where document.id = target_document_id
    and (select auth.uid()) is not null
    and exists (
      select 1
      from public.v_anonymized_documents as visible_document
      where visible_document.document_id = document.id
    )
$$;

revoke all on function private.get_authorized_document_metrics(uuid)
  from public, anon, authenticated;
grant execute on function private.get_authorized_document_metrics(uuid)
  to authenticated;

create or replace view public.v_anonymized_document_metrics
with (security_barrier = true, security_invoker = true)
as
select
  visible_document.document_id,
  metrics.training_hours::numeric(8, 2) as training_hours,
  metrics.total_units::numeric(10, 2) as total_units,
  metrics.ocr_training_hours::numeric(8, 2) as ocr_training_hours,
  metrics.ocr_total_units::numeric(10, 2) as ocr_total_units,
  metrics.ocr_confidence::numeric(5, 2) as ocr_confidence,
  metrics.ocr_processed_at
from public.v_anonymized_documents as visible_document
cross join lateral private.get_authorized_document_metrics(
  visible_document.document_id
) as metrics;
alter table public.documents
  add column total_units numeric(10, 2),
  add column pds_education_id uuid
    references public.pds_education (id) on delete set null,
  add column ocr_training_hours numeric(8, 2),
  add column ocr_total_units numeric(10, 2),
  add column ocr_confidence numeric(5, 2),
  add column ocr_processed_at timestamptz,
  add constraint documents_total_units_nonnegative
    check (total_units is null or total_units >= 0),
  add constraint documents_ocr_training_hours_nonnegative
    check (ocr_training_hours is null or ocr_training_hours >= 0),
  add constraint documents_ocr_total_units_nonnegative
    check (ocr_total_units is null or ocr_total_units >= 0),
  add constraint documents_ocr_confidence_valid
    check (ocr_confidence is null or ocr_confidence between 0 and 100),
  add constraint documents_education_link_requires_units
    check (pds_education_id is null or total_units is not null);

create index documents_pds_education_id_idx
  on public.documents (pds_education_id)
  where pds_education_id is not null;

alter table public.document_reviews
  add column confirmed_training_hours numeric(8, 2),
  add column confirmed_total_units numeric(10, 2),
  add constraint document_reviews_confirmed_training_nonnegative
    check (confirmed_training_hours is null or confirmed_training_hours >= 0),
  add constraint document_reviews_confirmed_units_nonnegative
    check (confirmed_total_units is null or confirmed_total_units >= 0);

create view public.v_anonymized_document_metrics
with (security_barrier = true)
as
select
  authorized_document.document_id,
  document.training_hours,
  document.total_units,
  document.ocr_training_hours,
  document.ocr_total_units,
  document.ocr_confidence,
  document.ocr_processed_at
from public.v_anonymized_documents as authorized_document
join public.documents as document
  on document.id = authorized_document.document_id;

revoke all on public.v_anonymized_document_metrics from public, anon;
grant select on public.v_anonymized_document_metrics to authenticated;
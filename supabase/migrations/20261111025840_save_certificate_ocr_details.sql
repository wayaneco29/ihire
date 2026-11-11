alter table public.documents
  add column certificate_type text,
  add column certificate_issuer text,
  add column certificate_date date,
  add constraint documents_certificate_type_length
    check (certificate_type is null or length(certificate_type) <= 200),
  add constraint documents_certificate_issuer_length
    check (certificate_issuer is null or length(certificate_issuer) <= 500);

alter type public.user_role
  add value if not exists 'DOCUMENT_REVIEWER';

create type public.document_package_status as enum (
  'INCOMPLETE',
  'PENDING',
  'FOR_REVIEW',
  'APPROVED',
  'NEEDS_RESUBMISSION'
);
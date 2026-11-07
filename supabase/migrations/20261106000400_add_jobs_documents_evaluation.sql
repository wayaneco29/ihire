create table public.job_postings (
  id uuid primary key default gen_random_uuid(),
  hr_id uuid not null references public.profiles (id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  description text not null,
  requirements text,
  slots integer not null check (slots > 0),
  status public.job_status not null default 'DRAFT',
  deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_postings_status_deadline_idx
  on public.job_postings (status, deadline);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_postings (id) on delete cascade,
  applicant_id uuid not null references public.applicants (id) on delete cascade,
  pds_version_id uuid not null references public.pds_versions (id) on delete restrict,
  status public.application_status not null default 'SUBMITTED',
  applied_at timestamptz not null default now(),
  constraint applications_job_applicant_unique unique (job_id, applicant_id)
);

create index applications_job_status_idx
  on public.applications (job_id, status);

create index applications_applicant_applied_at_idx
  on public.applications (applicant_id, applied_at desc);

create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) > 0),
  is_required boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants (id) on delete cascade,
  document_type_id uuid not null references public.document_types (id) on delete restrict,
  file_path text not null unique,
  version integer not null check (version > 0),
  status public.document_status not null default 'PENDING',
  uploaded_at timestamptz not null default now(),
  constraint documents_applicant_type_version_unique
    unique (applicant_id, document_type_id, version)
);

create index documents_applicant_type_uploaded_at_idx
  on public.documents (applicant_id, document_type_id, uploaded_at desc);

create table public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  evaluator_id uuid not null references public.profiles (id) on delete restrict,
  status public.document_status not null check (
    status in ('VERIFIED', 'REJECTED', 'FOR_RESUBMISSION')
  ),
  remarks text,
  reviewed_at timestamptz not null default now()
);

create index document_reviews_document_reviewed_at_idx
  on public.document_reviews (document_id, reviewed_at desc);

create index document_reviews_evaluator_idx
  on public.document_reviews (evaluator_id);

create table public.application_evaluations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  evaluator_id uuid not null references public.profiles (id) on delete restrict,
  result text not null check (result in ('QUALIFIED', 'NOT_QUALIFIED')),
  remarks text,
  evaluated_at timestamptz not null default now()
);

create index application_evaluations_application_evaluated_at_idx
  on public.application_evaluations (application_id, evaluated_at desc);

create index application_evaluations_evaluator_idx
  on public.application_evaluations (evaluator_id);

create table public.hiring_decisions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications (id) on delete cascade,
  hr_id uuid not null references public.profiles (id) on delete restrict,
  decision text not null check (decision in ('HIRED', 'REJECTED')),
  decided_at timestamptz not null default now()
);

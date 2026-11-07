create type public.user_role as enum (
  'APPLICANT',
  'HR',
  'EVALUATOR',
  'ADMIN'
);

create type public.pds_status as enum (
  'DRAFT',
  'SUBMITTED'
);

create type public.document_status as enum (
  'PENDING',
  'FOR_REVIEW',
  'VERIFIED',
  'REJECTED',
  'FOR_RESUBMISSION'
);

create type public.application_status as enum (
  'SUBMITTED',
  'UNDER_EVALUATION',
  'QUALIFIED',
  'NOT_QUALIFIED',
  'HIRED',
  'REJECTED'
);

create type public.job_status as enum (
  'DRAFT',
  'OPEN',
  'CLOSED'
);

create type public.civil_status as enum (
  'SINGLE',
  'MARRIED',
  'WIDOWED',
  'SEPARATED',
  'SOLO_PARENT',
  'OTHER'
);

create type public.education_level as enum (
  'ELEMENTARY',
  'SECONDARY',
  'VOCATIONAL_TRADE',
  'COLLEGE',
  'GRADUATE_STUDIES'
);

create type public.question_code as enum (
  '34A',
  '34B',
  '35A',
  '35B',
  '36',
  '37',
  '38A',
  '38B',
  '39',
  '40A',
  '40B',
  '40C'
);

create type public.other_info_category as enum (
  'SKILL_HOBBY',
  'RECOGNITION',
  'MEMBERSHIP'
);

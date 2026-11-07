create table public.pds_versions (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants (id) on delete cascade,
  version_no integer not null check (version_no > 0),
  status public.pds_status not null default 'DRAFT',
  current_step smallint not null default 1 check (current_step between 1 and 11),
  completed_steps smallint[] not null default array[]::smallint[],
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pds_versions_applicant_version_unique unique (applicant_id, version_no),
  constraint pds_versions_completed_steps_valid check (
    completed_steps <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]::smallint[]
  ),
  constraint pds_versions_submission_timestamp_matches_status check (
    (status = 'DRAFT' and submitted_at is null)
    or (status = 'SUBMITTED' and submitted_at is not null)
  )
);

create unique index pds_versions_one_draft_per_applicant_idx
  on public.pds_versions (applicant_id)
  where status = 'DRAFT';

create index pds_versions_applicant_version_idx
  on public.pds_versions (applicant_id, version_no desc);

create table public.pds_personal_info (
  pds_version_id uuid primary key references public.pds_versions (id) on delete cascade,
  surname text not null,
  first_name text not null,
  middle_name text,
  name_extension text,
  date_of_birth date not null,
  place_of_birth text not null,
  sex_at_birth text not null check (sex_at_birth in ('MALE', 'FEMALE')),
  civil_status public.civil_status not null,
  civil_status_other text,
  height_m numeric(4, 2) check (height_m > 0),
  weight_kg numeric(5, 2) check (weight_kg > 0),
  blood_type text check (blood_type in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  umid_no text,
  pagibig_no text,
  philhealth_no text,
  philsys_no text,
  tin_no text,
  agency_employee_no text,
  citizenship text not null check (citizenship in ('FILIPINO', 'DUAL')),
  dual_citizenship_by text check (dual_citizenship_by in ('BY_BIRTH', 'BY_NATURALIZATION')),
  dual_citizenship_country text,
  telephone_no text,
  mobile_no text,
  email text not null,
  constraint pds_personal_info_other_civil_status_check check (
    (civil_status = 'OTHER' and nullif(btrim(civil_status_other), '') is not null)
    or (civil_status <> 'OTHER' and civil_status_other is null)
  ),
  constraint pds_personal_info_dual_citizenship_check check (
    (citizenship = 'DUAL'
      and dual_citizenship_by is not null
      and nullif(btrim(dual_citizenship_country), '') is not null)
    or (citizenship = 'FILIPINO'
      and dual_citizenship_by is null
      and dual_citizenship_country is null)
  )
);

create table public.pds_addresses (
  pds_version_id uuid not null references public.pds_versions (id) on delete cascade,
  type text not null check (type in ('RESIDENTIAL', 'PERMANENT')),
  house_block_lot_no text,
  street text,
  subdivision_village text,
  barangay text,
  city_municipality text,
  province text,
  zip_code text,
  same_as_residential boolean not null default false,
  primary key (pds_version_id, type),
  constraint pds_addresses_same_as_only_for_permanent check (
    type = 'PERMANENT' or same_as_residential = false
  )
);

create table public.pds_family_background (
  pds_version_id uuid primary key references public.pds_versions (id) on delete cascade,
  spouse_surname text,
  spouse_first_name text,
  spouse_middle_name text,
  spouse_name_extension text,
  spouse_occupation text,
  spouse_employer text,
  spouse_business_address text,
  spouse_telephone_no text,
  father_surname text,
  father_first_name text,
  father_middle_name text,
  father_name_extension text,
  mother_surname text,
  mother_first_name text,
  mother_middle_name text
);

create table public.pds_children (
  id uuid primary key default gen_random_uuid(),
  pds_version_id uuid not null references public.pds_versions (id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  sort_order smallint not null check (sort_order > 0),
  unique (pds_version_id, sort_order)
);

create table public.pds_education (
  id uuid primary key default gen_random_uuid(),
  pds_version_id uuid not null references public.pds_versions (id) on delete cascade,
  level public.education_level not null,
  school_name text,
  degree_course text,
  period_from smallint check (period_from between 1900 and 2200),
  period_to smallint check (period_to between 1900 and 2200),
  highest_level_units_earned text,
  year_graduated smallint check (year_graduated between 1900 and 2200),
  honors_received text,
  sort_order smallint not null check (sort_order > 0),
  unique (pds_version_id, level),
  unique (pds_version_id, sort_order),
  constraint pds_education_period_order check (
    period_from is null or period_to is null or period_to >= period_from
  )
);

create table public.pds_eligibility (
  id uuid primary key default gen_random_uuid(),
  pds_version_id uuid not null references public.pds_versions (id) on delete cascade,
  eligibility_name text not null,
  rating numeric(5, 2) check (rating between 0 and 100),
  exam_date date,
  exam_place text,
  license_no text,
  license_valid_until date,
  sort_order smallint not null check (sort_order > 0),
  unique (pds_version_id, sort_order)
);

create table public.pds_work_experience (
  id uuid primary key default gen_random_uuid(),
  pds_version_id uuid not null references public.pds_versions (id) on delete cascade,
  date_from date not null,
  date_to date,
  position_title text not null,
  agency_company text not null,
  monthly_salary numeric(12, 2) check (monthly_salary >= 0),
  salary_grade_step text,
  appointment_status text,
  is_gov_service boolean not null default false,
  duties_description text,
  sort_order smallint not null check (sort_order > 0),
  unique (pds_version_id, sort_order),
  constraint pds_work_experience_date_order check (date_to is null or date_to >= date_from)
);

create table public.pds_voluntary_work (
  id uuid primary key default gen_random_uuid(),
  pds_version_id uuid not null references public.pds_versions (id) on delete cascade,
  organization_name_address text not null,
  date_from date,
  date_to date,
  hours numeric(8, 2) check (hours >= 0),
  position_nature text,
  sort_order smallint not null check (sort_order > 0),
  unique (pds_version_id, sort_order),
  constraint pds_voluntary_work_date_order check (
    date_from is null or date_to is null or date_to >= date_from
  )
);

create table public.pds_learning_development (
  id uuid primary key default gen_random_uuid(),
  pds_version_id uuid not null references public.pds_versions (id) on delete cascade,
  title text not null,
  date_from date,
  date_to date,
  hours numeric(8, 2) check (hours >= 0),
  ld_type text,
  conducted_by text,
  sort_order smallint not null check (sort_order > 0),
  unique (pds_version_id, sort_order),
  constraint pds_learning_development_date_order check (
    date_from is null or date_to is null or date_to >= date_from
  )
);

create table public.pds_other_info (
  id uuid primary key default gen_random_uuid(),
  pds_version_id uuid not null references public.pds_versions (id) on delete cascade,
  category public.other_info_category not null,
  description text not null,
  sort_order smallint not null check (sort_order > 0),
  unique (pds_version_id, category, sort_order)
);

create table public.pds_questionnaire (
  id uuid primary key default gen_random_uuid(),
  pds_version_id uuid not null references public.pds_versions (id) on delete cascade,
  question_code public.question_code not null,
  answer boolean not null,
  details text,
  date_filed date,
  case_status text,
  id_no text,
  unique (pds_version_id, question_code)
);

create table public.pds_references (
  id uuid primary key default gen_random_uuid(),
  pds_version_id uuid not null references public.pds_versions (id) on delete cascade,
  name text not null,
  address text not null,
  contact text not null check (length(btrim(contact)) > 0),
  sort_order smallint not null check (sort_order between 1 and 3),
  unique (pds_version_id, sort_order)
);

alter table public.documents
  add column training_hours numeric(8, 2),
  add column pds_learning_development_id uuid
    references public.pds_learning_development (id) on delete set null,
  add constraint documents_training_hours_nonnegative
    check (training_hours is null or training_hours >= 0),
  add constraint documents_training_link_requires_hours
    check (pds_learning_development_id is null or training_hours is not null);

create or replace view private.authorized_anonymized_applications
with (security_barrier = true)
as
select
  application.id as application_id,
  application.job_id,
  application.status as application_status,
  application.applied_at,
  applicant.applicant_number,
  application.pds_version_id,
  application.applicant_id
from public.applications as application
join public.job_postings as job on job.id = application.job_id
join public.applicants as applicant on applicant.id = application.applicant_id
join public.pds_versions as pds on pds.id = application.pds_version_id
where pds.status = 'SUBMITTED'
  and (
    (select private.is_role('EVALUATOR'::public.user_role))
    or (
      (select private.is_role('HR'::public.user_role))
      and job.hr_id = (select auth.uid())
    )
  );

create or replace view public.v_anonymized_applicants
with (security_barrier = true)
as
select
  authorized.application_id,
  authorized.job_id,
  authorized.application_status,
  authorized.applied_at,
  authorized.applicant_number,
  coalesce(
    (
      select array_agg(distinct education.level::text order by education.level::text)
      from public.pds_education as education
      where education.pds_version_id = authorized.pds_version_id
    ),
    array[]::text[]
  ) as education_levels,
  coalesce(
    (
      select round(
        sum((coalesce(work.date_to, current_date) - work.date_from)::numeric / 365.25),
        2
      )
      from public.pds_work_experience as work
      where work.pds_version_id = authorized.pds_version_id
    ),
    0
  ) as experience_years,
  coalesce(
    (
      select sum(
        coalesce(
          (
            select certificate.training_hours
            from public.documents as certificate
            join public.document_types as document_type
              on document_type.id = certificate.document_type_id
            where certificate.applicant_id = authorized.applicant_id
              and certificate.pds_learning_development_id = learning.id
              and document_type.name = 'Training and Seminar Certificates'
              and certificate.training_hours is not null
            order by certificate.uploaded_at desc, certificate.version desc
            limit 1
          ),
          learning.hours
        )
      )
      from public.pds_learning_development as learning
      where learning.pds_version_id = authorized.pds_version_id
    ),
    0
  ) + coalesce(
    (
      select sum(certificate.training_hours)
      from public.documents as certificate
      join public.document_types as document_type
        on document_type.id = certificate.document_type_id
      where certificate.applicant_id = authorized.applicant_id
        and certificate.pds_learning_development_id is null
        and document_type.name = 'Training and Seminar Certificates'
        and certificate.training_hours is not null
    ),
    0
  ) as training_hours,
  coalesce(
    (
      select array_agg(distinct other_info.description order by other_info.description)
      from public.pds_other_info as other_info
      where other_info.pds_version_id = authorized.pds_version_id
        and other_info.category = 'SKILL_HOBBY'
    ),
    array[]::text[]
  ) as skills
from private.authorized_anonymized_applications as authorized;

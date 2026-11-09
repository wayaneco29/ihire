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
      select sum(learning.hours)
      from public.pds_learning_development as learning
      where learning.pds_version_id = authorized.pds_version_id
        and not exists (
          select 1
          from public.documents as certificate
          join public.document_types as document_type
            on document_type.id = certificate.document_type_id
          where certificate.applicant_id = authorized.applicant_id
            and certificate.pds_learning_development_id = learning.id
            and document_type.name = 'Training and Seminar Certificates'
        )
    ),
    0
  ) + coalesce(
    (
      select sum(certificate.training_hours)
      from public.documents as certificate
      join public.document_types as document_type
        on document_type.id = certificate.document_type_id
      where certificate.applicant_id = authorized.applicant_id
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

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
          linked_certificate.training_hours,
          learning.hours
        )
      )
      from public.pds_learning_development as learning
      left join lateral (
        select coalesce(
          case
            when latest_review.status = 'VERIFIED'
              then latest_review.confirmed_training_hours
          end,
          certificate.training_hours,
          certificate.ocr_training_hours
        ) as training_hours
        from public.documents as certificate
        join public.document_types as document_type
          on document_type.id = certificate.document_type_id
        left join lateral (
          select review.status, review.confirmed_training_hours
          from public.document_reviews as review
          where review.document_id = certificate.id
          order by review.reviewed_at desc, review.id desc
          limit 1
        ) as latest_review on true
        where certificate.applicant_id = authorized.applicant_id
          and certificate.pds_learning_development_id = learning.id
          and document_type.name = 'Training and Seminar Certificates'
          and coalesce(
            case
              when latest_review.status = 'VERIFIED'
                then latest_review.confirmed_training_hours
            end,
            certificate.training_hours,
            certificate.ocr_training_hours
          ) is not null
        order by certificate.uploaded_at desc, certificate.version desc
        limit 1
      ) as linked_certificate on true
      where learning.pds_version_id = authorized.pds_version_id
    ),
    0
  ) + coalesce(
    (
      select sum(
        coalesce(
          case
            when latest_review.status = 'VERIFIED'
              then latest_review.confirmed_training_hours
          end,
          certificate.training_hours,
          certificate.ocr_training_hours
        )
      )
      from public.documents as certificate
      join public.document_types as document_type
        on document_type.id = certificate.document_type_id
      left join lateral (
        select review.status, review.confirmed_training_hours
        from public.document_reviews as review
        where review.document_id = certificate.id
        order by review.reviewed_at desc, review.id desc
        limit 1
      ) as latest_review on true
      where certificate.applicant_id = authorized.applicant_id
        and certificate.pds_learning_development_id is null
        and document_type.name = 'Training and Seminar Certificates'
        and coalesce(
          case
            when latest_review.status = 'VERIFIED'
              then latest_review.confirmed_training_hours
          end,
          certificate.training_hours,
          certificate.ocr_training_hours
        ) is not null
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
  ) as skills,
  position.title as position_title,
  position.track as position_track
from private.authorized_anonymized_applications as authorized
left join public.applications as application
  on application.id = authorized.application_id
left join public.positions as position
  on position.id = application.position_id;
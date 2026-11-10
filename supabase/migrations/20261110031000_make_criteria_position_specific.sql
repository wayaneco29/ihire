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
          and not exists (
            select 1
            from public.documents as replacement
            where replacement.replaces_document_id = certificate.id
          )
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
        and not exists (
          select 1
          from public.documents as replacement
          where replacement.replaces_document_id = certificate.id
        )
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
  case application_type.name
    when 'teaching' then 'TEACHING'
    when 'non-teaching' then 'NON_TEACHING'
  end as position_track
from private.authorized_anonymized_applications as authorized
left join public.applications as application
  on application.id = authorized.application_id
left join public.positions as position
  on position.id = application.position_id
left join public.application_type
  on application_type.id = position.application_type_id;

drop policy if exists positions_read_authenticated on public.positions;
drop policy if exists positions_create_hr on public.positions;

alter table public.position_criteria
  drop constraint position_criteria_track_key_unique,
  drop constraint position_criteria_track_order_unique,
  add column position_id uuid;

insert into public.position_criteria (
  position_id,
  track,
  criterion_key,
  title,
  display_order
)
select
  position.id,
  legacy_criterion.track,
  legacy_criterion.criterion_key,
  legacy_criterion.title,
  legacy_criterion.display_order
from public.positions as position
join public.application_type
  on application_type.id = position.application_type_id
join public.position_criteria as legacy_criterion
  on legacy_criterion.position_id is null
  and application_type.name = case legacy_criterion.track
    when 'TEACHING' then 'teaching'
    when 'NON_TEACHING' then 'non-teaching'
  end;

create temporary table position_criteria_migration_map as
select
  legacy_criterion.id as legacy_criterion_id,
  position.id as position_id,
  position_criterion.id as position_criterion_id
from public.position_criteria as legacy_criterion
join public.application_type
  on application_type.name = case legacy_criterion.track
    when 'TEACHING' then 'teaching'
    when 'NON_TEACHING' then 'non-teaching'
  end
join public.positions as position
  on position.application_type_id = application_type.id
join public.position_criteria as position_criterion
  on position_criterion.position_id = position.id
  and position_criterion.criterion_key = legacy_criterion.criterion_key
where legacy_criterion.position_id is null;

update public.position_criterion_weights as weight
set criterion_id = migration.position_criterion_id
from public.position_weight_profiles as profile
join position_criteria_migration_map as migration
  on migration.position_id = profile.position_id
where weight.profile_id = profile.id
  and weight.criterion_id = migration.legacy_criterion_id;

do $$
begin
  if exists (
    select 1
    from public.application_criterion_scores as score
    join public.applications as application
      on application.id = score.application_id
    join public.position_criteria as criterion
      on criterion.id = score.criterion_id
      and criterion.position_id is null
    where not exists (
      select 1
      from position_criteria_migration_map as migration
      where migration.legacy_criterion_id = score.criterion_id
        and migration.position_id = application.position_id
    )
  ) then
    raise exception 'Cannot migrate criterion scores for applications without a saved position.';
  end if;
end;
$$;

update public.application_criterion_scores as score
set criterion_id = migration.position_criterion_id
from public.applications as application
join position_criteria_migration_map as migration
  on migration.position_id = application.position_id
where score.application_id = application.id
  and score.criterion_id = migration.legacy_criterion_id;

delete from public.position_criteria
where position_id is null;

alter table public.position_criteria
  alter column position_id set not null,
  drop column track,
  add constraint position_criteria_position_id_fkey
    foreign key (position_id)
    references public.positions (id)
    on delete restrict,
  add constraint position_criteria_position_key_unique
    unique (position_id, criterion_key),
  add constraint position_criteria_position_order_unique
    unique (position_id, display_order);

drop table position_criteria_migration_map;

alter table public.positions
  drop constraint positions_track_title_unique,
  drop column track,
  drop column is_active,
  drop column created_by,
  drop column created_at,
  add constraint positions_application_type_title_unique
    unique (application_type_id, title);

create policy positions_read_authenticated
on public.positions for select to authenticated
using (true);

create policy positions_create_hr
on public.positions for insert to authenticated
with check ((select private.is_role('HR'::public.user_role)));

create or replace function public.seed_position_criteria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.position_criteria (
    position_id,
    criterion_key,
    title,
    display_order
  )
  select
    new.id,
    criterion.criterion_key,
    criterion.title,
    criterion.display_order
  from public.application_type
  cross join (
    values
      ('teaching', 'EDUCATION', 'Education', 1),
      ('teaching', 'TRAINING', 'Training', 2),
      ('teaching', 'EXPERIENCE', 'Experience', 3),
      ('teaching', 'PERFORMANCE', 'Performance', 4),
      ('teaching', 'CLASSROOM_OBSERVATION', 'Classroom Observation/Demo Teaching (PPST COIs)', 5),
      ('teaching', 'TEACHER_REFLECTION', 'Teacher Reflection Form (PPST NCOIs)', 6),
      ('non-teaching', 'EDUCATION', 'Education', 1),
      ('non-teaching', 'TRAINING', 'Training', 2),
      ('non-teaching', 'EXPERIENCE', 'Experience', 3),
      ('non-teaching', 'PERFORMANCE', 'Performance', 4),
      ('non-teaching', 'ACCOMPLISHMENTS', 'Accomplishments', 5),
      ('non-teaching', 'APPLICATION_OF_EDUCATION', 'Application of Education', 6),
      ('non-teaching', 'APPLICATION_OF_LEARNING', 'Application of Learning and Development', 7),
      ('non-teaching', 'POTENTIAL', 'Potential', 8)
  ) as criterion(application_type_name, criterion_key, title, display_order)
  where public.application_type.id = new.application_type_id
    and criterion.application_type_name = public.application_type.name;

  return new;
end;
$$;

revoke all on function public.seed_position_criteria() from public, anon, authenticated;

create trigger positions_seed_criteria_after_insert
after insert on public.positions
for each row
execute function public.seed_position_criteria();

create or replace function public.save_position_weight_profile(
  p_position_id uuid,
  p_weights jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_position_id uuid;
  next_version integer;
  new_profile_id uuid;
  submitted_count integer;
  unique_criterion_count integer;
  matching_criterion_count integer;
  total_points numeric;
begin
  if not (select private.is_role('HR'::public.user_role)) then
    raise exception 'HR access is required.' using errcode = '42501';
  end if;

  if p_weights is null or jsonb_typeof(p_weights) <> 'array' then
    raise exception 'Enter a weight for every criterion.' using errcode = '22023';
  end if;

  select position.id
  into target_position_id
  from public.positions as position
  where position.id = p_position_id
  for update;

  if target_position_id is null then
    raise exception 'This position is unavailable.' using errcode = 'P0002';
  end if;

  select count(*), count(distinct submitted.criterion_id), sum(submitted.points)
  into submitted_count, unique_criterion_count, total_points
  from jsonb_to_recordset(p_weights) as submitted(
    criterion_id uuid,
    points numeric
  );

  select count(*)
  into matching_criterion_count
  from public.position_criteria as criterion
  join jsonb_to_recordset(p_weights) as submitted(
    criterion_id uuid,
    points numeric
  ) on submitted.criterion_id = criterion.id
  where criterion.position_id = target_position_id
    and submitted.points between 0 and 100
    and submitted.points = round(submitted.points, 2);

  if submitted_count <> matching_criterion_count
    or unique_criterion_count <> matching_criterion_count
    or matching_criterion_count <> (
      select count(*)
      from public.position_criteria as criterion
      where criterion.position_id = target_position_id
    )
    or total_points <> 100
  then
    raise exception 'Enter a valid weight for every criterion. The total must equal 100.'
      using errcode = '22023';
  end if;

  select coalesce(max(profile.version), 0) + 1
  into next_version
  from public.position_weight_profiles as profile
  where profile.position_id = p_position_id;

  insert into public.position_weight_profiles (
    position_id, version, created_by
  )
  values (p_position_id, next_version, (select auth.uid()))
  returning id into new_profile_id;

  insert into public.position_criterion_weights (
    profile_id, criterion_id, points
  )
  select new_profile_id, submitted.criterion_id, submitted.points
  from jsonb_to_recordset(p_weights) as submitted(
    criterion_id uuid,
    points numeric
  );

  update public.position_weight_profiles
  set is_current = false
  where position_id = p_position_id
    and is_current;

  update public.position_weight_profiles
  set is_current = true
  where id = new_profile_id;

  return new_profile_id;
end;
$$;

create or replace function public.set_job_posting_positions(
  p_job_id uuid,
  p_position_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_count integer;
  configured_count integer;
  current_ids uuid[];
  requested_ids uuid[];
begin
  if not (select private.is_role('HR'::public.user_role))
    or not (select private.hr_owns_job(p_job_id))
  then
    raise exception 'This job posting is unavailable.' using errcode = '42501';
  end if;

  requested_ids := coalesce(p_position_ids, array[]::uuid[]);
  selected_count := cardinality(requested_ids);

  if selected_count = 0 then
    raise exception 'Select at least one position.' using errcode = '22023';
  end if;

  if selected_count <> (
    select count(distinct selected.position_id)
    from unnest(requested_ids) as selected(position_id)
  ) then
    raise exception 'Do not select a position more than once.' using errcode = '22023';
  end if;

  select count(*)
  into configured_count
  from public.positions as position
  join public.position_weight_profiles as profile
    on profile.position_id = position.id
    and profile.is_current
  where position.id = any(requested_ids);

  if configured_count <> selected_count then
    raise exception 'Every selected position must have a published 100-point weight profile.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.applications as application
    where application.job_id = p_job_id
  ) then
    select coalesce(array_agg(link.position_id order by link.position_id), array[]::uuid[])
    into current_ids
    from public.job_posting_positions as link
    where link.job_id = p_job_id;

    select coalesce(array_agg(selected.position_id order by selected.position_id), array[]::uuid[])
    into requested_ids
    from unnest(requested_ids) as selected(position_id);

    if current_ids is distinct from requested_ids then
      raise exception 'Positions cannot change after applications have been received.'
        using errcode = 'P0001';
    end if;

    return;
  end if;

  delete from public.job_posting_positions
  where job_id = p_job_id;

  insert into public.job_posting_positions (
    job_id, position_id, weight_profile_id
  )
  select p_job_id, position.id, profile.id
  from public.positions as position
  join public.position_weight_profiles as profile
    on profile.position_id = position.id
    and profile.is_current
  where position.id = any(requested_ids);
end;
$$;

create or replace function public.apply_to_job(
  p_job_id uuid,
  p_position_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_applicant_id uuid;
  target_pds_id uuid;
  target_hr_id uuid;
  target_job_title text;
  target_position_title text;
  existing_application_id uuid;
  new_application_id uuid;
  target_applicant_number text;
begin
  if not (select private.is_role('APPLICANT'::public.user_role)) then
    raise exception 'Only applicants can apply to a job.' using errcode = '42501';
  end if;

  select applicant.id, applicant.applicant_number
  into target_applicant_id, target_applicant_number
  from public.applicants as applicant
  where applicant.profile_id = (select auth.uid())
  for update;

  if target_applicant_id is null then
    raise exception 'Applicant profile was not found.' using errcode = 'P0002';
  end if;

  select job.hr_id, job.title
  into target_hr_id, target_job_title
  from public.job_postings as job
  where job.id = p_job_id
    and job.status = 'OPEN'
    and (job.deadline is null or job.deadline > now())
  for share;

  if target_hr_id is null then
    raise exception 'The job is not open for applications.' using errcode = 'P0002';
  end if;

  select position.title
  into target_position_title
  from public.job_posting_positions as job_position
  join public.positions as position
    on position.id = job_position.position_id
  where job_position.job_id = p_job_id
    and job_position.position_id = p_position_id;

  if target_position_title is null then
    raise exception 'Choose a position included in this job posting.'
      using errcode = '22023';
  end if;

  select pds.id
  into target_pds_id
  from public.pds_versions as pds
  where pds.applicant_id = target_applicant_id
    and pds.status = 'SUBMITTED'
  order by pds.version_no desc
  limit 1;

  if target_pds_id is null then
    raise exception 'Submit a PDS before applying.' using errcode = 'P0001';
  end if;

  select application.id
  into existing_application_id
  from public.applications as application
  where application.job_id = p_job_id
    and application.applicant_id = target_applicant_id;

  if existing_application_id is not null then
    return existing_application_id;
  end if;

  insert into public.applications (
    job_id,
    applicant_id,
    position_id,
    pds_version_id,
    status
  )
  values (
    p_job_id,
    target_applicant_id,
    p_position_id,
    target_pds_id,
    'SUBMITTED'
  )
  returning id into new_application_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    target_hr_id,
    'APPLICATION_SUBMITTED',
    'New application received',
    'Applicant ' || target_applicant_number || ' applied for '
      || target_position_title || ' in ' || target_job_title || '.',
    '/hr/applications/' || new_application_id::text
  );

  insert into public.notifications (user_id, type, title, body, link)
  select
    profile.id,
    'APPLICATION_FOR_EVALUATION',
    'Application ready for evaluation',
    'Applicant ' || target_applicant_number || ' applied for '
      || target_position_title || ' in ' || target_job_title || '.',
    '/evaluator/applications/' || new_application_id::text
  from public.profiles as profile
  where profile.role = 'EVALUATOR';

  return new_application_id;
end;
$$;

revoke all on function public.save_position_weight_profile(uuid, jsonb)
  from public, anon;
grant execute on function public.save_position_weight_profile(uuid, jsonb)
  to authenticated;
revoke all on function public.set_job_posting_positions(uuid, uuid[])
  from public, anon;
grant execute on function public.set_job_posting_positions(uuid, uuid[])
  to authenticated;
revoke all on function public.apply_to_job(uuid, uuid) from public, anon;
grant execute on function public.apply_to_job(uuid, uuid) to authenticated;

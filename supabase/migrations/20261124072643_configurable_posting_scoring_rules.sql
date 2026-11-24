-- Extend immutable weight profiles: a posting-specific profile is an ordinary
-- non-current version, so existing assessment limits and totals remain consistent.
alter table public.position_criterion_weights
  add column minimum_level smallint check (minimum_level between 1 and 31),
  add column bands jsonb not null default '[]'::jsonb;
alter table public.job_postings add column scoring_locked_at timestamptz;
revoke update (base_qualification_level, base_training_increment_level, base_experience_increment_level)
  on public.positions from authenticated;
update public.job_postings set scoring_locked_at = now()
where status <> 'DRAFT' or exists (select 1 from public.applications a where a.job_id = job_postings.id);

-- Store historical band thresholds as direct applicant levels. Offsetting by
-- the old minimum preserves existing published results under the new lookup.
update public.position_criterion_weights w
set minimum_level = case c.criterion_key
  when 'EDUCATION' then p.base_qualification_level
  when 'TRAINING' then p.base_training_increment_level
  when 'EXPERIENCE' then p.base_experience_increment_level end,
  bands = (select jsonb_agg(jsonb_build_object('threshold', case when n = 0 then 0 else
    coalesce(case c.criterion_key when 'EDUCATION' then p.base_qualification_level
      when 'TRAINING' then p.base_training_increment_level
      when 'EXPERIENCE' then p.base_experience_increment_level end, 0) + n * 2 end, 'points',
    round(w.points * n / 5, case when c.criterion_key = 'EDUCATION' then 0 else 2 end)) order by n)
    from generate_series(0, 5) n)
from public.position_criteria c, public.positions p
where c.id = w.criterion_id and p.id = c.position_id
  and c.criterion_key in ('EDUCATION', 'TRAINING', 'EXPERIENCE');

create function private.validate_scoring_rules(p_position_id uuid, p_rules jsonb, p_complete boolean)
returns void language plpgsql set search_path = '' as $$
declare r record; b record; previous_threshold integer; previous_points numeric; maximum_reachable boolean;
begin
  if p_rules is null or jsonb_typeof(p_rules) <> 'array' then
    raise exception 'Provide scoring rules for every criterion.' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_array_elements(p_rules)) < 1
    or (select count(*) from jsonb_to_recordset(p_rules) x(criterion_id uuid)) <>
      (select count(distinct criterion_id) from jsonb_to_recordset(p_rules) x(criterion_id uuid))
    or (select count(*) from jsonb_array_elements(p_rules)) <>
      (select count(*) from public.position_criteria where position_id = p_position_id)
    or (select sum(points) from jsonb_to_recordset(p_rules) x(points numeric)) is distinct from 100::numeric
  then raise exception 'Provide every criterion once; maximum points must total 100.' using errcode = '22023'; end if;
  for r in select x.*, c.criterion_key from jsonb_to_recordset(p_rules)
    x(criterion_id uuid, points numeric, minimum_level numeric, bands jsonb)
    left join public.position_criteria c on c.id = x.criterion_id and c.position_id = p_position_id
  loop
    if r.criterion_key is null or r.points is null or r.points not between 0 and 100
      or r.points <> round(r.points, 2) or (r.minimum_level is not null and
        (r.minimum_level not between 1 and 31 or r.minimum_level <> trunc(r.minimum_level)))
    then raise exception 'Invalid criterion, maximum points, or minimum level.' using errcode = '22023'; end if;
    if r.criterion_key not in ('EDUCATION', 'TRAINING', 'EXPERIENCE') then continue; end if;
    if r.bands is null or jsonb_typeof(r.bands) <> 'array' then
      raise exception 'Provide comparison bands.' using errcode = '22023'; end if;
    if jsonb_array_length(r.bands) not between 1 and 32 then
      raise exception 'Provide between 1 and 32 comparison bands.' using errcode = '22023'; end if;
    previous_threshold := -1; previous_points := -1; maximum_reachable := r.points = 0;
    for b in select * from jsonb_to_recordset(r.bands) x(threshold numeric, points numeric) loop
      if b.threshold is null or b.points is null or b.threshold <> trunc(b.threshold)
        or b.threshold not between 0 and 61 or b.threshold <= previous_threshold
        or (previous_threshold = -1 and b.threshold <> 0)
        or b.points < previous_points or b.points not between 0 and r.points or b.points <> round(b.points, 2)
      then raise exception 'Bands must start at 0, have ascending unique thresholds, and nondecreasing points within the maximum.' using errcode = '22023'; end if;
      maximum_reachable := maximum_reachable or (b.points = r.points and b.threshold <= 31);
      previous_threshold := b.threshold; previous_points := b.points;
    end loop;
    if p_complete and r.points > 0 and (r.minimum_level is null or not coalesce(maximum_reachable, false)) then
      raise exception '%: set a minimum level and a reachable full-score band.', r.criterion_key using errcode = '22023';
    end if;
  end loop;
end $$;

create function private.create_scoring_profile(p_position_id uuid, p_rules jsonb, p_current boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; next_version integer;
begin
  if auth.uid() is null or not private.is_role('HR') then raise exception 'HR access is required.' using errcode = '42501'; end if;
  perform id from public.positions where id = p_position_id for update;
  if not found then raise exception 'Position unavailable.' using errcode = '22023'; end if;
  perform private.validate_scoring_rules(p_position_id, p_rules, p_current);
  select coalesce(max(version), 0) + 1 into next_version from public.position_weight_profiles where position_id = p_position_id;
  insert into public.position_weight_profiles(position_id, version, created_by)
    values(p_position_id, next_version, auth.uid()) returning id into result;
  insert into public.position_criterion_weights(profile_id, criterion_id, points, minimum_level, bands)
    select result, x.criterion_id, x.points, x.minimum_level, coalesce(x.bands, '[]'::jsonb)
    from jsonb_to_recordset(p_rules) x(criterion_id uuid, points numeric, minimum_level smallint, bands jsonb);
  if p_current then
    update public.position_weight_profiles set is_current = false where position_id = p_position_id and is_current;
    update public.position_weight_profiles set is_current = true where id = result;
    -- Maintain legacy display fields; scoring always uses the immutable profile.
    update public.positions set
      base_qualification_level = (select w.minimum_level from public.position_criterion_weights w join public.position_criteria c on c.id = w.criterion_id where w.profile_id = result and c.criterion_key = 'EDUCATION'),
      base_training_increment_level = (select w.minimum_level from public.position_criterion_weights w join public.position_criteria c on c.id = w.criterion_id where w.profile_id = result and c.criterion_key = 'TRAINING'),
      base_experience_increment_level = (select w.minimum_level from public.position_criterion_weights w join public.position_criteria c on c.id = w.criterion_id where w.profile_id = result and c.criterion_key = 'EXPERIENCE')
    where id = p_position_id;
  end if;
  return result;
end $$;
create function public.save_position_scoring_profile(p_position_id uuid, p_rules jsonb)
returns uuid language sql set search_path = '' as $$ select private.create_scoring_profile(p_position_id, p_rules, true) $$;

create function public.scoring_band_points(p_minimum integer, p_maximum numeric, p_bands jsonb, p_level integer)
returns numeric language sql immutable set search_path = '' as $$
 select case when p_maximum = 0 then 0
   when p_minimum is null or p_level is null or p_level not between 1 and 31 then null
   when p_level < p_minimum then 0
   else (select b.points from jsonb_to_recordset(p_bands) b(threshold integer, points numeric)
     where b.threshold <= p_level order by b.threshold desc limit 1) end
$$;

-- An immutable profile can be shared until a draft posting customizes it.
-- Never delete/reinsert unchanged selections: that used to silently refresh defaults.
create or replace function public.set_job_posting_positions(p_job_id uuid, p_position_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare existing_ids uuid[]; requested_ids uuid[]; locked timestamptz;
begin
  if auth.uid() is null or not private.is_role('HR') or not private.hr_owns_job(p_job_id) then
    raise exception 'Posting unavailable.' using errcode = '42501'; end if;
  select scoring_locked_at into locked from public.job_postings where id = p_job_id for update;
  select array_agg(position_id order by position_id) into existing_ids from public.job_posting_positions where job_id = p_job_id;
  select array_agg(selected.position_id order by selected.position_id)
    into requested_ids
  from unnest(p_position_ids) as selected(position_id);
  if coalesce(cardinality(requested_ids), 0) = 0 or cardinality(requested_ids) <>
    (select count(distinct selected.position_id)
      from unnest(requested_ids) as selected(position_id)) then
    raise exception 'Select each position once.' using errcode = '22023'; end if;
  if existing_ids is not distinct from requested_ids then return; end if;
  if locked is not null or exists(select 1 from public.applications where job_id = p_job_id) then
    raise exception 'Positions cannot change after publication or receipt of applications.' using errcode = '22023'; end if;
  if exists(
    select 1 from unnest(requested_ids) as selected(position_id)
    where not exists(
      select 1 from public.positions p
      join public.position_weight_profiles f on f.position_id = p.id and f.is_current
      where p.id = selected.position_id
        and (p.is_active or p.id = any(coalesce(existing_ids, array[]::uuid[])))
    )
  ) then
    raise exception 'Select configured active positions.' using errcode = '22023'; end if;
  delete from public.job_posting_positions where job_id = p_job_id and not(position_id = any(requested_ids));
  insert into public.job_posting_positions(job_id, position_id, weight_profile_id)
    select p_job_id, f.position_id, f.id from public.position_weight_profiles f
    where f.is_current and f.position_id = any(requested_ids)
    on conflict(job_id, position_id) do nothing;
end $$;

create function private.save_posting_scoring(p_job_id uuid, p_scoring jsonb, p_publish boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare item record; link record; saved_rules jsonb; candidate_rules jsonb; profile uuid; locked timestamptz;
begin
  if auth.uid() is null or not private.is_role('HR') or not private.hr_owns_job(p_job_id) then
    raise exception 'Posting unavailable.' using errcode = '42501'; end if;
  select scoring_locked_at into locked from public.job_postings where id = p_job_id for update;
  if p_scoring is not null then
    if jsonb_typeof(p_scoring) <> 'array' then raise exception 'Invalid scoring configuration.' using errcode = '22023'; end if;
    if (select count(*) from jsonb_array_elements(p_scoring)) <> (select count(*) from public.job_posting_positions where job_id = p_job_id)
      or (select count(distinct x.position_id) from jsonb_to_recordset(p_scoring) x(position_id uuid)) <> jsonb_array_length(p_scoring)
    then raise exception 'Provide rules for each selected position once.' using errcode = '22023'; end if;
    for item in select * from jsonb_to_recordset(p_scoring) x(position_id uuid, rules jsonb) loop
      select * into link from public.job_posting_positions where job_id = p_job_id and position_id = item.position_id;
      if not found then raise exception 'Position is not in this posting.' using errcode = '22023'; end if;
      -- Compare canonical fields; clients may include titles for presentation.
      select jsonb_agg(jsonb_build_object('criterion_id', w.criterion_id, 'points', w.points, 'minimum_level', w.minimum_level, 'bands', w.bands) order by w.criterion_id)
        into saved_rules from public.position_criterion_weights w where w.profile_id = link.weight_profile_id;
      select jsonb_agg(jsonb_build_object('criterion_id', x.criterion_id, 'points', x.points, 'minimum_level', x.minimum_level, 'bands', x.bands) order by x.criterion_id)
        into candidate_rules from jsonb_to_recordset(item.rules) x(criterion_id uuid, points numeric, minimum_level integer, bands jsonb);
      if candidate_rules is distinct from saved_rules then
        if locked is not null then raise exception 'Scoring rules are locked after publication.' using errcode = '22023'; end if;
        profile := private.create_scoring_profile(item.position_id, candidate_rules, false);
        update public.job_posting_positions set weight_profile_id = profile where job_id = p_job_id and position_id = item.position_id;
      end if;
    end loop;
  end if;
  if p_publish and locked is null then
    for link in select * from public.job_posting_positions where job_id = p_job_id loop
      select jsonb_agg(jsonb_build_object('criterion_id', w.criterion_id, 'points', w.points, 'minimum_level', w.minimum_level, 'bands', w.bands) order by w.criterion_id)
        into saved_rules from public.position_criterion_weights w where w.profile_id = link.weight_profile_id;
      perform private.validate_scoring_rules(link.position_id, saved_rules, true);
    end loop;
    update public.job_postings set scoring_locked_at = now() where id = p_job_id;
  end if;
end $$;

-- Merge overlapping employment periods before calculating calendar months,
-- matching calculatePublicTeachingExperience (exclusive end, UTC today).
create function private.public_teaching_months(p_pds uuid)
returns numeric language sql stable set search_path = '' as $$
with periods as (
 select date_from s, least(coalesce(date_to, (now() at time zone 'UTC')::date), (now() at time zone 'UTC')::date) e
 from public.pds_work_experience where pds_version_id = p_pds and is_gov_service
 and position_title ~* '\m(teachers?|instructors?|educators?)\M'
), preceding as (
 select *, max(e) over(order by s, e rows between unbounded preceding and 1 preceding) previous_end from periods where e > s
), grouped as (
 select *, sum(case when previous_end is null or s > previous_end then 1 else 0 end) over(order by s, e) grp from preceding
), merged as (select min(s) s, max(e) e from grouped group by grp), months as (
 select *, ((extract(year from e) - extract(year from s))*12 + extract(month from e) - extract(month from s))::integer n from merged
), adjusted as (select *, n - case when (s + make_interval(months => n))::date > e then 1 else 0 end whole from months), anchors as (
 select *, (s + make_interval(months => whole))::date anchor, (s + make_interval(months => whole + 1))::date next_anchor from adjusted
)
select coalesce(sum(whole + (e - anchor)::numeric / (next_anchor - anchor)), 0) from anchors
$$;

-- The caller supplies only an application ID; no applicant levels or awarded
-- points are accepted. Authorization is checked before reading private PDS data.
create function private.application_scoring(p_application_id uuid)
returns table(criterion_key text, applicant_level integer, minimum_level integer, maximum_points numeric, points numeric, matched_threshold integer)
language plpgsql stable security definer set search_path = '' as $$
declare app public.applications; education integer; training numeric; experience integer;
begin
  if auth.uid() is null or not (private.owns_application(p_application_id)
    or exists(select 1 from private.authorized_anonymized_applications where application_id = p_application_id)) then
    raise exception 'Application unavailable.' using errcode = '42501'; end if;
  select * into app from public.applications where id = p_application_id;
  select max(qualification_level) into education from public.pds_education where pds_version_id = app.pds_version_id;
  select coalesce(
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
        where certificate.applicant_id = app.applicant_id
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
      where learning.pds_version_id = app.pds_version_id
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
      where certificate.applicant_id = app.applicant_id
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
  ) into training;
  experience := least(31, floor(private.public_teaching_months(app.pds_version_id) / 6)::integer + 1);
  return query select c.criterion_key, levels.level, w.minimum_level::integer, w.points,
    public.scoring_band_points(w.minimum_level::integer, w.points, w.bands, levels.level),
    (select b.threshold from jsonb_to_recordset(w.bands) b(threshold integer, points numeric)
      where levels.level >= w.minimum_level and b.threshold <= levels.level
      order by b.threshold desc limit 1)
  from public.job_posting_positions j
  join public.position_criterion_weights w on w.profile_id = j.weight_profile_id
  join public.position_criteria c on c.id = w.criterion_id
  cross join lateral (select case c.criterion_key when 'EDUCATION' then education
    when 'TRAINING' then least(31, floor(training / 8)::integer + 1) when 'EXPERIENCE' then experience end level) levels
  where j.job_id = app.job_id and j.position_id = coalesce(app.position_id,
    (select min(position_id::text)::uuid from public.job_posting_positions where job_id = app.job_id having count(*) = 1))
    and c.criterion_key in ('EDUCATION', 'TRAINING', 'EXPERIENCE');
end $$;
create function public.application_scoring(p_application_id uuid)
returns table(criterion_key text, applicant_level integer, minimum_level integer, maximum_points numeric, points numeric, matched_threshold integer)
language sql stable set search_path = '' as $$ select * from private.application_scoring(p_application_id) $$;
create view public.v_application_scoring with (security_invoker = true) as
 select a.id application_id, s.* from public.applications a cross join lateral public.application_scoring(a.id) s;
grant select on public.v_application_scoring to authenticated;

revoke all on function private.validate_scoring_rules(uuid,jsonb,boolean), private.create_scoring_profile(uuid,jsonb,boolean),
 private.save_posting_scoring(uuid,jsonb,boolean), private.public_teaching_months(uuid), private.application_scoring(uuid),
 public.application_scoring(uuid), public.save_position_scoring_profile(uuid,jsonb), public.scoring_band_points(integer,numeric,jsonb,integer)
 from public, anon, authenticated;
grant execute on function private.create_scoring_profile(uuid,jsonb,boolean), private.application_scoring(uuid),
 public.application_scoring(uuid), public.save_position_scoring_profile(uuid,jsonb), public.scoring_band_points(integer,numeric,jsonb,integer) to authenticated;
-- Prevent legacy API calls from creating incomplete profiles after rollout.
revoke execute on function public.save_position_weight_profile(uuid,jsonb) from authenticated;

create function private.save_scored_posting(
 p_job_id uuid, p_title text, p_description text, p_requirements text, p_slots integer,
 p_status public.job_status, p_deadline timestamptz, p_position_ids uuid[], p_scoring jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
 if auth.uid() is null or not private.is_role('HR') then raise exception 'HR access is required.' using errcode = '42501'; end if;
 if p_job_id is null then
   result := public.create_job_posting_with_positions(p_title,p_description,p_requirements,p_slots,'DRAFT',p_deadline,p_position_ids);
 else
   if not private.hr_owns_job(p_job_id) then raise exception 'Posting unavailable.' using errcode = '42501'; end if;
   perform id from public.job_postings where id = p_job_id for update;
   result := public.update_job_posting_with_positions(p_job_id,p_title,p_description,p_requirements,p_slots,
     (select status from public.job_postings where id = p_job_id),p_deadline,p_position_ids);
 end if;
 perform private.save_posting_scoring(result, p_scoring, p_status <> 'DRAFT');
 perform public.update_job_posting_with_positions(result,p_title,p_description,p_requirements,p_slots,p_status,p_deadline,p_position_ids);
 return result;
end $$;
create function public.save_scored_posting(
 p_job_id uuid, p_title text, p_description text, p_requirements text, p_slots integer,
 p_status public.job_status, p_deadline timestamptz, p_position_ids uuid[], p_scoring jsonb
) returns uuid language sql set search_path = '' as $$
 select private.save_scored_posting(p_job_id,p_title,p_description,p_requirements,p_slots,p_status,p_deadline,p_position_ids,p_scoring)
$$;
revoke all on function private.save_scored_posting(uuid,text,text,text,integer,public.job_status,timestamptz,uuid[],jsonb),
 public.save_scored_posting(uuid,text,text,text,integer,public.job_status,timestamptz,uuid[],jsonb) from public, anon;
grant execute on function private.save_scored_posting(uuid,text,text,text,integer,public.job_status,timestamptz,uuid[],jsonb),
 public.save_scored_posting(uuid,text,text,text,integer,public.job_status,timestamptz,uuid[],jsonb) to authenticated;
revoke execute on function public.create_job_posting_with_positions(text,text,text,integer,public.job_status,timestamptz,uuid[]),
 public.update_job_posting_with_positions(uuid,text,text,text,integer,public.job_status,timestamptz,uuid[]) from authenticated;
notify pgrst, 'reload schema';

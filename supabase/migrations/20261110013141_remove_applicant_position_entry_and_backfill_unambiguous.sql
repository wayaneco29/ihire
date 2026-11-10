drop function if exists public.set_application_position(uuid, uuid);

with single_position_jobs as (
  select
    job_id,
    (array_agg(position_id))[1] as position_id
  from public.job_posting_positions
  group by job_id
  having count(*) = 1
)
update public.applications as application
set position_id = single_position_jobs.position_id
from single_position_jobs
where application.position_id is null
  and application.job_id = single_position_jobs.job_id;
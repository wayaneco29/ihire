-- Reconcile postings that reached capacity before the NOT_SELECTED transition
-- was deployed. The regular hire flow handles newly filled postings.
with filled_postings as (
  select job.id
  from public.job_postings as job
  join public.applications as hired
    on hired.job_id = job.id
   and hired.status = 'HIRED'::public.application_status
  group by job.id, job.slots
  having count(*) >= job.slots
)
update public.job_postings as job
set status = 'CLOSED'::public.job_status,
    updated_at = now()
from filled_postings as filled
where job.id = filled.id
  and job.status = 'OPEN'::public.job_status;

with filled_postings as (
  select job.id
  from public.job_postings as job
  join public.applications as hired
    on hired.job_id = job.id
   and hired.status = 'HIRED'::public.application_status
  group by job.id, job.slots
  having count(*) >= job.slots
)
update public.applications as applicant
set status = 'NOT_SELECTED'::public.application_status
from filled_postings as filled
where applicant.job_id = filled.id
  and applicant.status = 'QUALIFIED'::public.application_status;

-- SDS and ASDS can inspect all postings and their position labels. These roles
-- remain read-only; hiring continues through the SDS-only RPC.
create policy job_postings_read_sds_asds
on public.job_postings for select to authenticated
using (
  (select private.is_role('SDS'::public.user_role))
  or (select private.is_role('ASDS'::public.user_role))
);

create policy job_posting_positions_read_sds_asds
on public.job_posting_positions for select to authenticated
using (
  (select private.is_role('SDS'::public.user_role))
  or (select private.is_role('ASDS'::public.user_role))
);

-- This server-owned view exposes only decisions made by an SDS, and only to
-- SDS/ASDS sessions. The public wrapper is role-gated before any rows escape.
create or replace view private.authorized_sds_decision_history
with (security_barrier = true) as
select decision.id as decision_id,
  decision.application_id,
  application.job_id,
  application.applicant_name,
  application.applicant_number,
  application.job_title,
  application.position_title,
  decision.decision,
  decision.decided_at,
  decision.decision_remarks,
  actor.email as decided_by_email
from public.hiring_decisions decision
join public.profiles actor
  on actor.id = decision.hr_id
  and actor.role = 'SDS'::public.user_role
join private.authorized_staff_applications application
  on application.application_id = decision.application_id
where (select private.is_role('SDS'::public.user_role))
   or (select private.is_role('ASDS'::public.user_role));

revoke all on private.authorized_sds_decision_history
  from public, anon, authenticated;

create or replace view public.v_staff_sds_decision_history
with (security_barrier = true) as
select decision_id, application_id, job_id, applicant_name, applicant_number,
  job_title, position_title, decision, decided_at, decision_remarks,
  decided_by_email
from private.authorized_sds_decision_history;

revoke all on public.v_staff_sds_decision_history from public, anon;
grant select on public.v_staff_sds_decision_history to authenticated;

create index if not exists hiring_decisions_decided_at_idx
  on public.hiring_decisions (decided_at desc, id desc);

notify pgrst, 'reload schema';

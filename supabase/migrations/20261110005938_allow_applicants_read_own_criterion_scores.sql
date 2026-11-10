create policy application_criterion_scores_read_own_application
on public.application_criterion_scores for select to authenticated
using (
  (select private.is_role('APPLICANT'::public.user_role))
  and (select private.owns_application(application_id))
);
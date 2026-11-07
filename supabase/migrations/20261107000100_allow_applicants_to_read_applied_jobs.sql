drop policy if exists job_postings_read_visible on public.job_postings;

create policy job_postings_read_visible
on public.job_postings for select to authenticated
using (
  (
    (select private.is_role('APPLICANT'::public.user_role))
    and (
      status = 'OPEN'
      or exists (
        select 1
        from public.applications as application
        where application.job_id = job_postings.id
          and (select private.owns_application(application.id))
      )
    )
  )
  or (
    (select private.is_role('HR'::public.user_role))
    and hr_id = (select auth.uid())
  )
  or (
    (select private.is_role('EVALUATOR'::public.user_role))
    and status <> 'DRAFT'
  )
);

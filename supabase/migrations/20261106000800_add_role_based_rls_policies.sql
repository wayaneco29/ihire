revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter table public.profiles enable row level security;
alter table public.applicants enable row level security;
alter table public.invitations enable row level security;
alter table public.notifications enable row level security;
alter table public.pds_versions enable row level security;
alter table public.pds_personal_info enable row level security;
alter table public.pds_addresses enable row level security;
alter table public.pds_family_background enable row level security;
alter table public.pds_children enable row level security;
alter table public.pds_education enable row level security;
alter table public.pds_eligibility enable row level security;
alter table public.pds_work_experience enable row level security;
alter table public.pds_voluntary_work enable row level security;
alter table public.pds_learning_development enable row level security;
alter table public.pds_other_info enable row level security;
alter table public.pds_questionnaire enable row level security;
alter table public.pds_references enable row level security;
alter table public.job_postings enable row level security;
alter table public.applications enable row level security;
alter table public.document_types enable row level security;
alter table public.documents enable row level security;
alter table public.document_reviews enable row level security;
alter table public.application_evaluations enable row level security;
alter table public.hiring_decisions enable row level security;

revoke insert, update, delete on public.profiles, public.applicants from authenticated;
revoke insert, update, delete on public.document_types from authenticated;
revoke insert, update, delete on public.applications from authenticated;
revoke insert, update, delete on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;
revoke update, delete on public.documents from authenticated;
revoke update, delete on public.document_reviews from authenticated;
revoke update, delete on public.application_evaluations from authenticated;
revoke delete on public.hiring_decisions from authenticated;
revoke update, delete on public.pds_versions from authenticated;
grant update (current_step, completed_steps) on public.pds_versions to authenticated;

create policy profiles_read_self
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  and (select private.is_role('APPLICANT'::public.user_role)
    or private.is_role('ADMIN'::public.user_role))
);

create policy applicants_read_self
on public.applicants for select to authenticated
using (
  profile_id = (select auth.uid())
  and (select private.is_role('APPLICANT'::public.user_role))
);

create policy invitations_admin_manage
on public.invitations for all to authenticated
using ((select private.is_role('ADMIN'::public.user_role)))
with check (
  (select private.is_role('ADMIN'::public.user_role))
  and invited_by = (select auth.uid())
);

create policy notifications_read_self
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

create policy notifications_mark_read_self
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy pds_versions_read_self
on public.pds_versions for select to authenticated
using (
  (select private.is_role('APPLICANT'::public.user_role))
  and (select private.owns_applicant(applicant_id))
);

create policy pds_versions_create_first_draft
on public.pds_versions for insert to authenticated
with check (
  (select private.is_role('APPLICANT'::public.user_role))
  and (select private.owns_applicant(applicant_id))
  and status = 'DRAFT'
  and submitted_at is null
  and version_no = 1
  and not exists (
    select 1
    from public.pds_versions as existing
    where existing.applicant_id = pds_versions.applicant_id
  )
);

create policy pds_versions_update_draft_steps
on public.pds_versions for update to authenticated
using (
  (select private.is_role('APPLICANT'::public.user_role))
  and (select private.owns_applicant(applicant_id))
  and status = 'DRAFT'
)
with check (
  (select private.is_role('APPLICANT'::public.user_role))
  and (select private.owns_applicant(applicant_id))
  and status = 'DRAFT'
);

create policy pds_personal_info_read_own
on public.pds_personal_info for select to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, false)));
create policy pds_personal_info_insert_own_draft
on public.pds_personal_info for insert to authenticated
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_personal_info_update_own_draft
on public.pds_personal_info for update to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)))
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_personal_info_delete_own_draft
on public.pds_personal_info for delete to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));

create policy pds_addresses_read_own
on public.pds_addresses for select to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, false)));
create policy pds_addresses_insert_own_draft
on public.pds_addresses for insert to authenticated
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_addresses_update_own_draft
on public.pds_addresses for update to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)))
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_addresses_delete_own_draft
on public.pds_addresses for delete to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));

create policy pds_family_background_read_own
on public.pds_family_background for select to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, false)));
create policy pds_family_background_insert_own_draft
on public.pds_family_background for insert to authenticated
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_family_background_update_own_draft
on public.pds_family_background for update to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)))
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_family_background_delete_own_draft
on public.pds_family_background for delete to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));

create policy pds_children_read_own
on public.pds_children for select to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, false)));
create policy pds_children_insert_own_draft
on public.pds_children for insert to authenticated
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_children_update_own_draft
on public.pds_children for update to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)))
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_children_delete_own_draft
on public.pds_children for delete to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));

create policy pds_education_read_own
on public.pds_education for select to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, false)));
create policy pds_education_insert_own_draft
on public.pds_education for insert to authenticated
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_education_update_own_draft
on public.pds_education for update to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)))
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_education_delete_own_draft
on public.pds_education for delete to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));

create policy pds_eligibility_read_own
on public.pds_eligibility for select to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, false)));
create policy pds_eligibility_insert_own_draft
on public.pds_eligibility for insert to authenticated
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_eligibility_update_own_draft
on public.pds_eligibility for update to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)))
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_eligibility_delete_own_draft
on public.pds_eligibility for delete to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));

create policy pds_work_experience_read_own
on public.pds_work_experience for select to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, false)));
create policy pds_work_experience_insert_own_draft
on public.pds_work_experience for insert to authenticated
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_work_experience_update_own_draft
on public.pds_work_experience for update to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)))
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_work_experience_delete_own_draft
on public.pds_work_experience for delete to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));

create policy pds_voluntary_work_read_own
on public.pds_voluntary_work for select to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, false)));
create policy pds_voluntary_work_insert_own_draft
on public.pds_voluntary_work for insert to authenticated
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_voluntary_work_update_own_draft
on public.pds_voluntary_work for update to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)))
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_voluntary_work_delete_own_draft
on public.pds_voluntary_work for delete to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));

create policy pds_learning_development_read_own
on public.pds_learning_development for select to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, false)));
create policy pds_learning_development_insert_own_draft
on public.pds_learning_development for insert to authenticated
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_learning_development_update_own_draft
on public.pds_learning_development for update to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)))
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_learning_development_delete_own_draft
on public.pds_learning_development for delete to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));

create policy pds_other_info_read_own
on public.pds_other_info for select to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, false)));
create policy pds_other_info_insert_own_draft
on public.pds_other_info for insert to authenticated
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_other_info_update_own_draft
on public.pds_other_info for update to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)))
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_other_info_delete_own_draft
on public.pds_other_info for delete to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));

create policy pds_questionnaire_read_own
on public.pds_questionnaire for select to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, false)));
create policy pds_questionnaire_insert_own_draft
on public.pds_questionnaire for insert to authenticated
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_questionnaire_update_own_draft
on public.pds_questionnaire for update to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)))
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_questionnaire_delete_own_draft
on public.pds_questionnaire for delete to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));

create policy pds_references_read_own
on public.pds_references for select to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, false)));
create policy pds_references_insert_own_draft
on public.pds_references for insert to authenticated
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_references_update_own_draft
on public.pds_references for update to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)))
with check ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));
create policy pds_references_delete_own_draft
on public.pds_references for delete to authenticated
using ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_pds_version(pds_version_id, true)));

create policy job_postings_read_visible
on public.job_postings for select to authenticated
using (
  ((select private.is_role('APPLICANT'::public.user_role)) and status = 'OPEN')
  or ((select private.is_role('HR'::public.user_role)) and hr_id = (select auth.uid()))
  or ((select private.is_role('EVALUATOR'::public.user_role)) and status <> 'DRAFT')
);

create policy job_postings_create_own
on public.job_postings for insert to authenticated
with check (
  (select private.is_role('HR'::public.user_role))
  and hr_id = (select auth.uid())
);

create policy job_postings_update_own
on public.job_postings for update to authenticated
using (
  (select private.is_role('HR'::public.user_role))
  and (select private.hr_owns_job(id))
)
with check (
  (select private.is_role('HR'::public.user_role))
  and hr_id = (select auth.uid())
);

create policy job_postings_delete_own_draft
on public.job_postings for delete to authenticated
using (
  (select private.is_role('HR'::public.user_role))
  and (select private.hr_owns_job(id))
  and status = 'DRAFT'
);

create policy applications_read_by_role
on public.applications for select to authenticated
using (
  ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_application(id)))
  or ((select private.is_role('HR'::public.user_role)) and (select private.hr_owns_application(id)))
  or (select private.is_role('EVALUATOR'::public.user_role))
);

create policy document_types_read_authenticated
on public.document_types for select to authenticated
using (true);

create policy documents_read_applicant_own
on public.documents for select to authenticated
using (
  (select private.is_role('APPLICANT'::public.user_role))
  and (select private.owns_applicant(applicant_id))
);

create policy documents_upload_applicant_own
on public.documents for insert to authenticated
with check (
  (select private.is_role('APPLICANT'::public.user_role))
  and (select private.owns_applicant(applicant_id))
  and status = 'PENDING'
);

create policy document_reviews_read_by_role
on public.document_reviews for select to authenticated
using (
  ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_document(document_id)))
  or ((select private.is_role('EVALUATOR'::public.user_role)) and evaluator_id = (select auth.uid()))
  or ((select private.is_role('HR'::public.user_role)) and (select private.hr_owns_document(document_id)))
);

create policy document_reviews_add_evaluator_review
on public.document_reviews for insert to authenticated
with check (
  (select private.is_role('EVALUATOR'::public.user_role))
  and evaluator_id = (select auth.uid())
);

create policy application_evaluations_read_by_role
on public.application_evaluations for select to authenticated
using (
  ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_application(application_id)))
  or ((select private.is_role('EVALUATOR'::public.user_role)) and evaluator_id = (select auth.uid()))
  or ((select private.is_role('HR'::public.user_role)) and (select private.hr_owns_application(application_id)))
);

create policy application_evaluations_add_evaluator_result
on public.application_evaluations for insert to authenticated
with check (
  (select private.is_role('EVALUATOR'::public.user_role))
  and evaluator_id = (select auth.uid())
);

create policy hiring_decisions_read_by_role
on public.hiring_decisions for select to authenticated
using (
  ((select private.is_role('APPLICANT'::public.user_role)) and (select private.owns_application(application_id)))
  or ((select private.is_role('HR'::public.user_role)) and (select private.hr_owns_application(application_id)))
);

create policy hiring_decisions_create_hr_decision
on public.hiring_decisions for insert to authenticated
with check (
  (select private.is_role('HR'::public.user_role))
  and hr_id = (select auth.uid())
  and (select private.hr_owns_application(application_id))
);

create policy hiring_decisions_update_hr_decision
on public.hiring_decisions for update to authenticated
using (
  (select private.is_role('HR'::public.user_role))
  and (select private.hr_owns_application(application_id))
)
with check (
  (select private.is_role('HR'::public.user_role))
  and hr_id = (select auth.uid())
  and (select private.hr_owns_application(application_id))
);

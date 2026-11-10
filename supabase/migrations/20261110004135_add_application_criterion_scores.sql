create table public.application_criterion_scores (
  application_id uuid not null references public.applications (id) on delete cascade,
  criterion_id uuid not null references public.position_criteria (id) on delete restrict,
  evaluator_id uuid not null references public.profiles (id) on delete restrict,
  points numeric(5, 2) not null check (points between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (application_id, criterion_id)
);

create index application_criterion_scores_evaluator_idx
  on public.application_criterion_scores (evaluator_id, application_id);

alter table public.application_criterion_scores enable row level security;

revoke all on public.application_criterion_scores from anon, authenticated;
grant select on public.application_criterion_scores to authenticated;

create policy application_criterion_scores_read_by_role
on public.application_criterion_scores for select to authenticated
using (
  ((select private.is_role('EVALUATOR'::public.user_role))
    and evaluator_id = (select auth.uid()))
  or (
    (select private.is_role('HR'::public.user_role))
    and (select private.hr_owns_application(application_id))
  )
);
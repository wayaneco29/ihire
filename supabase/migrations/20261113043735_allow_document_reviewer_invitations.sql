alter table public.invitations
  drop constraint if exists invitations_role_check;

alter table public.invitations
  add constraint invitations_role_check
  check (role in ('HR', 'EVALUATOR', 'DOCUMENT_REVIEWER'));
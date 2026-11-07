create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(btrim(email))),
  role public.user_role not null check (role in ('HR', 'EVALUATOR')),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  invited_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint invitations_expiry_after_creation check (expires_at > created_at),
  constraint invitations_cannot_be_accepted_and_revoked check (
    accepted_at is null or revoked_at is null
  )
);

comment on column public.invitations.token_hash is
  'Lowercase SHA-256 hex digest of the one-time bearer token; never store the raw token.';

create index invitations_email_created_at_idx
  on public.invitations (lower(email), created_at desc);

create unique index invitations_one_pending_per_email_idx
  on public.invitations (lower(email))
  where accepted_at is null and revoked_at is null;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (length(btrim(type)) > 0),
  title text not null check (length(btrim(title)) > 0),
  body text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc);

create index notifications_unread_user_created_at_idx
  on public.notifications (user_id, created_at desc)
  where is_read = false;

create table public.applicant_otp_challenges (
  id uuid primary key,
  purpose text not null check (purpose in ('SIGNUP', 'LOGIN', 'ENROLLMENT')),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  phone_number text not null check (phone_number ~ '^[+]639[0-9]{9}$'),
  code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
  attempts smallint not null default 0 check (attempts between 0 and 5),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  invalidated_at timestamptz
);
create index applicant_otp_challenges_phone_created_idx
  on public.applicant_otp_challenges (phone_number, created_at desc);
alter table public.applicant_otp_challenges enable row level security;
revoke all on public.applicant_otp_challenges from public, anon, authenticated;
grant all on public.applicant_otp_challenges to service_role;

create table public.applicant_verified_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.applicant_verified_sessions enable row level security;
revoke all on public.applicant_verified_sessions from public, anon, authenticated;
grant all on public.applicant_verified_sessions to service_role;

create function public.issue_applicant_otp_challenge(
  p_id uuid, p_purpose text, p_user_id uuid, p_email text,
  p_phone_number text, p_code_hash text
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required.' using errcode = '42501'; end if;
  if p_purpose not in ('SIGNUP', 'LOGIN', 'ENROLLMENT') or p_phone_number !~ '^[+]639[0-9]{9}$' then
    raise exception 'Invalid applicant verification request.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_phone_number, 639));
  if (select count(*) from public.applicant_otp_challenges
      where phone_number = p_phone_number and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'OTP rate limit exceeded.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.applicant_otp_challenges
      where phone_number = p_phone_number and created_at > now() - interval '60 seconds') then
    raise exception 'OTP resend cooldown is active.' using errcode = 'P0001';
  end if;
  update public.applicant_otp_challenges set invalidated_at = now()
    where phone_number = p_phone_number and consumed_at is null and invalidated_at is null;
  insert into public.applicant_otp_challenges (id, purpose, user_id, email, phone_number, code_hash, expires_at)
  values (p_id, p_purpose, p_user_id, lower(btrim(p_email)), p_phone_number, p_code_hash, now() + interval '10 minutes');
  return p_id;
end;
$$;

create function public.consume_applicant_otp_challenge(p_id uuid, p_code_hash text)
returns table(is_valid boolean, purpose text, user_id uuid, email text, phone_number text)
language plpgsql security definer set search_path = '' as $$
declare challenge public.applicant_otp_challenges;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required.' using errcode = '42501'; end if;
  select * into challenge from public.applicant_otp_challenges where id = p_id for update;
  if not found then return; end if;
  is_valid := challenge.consumed_at is null and challenge.invalidated_at is null
    and challenge.expires_at > now() and challenge.attempts < 5 and challenge.code_hash = p_code_hash;
  update public.applicant_otp_challenges
  set attempts = least(attempts + 1, 5), consumed_at = case when is_valid then now() else consumed_at end
  where id = p_id;
  purpose := challenge.purpose; user_id := challenge.user_id;
  email := challenge.email; phone_number := challenge.phone_number;
  return next;
end;
$$;

create function public.authorize_applicant_session(p_user_id uuid, p_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required.' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id
      and role = 'APPLICANT'::public.user_role and phone_verified_at is not null) then
    raise exception 'A verified applicant account is required.' using errcode = '42501';
  end if;
  insert into public.applicant_verified_sessions (user_id, session_id, expires_at)
  values (p_user_id, p_session_id, now() + interval '30 days')
  on conflict (session_id) do update set user_id = excluded.user_id, expires_at = excluded.expires_at;
end;
$$;

create function public.is_applicant_session_verified()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles profile
    join public.applicant_verified_sessions session
      on session.user_id = profile.id and session.session_id = ((auth.jwt() ->> 'session_id')::uuid)
    where profile.id = (select auth.uid()) and profile.role = 'APPLICANT'::public.user_role
      and session.expires_at > now()
  )
$$;
revoke all on function public.issue_applicant_otp_challenge(uuid,text,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.consume_applicant_otp_challenge(uuid,text) from public, anon, authenticated;
revoke all on function public.authorize_applicant_session(uuid,uuid) from public, anon, authenticated;
grant execute on function public.issue_applicant_otp_challenge(uuid,text,uuid,text,text,text) to service_role;
grant execute on function public.consume_applicant_otp_challenge(uuid,text) to service_role;
grant execute on function public.authorize_applicant_session(uuid,uuid) to service_role;
revoke all on function public.is_applicant_session_verified() from public, anon;
grant execute on function public.is_applicant_session_verified() to authenticated;

create or replace function private.current_user_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select profile.role from public.profiles profile
  where profile.id = (select auth.uid())
    and (profile.role <> 'APPLICANT'::public.user_role or public.is_applicant_session_verified())
  limit 1
$$;

notify pgrst, 'reload schema';

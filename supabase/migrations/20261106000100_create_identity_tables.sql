create sequence public.applicant_number_seq
  as bigint
  start with 1
  increment by 1
  no cycle;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'APPLICANT',
  email text not null unique,
  has_submitted_pds boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.applicants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  applicant_number text not null unique,
  created_at timestamptz not null default now()
);

create function public.assign_applicant_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.applicant_number := 'APP-' || lpad(nextval('public.applicant_number_seq')::text, 4, '0');
  return new;
end;
$$;

revoke all on function public.assign_applicant_number() from public;

create trigger applicants_assign_number
before insert on public.applicants
for each row
execute function public.assign_applicant_number();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role public.user_role;
begin
  assigned_role := case new.raw_app_meta_data ->> 'role'
    when 'HR' then 'HR'::public.user_role
    when 'EVALUATOR' then 'EVALUATOR'::public.user_role
    when 'ADMIN' then 'ADMIN'::public.user_role
    else 'APPLICANT'::public.user_role
  end;

  insert into public.profiles (id, role, email)
  values (new.id, assigned_role, new.email);

  if assigned_role = 'APPLICANT'::public.user_role then
    insert into public.applicants (profile_id)
    values (new.id);
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

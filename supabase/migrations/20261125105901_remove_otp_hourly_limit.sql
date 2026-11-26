-- Remove the hourly cap while retaining the resend cooldown and verification safeguards.
create or replace function public.issue_applicant_otp_challenge(
  p_id uuid, p_purpose text, p_user_id uuid, p_email text,
  p_phone_number text, p_code_hash text
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required.' using errcode = '42501'; end if;
  if p_purpose not in ('SIGNUP', 'LOGIN', 'ENROLLMENT') or p_phone_number !~ '^[+]639[0-9]{9}$' then
    raise exception 'Invalid applicant verification request.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_phone_number, 639));
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

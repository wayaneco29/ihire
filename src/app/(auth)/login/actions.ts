"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSessionIdFromAccessToken, consumeApplicantOtp, issueApplicantOtp, normalizePhilippinePhone } from "@/lib/auth/applicant-otp";
import { ROLE_HOME } from "@/lib/auth/role-routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

type LoginSessionInput = { accessToken: string; refreshToken: string; userId: string };
type LoginStartResult =
  | { success: true; step: "STAFF"; redirectTo: string }
  | ({ success: true; step: "OTP"; challengeId: string; phoneHint: string; expiresAt: number; resendAt: number } & LoginSessionInput)
  | ({ success: true; step: "ENROLL" } & LoginSessionInput)
  | { success: false; message: string };

function maskedPhone(phone: string) {
  return `${phone.slice(0, 5)}••••${phone.slice(-2)}`;
}

async function passwordSession(email: string, password: string) {
  const { url, key } = getSupabasePublicConfig();
  const client = createSupabaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.session || !data.user) return null;
  return { client, user: data.user, session: data.session };
}

export async function beginLogin(email: string, password: string): Promise<LoginStartResult> {
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== "string" || password.length < 1 || password.length > 256) {
    return { success: false, message: "The email or password is incorrect." };
  }
  const signedIn = await passwordSession(email, password);
  if (!signedIn) return { success: false, message: "The email or password is incorrect." };

  const admin = createAdminClient();
  const { data: profile, error } = await admin.from("profiles")
    .select("id, role, phone_number, phone_verified_at")
    .eq("id", signedIn.user.id).maybeSingle();
  if (error || !profile) return { success: false, message: "The account could not be loaded. Try again." };

  if (profile.role !== "APPLICANT") {
    const serverClient = await createClient();
    const { error: sessionError } = await serverClient.auth.setSession({
      access_token: signedIn.session.access_token,
      refresh_token: signedIn.session.refresh_token,
    });
    if (sessionError) return { success: false, message: "Sign in could not be completed. Try again." };
    const role = profile.role === "ADMIN" ? "SUPER_ADMIN" : profile.role;
    const redirectTo = role in ROLE_HOME ? ROLE_HOME[role as keyof typeof ROLE_HOME] : "/";
    return { success: true, step: "STAFF", redirectTo };
  }

  const tokens = {
    accessToken: signedIn.session.access_token,
    refreshToken: signedIn.session.refresh_token,
    userId: profile.id,
  };
  if (!profile.phone_number?.trim()) {
    return { success: true, step: "ENROLL", ...tokens };
  }
  const phoneNumber = normalizePhilippinePhone(profile.phone_number);
  if (!phoneNumber) {
    return { success: false, message: "The mobile number saved to this account is invalid. Contact support to update it." };
  }
  const purpose = profile.phone_verified_at ? "LOGIN" : "ENROLLMENT";
  const result = await issueApplicantOtp({
    purpose,
    userId: profile.id,
    email: signedIn.user.email ?? email,
    phoneNumber,
  });
  if (!result.success) return { success: false, message: result.message };
  return { success: true, step: "OTP", challengeId: result.challengeId, phoneHint: maskedPhone(phoneNumber), expiresAt: result.expiresAt, resendAt: result.resendAt, ...tokens };
}

export async function beginPhoneEnrollment(input: LoginSessionInput & { phoneInput: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(input.userId)) return { success: false as const, message: "Sign in again to continue." };
  const tokenSession = getSessionIdFromAccessToken(input.accessToken);
  if (!tokenSession || tokenSession.userId !== input.userId) return { success: false as const, message: "Sign in again to continue." };
  const admin = createAdminClient();
  const { data: authUser, error: userError } = await admin.auth.getUser(input.accessToken);
  const { data: profile } = await admin.from("profiles").select("id, role, email, phone_number, phone_verified_at")
    .eq("id", input.userId).maybeSingle();
  if (userError || authUser.user?.id !== input.userId || profile?.role !== "APPLICANT" || profile.phone_verified_at || profile.phone_number?.trim()) {
    return { success: false as const, message: "Sign in again to continue." };
  }
  const phoneNumber = normalizePhilippinePhone(input.phoneInput);
  if (!phoneNumber) return { success: false as const, message: "Enter a valid Philippine mobile number after +63." };
  const result = await issueApplicantOtp({ purpose: "ENROLLMENT", userId: input.userId, email: profile.email, phoneNumber });
  if (!result.success) return result;
  return { success: true as const, challengeId: result.challengeId, phoneHint: maskedPhone(phoneNumber), expiresAt: result.expiresAt, resendAt: result.resendAt };
}

export async function verifyApplicantLoginOtp(input: LoginSessionInput & { challengeId: string; code: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(input.challengeId) || !/^\d{6}$/.test(input.code)) {
    return { success: false as const, message: "Enter the six-digit verification code." };
  }
  const session = getSessionIdFromAccessToken(input.accessToken);
  if (!session || session.userId !== input.userId) return { success: false as const, message: "Sign in again and request a new code." };
  let verified;
  try {
    verified = await consumeApplicantOtp(input.challengeId, input.code);
  } catch {
    return { success: false as const, message: "Phone verification is temporarily unavailable. Please try again." };
  }
  if (!verified?.is_valid || verified.user_id !== input.userId || !["LOGIN", "ENROLLMENT"].includes(verified.purpose)) {
    return { success: false as const, message: "The code is invalid or expired. Request a new code and try again." };
  }

  const admin = createAdminClient();
  const { data: authUser, error: userError } = await admin.auth.getUser(input.accessToken);
  if (userError || authUser.user?.id !== input.userId || authUser.user.email?.toLowerCase() !== verified.email) {
    return { success: false as const, message: "Sign in again and request a new code." };
  }
  const { data: profile, error: profileError } = await admin.from("profiles")
    .select("id, role, phone_number, phone_verified_at")
    .eq("id", input.userId).maybeSingle();
  if (profileError || profile?.role !== "APPLICANT") return { success: false as const, message: "Applicant account verification failed." };
  const profilePhoneNumber = profile.phone_number ? normalizePhilippinePhone(profile.phone_number) : null;
  if (verified.purpose === "LOGIN" && (!profile.phone_verified_at || profilePhoneNumber !== verified.phone_number)) {
    return { success: false as const, message: "Sign in again and request a new code." };
  }
  if (verified.purpose === "ENROLLMENT") {
    const hasProfilePhone = Boolean(profile.phone_number?.trim());
    if (profile.phone_verified_at || (hasProfilePhone && profilePhoneNumber !== verified.phone_number)) {
      return { success: false as const, message: "Sign in again and request a new code." };
    }
    const { error: updateError } = await admin.auth.admin.updateUserById(input.userId, {
      app_metadata: { ...authUser.user.app_metadata, role: "APPLICANT", phone_number: verified.phone_number, phone_verified: true },
    });
    if (updateError) return { success: false as const, message: "The verified phone number could not be saved. Try again." };
    const { error: profileUpdateError } = await admin.from("profiles").update({
      phone_number: verified.phone_number,
      phone_verified_at: new Date().toISOString(),
    }).eq("id", input.userId);
    if (profileUpdateError) return { success: false as const, message: "The verified phone number could not be saved. Try again." };
  }

  const { error: authorizeError } = await admin.rpc("authorize_applicant_session", {
    p_user_id: input.userId,
    p_session_id: session.sessionId,
  });
  if (authorizeError) return { success: false as const, message: "The verified sign in could not be completed. Try again." };
  const serverClient = await createClient();
  const { error: sessionError } = await serverClient.auth.setSession({
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
  });
  if (sessionError) return { success: false as const, message: "The verified sign in could not be completed. Try again." };
  return { success: true as const, redirectTo: ROLE_HOME.APPLICANT };
}

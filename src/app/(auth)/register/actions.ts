"use server";

import { ValidationError } from "yup";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { ROLE_HOME } from "@/lib/auth/role-routing";
import type { Database } from "@/types/database";
import {
  consumeApplicantOtp,
  issueApplicantOtp,
  normalizePhilippinePhone,
  getSessionIdFromAccessToken,
} from "@/lib/auth/applicant-otp";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerSchema } from "./schema";

function messageFor(error: unknown) {
  return error instanceof ValidationError
    ? (error.errors[0] ?? "Check the registration details.")
    : "Check the registration details.";
}

export async function requestApplicantSignupOtp(input: unknown) {
  let values;
  try {
    values = await registerSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return { success: false as const, message: messageFor(error) };
  }
  const phoneNumber = normalizePhilippinePhone(values.phoneNumber);
  if (!phoneNumber)
    return {
      success: false as const,
      message: "Enter a valid Philippine mobile number after +63.",
    };

  const result = await issueApplicantOtp({
    purpose: "SIGNUP",
    userId: null,
    email: values.email,
    phoneNumber,
  });

  if (!result.success) return result;
  return {
    success: true as const,
    challengeId: result.challengeId,
    phoneNumber,
    expiresAt: result.expiresAt,
    resendAt: result.resendAt,
  };
}

export async function createApplicantAccount(input: {
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  challengeId: string;
  code: string;
}) {
  let values;
  try {
    values = await registerSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return { success: false as const, message: messageFor(error) };
  }
  if (
    !/^[0-9a-f-]{36}$/i.test(input.challengeId) ||
    !/^\d{6}$/.test(input.code)
  ) {
    return {
      success: false as const,
      message: "Enter the six-digit verification code.",
    };
  }
  const phoneNumber = normalizePhilippinePhone(values.phoneNumber);
  if (!phoneNumber)
    return {
      success: false as const,
      message: "Enter a valid Philippine mobile number after +63.",
    };

  let verified;
  try {
    verified = await consumeApplicantOtp(input.challengeId, input.code);
  } catch {
    return { success: false as const, message: "Phone verification is temporarily unavailable. Please try again." };
  }
  if (
    !verified?.is_valid ||
    verified.purpose !== "SIGNUP" ||
    verified.user_id !== null ||
    verified.email !== values.email ||
    verified.phone_number !== phoneNumber
  ) {
    return {
      success: false as const,
      message:
        "This code could not be verified. Enter the code from your most recent request. Older codes stop working after a resend, and each code can only be used once.",
    };
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: verified.email,
    password: values.password,
    email_confirm: true,
    app_metadata: {
      role: "APPLICANT",
      phone_number: verified.phone_number,
      phone_verified: true,
    },
  });

  console.log(error);
  if (error) {
    console.error("Applicant account creation failed.", error.message);
    return {
      success: false as const,
      message:
        "We could not create the account. Check the details and try again.",
    };
  }
  const accountReady = {
    success: true as const,
    redirectTo: null,
    message:
      "Your account was created, but automatic sign in could not finish. Please sign in to continue.",
  };
  try {
    const { url, key } = getSupabasePublicConfig();
    const client = createSupabaseClient<Database>(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error: loginError } = await client.auth.signInWithPassword({
      email: verified.email,
      password: values.password,
    });
    if (loginError || !data.session || data.user?.id !== created.user?.id)
      return accountReady;
    const session = getSessionIdFromAccessToken(data.session.access_token);
    if (!session || session.userId !== data.user.id) return accountReady;
    // The signup OTP has already verified this applicant's phone. Authorize
    // this session before publishing cookies, just as the login OTP flow does.
    const { error: authorizeError } = await admin.rpc(
      "authorize_applicant_session",
      {
        p_user_id: data.user.id,
        p_session_id: session.sessionId,
      },
    );
    if (authorizeError) return accountReady;
    const server = await createClient();
    const { error: sessionError } = await server.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (sessionError) return accountReady;
    return {
      success: true as const,
      redirectTo: ROLE_HOME.APPLICANT,
      message: "Your account is ready.",
    };
  } catch {
    return accountReady;
  }
}

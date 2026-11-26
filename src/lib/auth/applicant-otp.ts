import "server-only";

import { createHmac, randomInt, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type ApplicantOtpPurpose = "SIGNUP" | "LOGIN" | "ENROLLMENT";
export type ApplicantOtpRecord = {
  is_valid: boolean;
  purpose: ApplicantOtpPurpose;
  user_id: string | null;
  email: string;
  phone_number: string;
};

function otpSecret() {
  const secret = process.env.APPLICANT_OTP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "APPLICANT_OTP_SECRET must contain at least 32 characters.",
    );
  }
  return secret;
}

function hashCode(challengeId: string, code: string) {
  return createHmac("sha256", otpSecret())
    .update(`${challengeId}:${code}`, "utf8")
    .digest("hex");
}

export function normalizePhilippinePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("63") ? digits.slice(2) : digits;
  if (!/^9\d{9}$/.test(national)) return null;
  return `+63${national}`;
}

async function sendSms(phoneNumber: string, code: string) {
  const endpoint = process.env.SMS_GATEWAY_URL;
  const username = process.env.SMS_GATEWAY_USERNAME;
  const password = process.env.SMS_GATEWAY_PASSWORD;
  if (!endpoint || !username || !password) {
    throw new Error("The SMS gateway is not configured.");
  }
  const url = new URL(endpoint);
  if (url.protocol !== "https:") {
    throw new Error(
      "The SMS gateway must use its public HTTPS /message endpoint.",
    );
  }

  const credentials = Buffer.from(`${username}:${password}`).toString("base64");
  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      authorization: `Basic ${credentials}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      textMessage: {
        text: `Your applicant verification code is ${code}. It expires in 10 minutes.`,
      },
      phoneNumbers: [phoneNumber],
    }),
    signal: AbortSignal.timeout(10_000),
  });

  console.log("CODE==================", code);
  if (!response.ok)
    throw new Error(`SMS gateway returned HTTP ${response.status}.`);
}

export async function issueApplicantOtp(input: {
  purpose: ApplicantOtpPurpose;
  userId: string | null;
  email: string;
  phoneNumber: string;
}) {
  const admin = createAdminClient();
  const id = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const issuedAt = Date.now();
  const { error } = await admin.rpc("issue_applicant_otp_challenge", {
    p_id: id,
    p_purpose: input.purpose,
    p_user_id: input.userId,
    p_email: input.email.trim().toLowerCase(),
    p_phone_number: input.phoneNumber,
    p_code_hash: hashCode(id, code),
  });

  console.log(error);
  if (error) {
    if (error.message.includes("cooldown")) {
      return {
        success: false as const,
        message: "Wait 60 seconds before requesting another code.",
      };
    }
    return {
      success: false as const,
      message:
        "We could not start phone verification. Check the details and try again.",
    };
  }
  try {
    await sendSms(input.phoneNumber, code);
  } catch (error) {
    console.error(
      "Applicant OTP delivery failed.",
      error instanceof Error ? error.message : "Unknown SMS error",
    );
    return {
      success: false as const,
      message:
        "We could not send the verification code. Try again in a minute.",
    };
  }
  return {
    success: true as const,
    challengeId: id,
    expiresAt: issuedAt + 600_000,
    resendAt: issuedAt + 60_000,
  };
}

export async function consumeApplicantOtp(challengeId: string, code: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_applicant_otp_challenge", {
    p_id: challengeId,
    p_code_hash: hashCode(challengeId, code),
  });
  if (error) {
    console.error("Applicant OTP verification database failure.", {
      code: error.code,
    });
    throw new Error(
      "Phone verification is temporarily unavailable. Please try again.",
    );
  }
  return (data?.[0] as ApplicantOtpRecord | undefined) ?? null;
}

export function getSessionIdFromAccessToken(accessToken: string) {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      session_id?: unknown;
      sub?: unknown;
      exp?: unknown;
    };
    if (
      typeof claims.session_id !== "string" ||
      typeof claims.sub !== "string" ||
      typeof claims.exp !== "number" ||
      claims.exp <= Math.floor(Date.now() / 1000)
    )
      return null;
    return { sessionId: claims.session_id, userId: claims.sub };
  } catch {
    return null;
  }
}

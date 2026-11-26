"use client";

import { useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { message } from "antd";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FormInput, FormOtp } from "@/components/form";
import { Button } from "@/components/ui/Button";
import {
  beginLogin,
  beginPhoneEnrollment,
  verifyApplicantLoginOtp,
} from "../actions";
import {
  loginOtpSchema,
  loginSchema,
  phoneEnrollmentSchema,
  type LoginValues,
} from "../schema";
import { AuthPageFrame } from "../../components/AuthPageFrame";

type ApplicantSession = { accessToken: string; refreshToken: string; userId: string };
type LoginStep = "LOGIN" | "ENROLL" | "OTP";

export function LoginForm() {
  const [step, setStep] = useState<LoginStep>("LOGIN");
  const [session, setSession] = useState<ApplicantSession | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [phoneEnrollment, setPhoneEnrollment] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [timing, setTiming] = useState<{ expiresAt: number; resendAt: number } | null>(null);
  const [now, setNow] = useState(0);
  const [isWorking, setIsWorking] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Logging you in…");
  const {
    control,
    handleSubmit,
    getValues,
    formState: { isSubmitting },
  } = useForm<LoginValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const phoneForm = useForm<{ phoneInput: string }>({
    resolver: yupResolver(phoneEnrollmentSchema),
    defaultValues: { phoneInput: "" },
  });
  const codeForm = useForm<{ code: string }>({
    resolver: yupResolver(loginOtpSchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    if (step !== "OTP") return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [step]);

  const expiresIn = timing ? Math.max(0, Math.ceil((timing.expiresAt - now) / 1000)) : 0;
  const resendIn = timing ? Math.max(0, Math.ceil((timing.resendAt - now) / 1000)) : 0;
  const busy = isWorking || isSubmitting || redirecting;
  const pendingLabel = redirecting ? "Opening dashboard…" : loadingMessage;

  function showError(content: string) {
    void messageApi.error({ key: "login-error", content, duration: 5 });
  }

  function resetCode(result: { expiresAt: number; resendAt: number }) {
    codeForm.reset({ code: "" });
    setTiming({ expiresAt: result.expiresAt, resendAt: result.resendAt });
    setNow(result.resendAt - 60_000);
  }

  async function startLogin(email: string, password: string) {
    setLoadingMessage(step === "OTP" ? "Sending verification code…" : "Logging you in…");
    setIsWorking(true);
    try {
      const result = await beginLogin(email, password);
      if (!result.success) {
        showError(result.message);
        return;
      }
      if (result.step === "STAFF") {
        setRedirecting(true);
        // Reload the auth provider using the server-written session cookies.
        window.location.replace(result.redirectTo);
        return;
      }
      const nextSession = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userId: result.userId,
      };
      setSession(nextSession);
      setChallengeId(result.step === "OTP" ? result.challengeId : null);
      setPhoneHint(result.step === "OTP" ? result.phoneHint : null);
      setPhoneEnrollment(result.step === "ENROLL");
      if (result.step === "OTP") resetCode(result);
      setStep(result.step);
    } catch {
      setRedirecting(false);
      showError("We could not complete this request. Please try again.");
    } finally {
      setIsWorking(false);
    }
  }

  const submitLogin = handleSubmit(async ({ email, password }) => startLogin(email, password));

  async function sendEnrollmentCode() {
    const valid = await phoneForm.trigger();
    if (!valid || !session) return;
    setLoadingMessage("Sending verification code…");
    setIsWorking(true);
    try {
      const result = await beginPhoneEnrollment({ ...session, phoneInput: phoneForm.getValues("phoneInput") });
      if (!result.success) {
        showError(result.message);
        return;
      }
      setChallengeId(result.challengeId);
      setPhoneHint(result.phoneHint);
      setPhoneEnrollment(true);
      resetCode(result);
      setStep("OTP");
    } catch {
      showError("We could not complete this request. Please try again.");
    } finally {
      setIsWorking(false);
    }
  }

  const submitCode = async () => {
    if (isWorking || !timing || Date.now() >= timing.expiresAt) return;
    const valid = await codeForm.trigger();
    if (!valid || !session || !challengeId) return;
    setLoadingMessage("Logging you in…");
    setIsWorking(true);
    try {
      const result = await verifyApplicantLoginOtp({
        ...session,
        challengeId,
        code: codeForm.getValues("code"),
      });
      if (!result.success) {
        showError(result.message);
        return;
      }
      setSession(null);
      setChallengeId(null);
      setPhoneEnrollment(false);
      setRedirecting(true);
      window.location.replace(result.redirectTo);
    } catch {
      setRedirecting(false);
      showError("We could not complete this request. Please try again.");
    } finally {
      setIsWorking(false);
    }
  };

  async function resendCode() {
    if (isWorking || resendIn > 0) return;

    codeForm.reset({ code: "" });
    if (step === "ENROLL" || phoneEnrollment) {
      await sendEnrollmentCode();
      return;
    }
    const { email, password } = getValues();
    await startLogin(email, password);
  }

  return (
    <AuthPageFrame>
      {contextHolder}
      <section aria-busy={busy}>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {step === "LOGIN" ? "Welcome back" : step === "ENROLL" ? "Verify your mobile number" : "Enter your verification code"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {step === "LOGIN"
            ? "Sign in to access your dashboard, staff tools, and school services."
            : step === "ENROLL"
              ? "Your applicant profile does not have a mobile number yet. Add a Philippine number to verify your account."
              : `We sent a six-digit code to ${phoneHint ?? "your mobile number"}. The code expires in 10 minutes.`}
        </p>


        {step === "LOGIN" && (
          <form className="mt-7" onSubmit={submitLogin}>
            <div className="space-y-4">
              <FormInput autoComplete="email" control={control} label="Email address" name="email" required type="email" size="small" className="rounded-sm!" disabled={busy} />
              <FormInput autoComplete="current-password" control={control} label="Password" name="password" required type="password" size="small" className="rounded-sm!" disabled={busy} />
              <Button block className="mt-2" type="submit" disabled={busy} aria-busy={busy} variant="filled">{busy ? pendingLabel : "Sign in"}</Button>
            </div>
          </form>
        )}

        {step === "ENROLL" && (
          <div className="mt-7 space-y-4">
            <FormInput
              autoComplete="tel-national"
              control={phoneForm.control}
              label="Mobile number"
              name="phoneInput"
              addonBefore={<span aria-label="Philippines country code">+63</span>}
              inputMode="numeric"
              maxLength={10}
              disabled={busy}
              required
              hint="Enter the 10 digits after +63, starting with 9."
            />
            <Button block disabled={busy} aria-busy={busy} onClick={sendEnrollmentCode} variant="filled">{busy ? pendingLabel : "Send verification code"}</Button>
          </div>
        )}

        {step === "OTP" && (
          <form className="mt-7 space-y-4" onSubmit={(event) => { event.preventDefault(); void submitCode(); }}>
            <FormOtp key={challengeId} control={codeForm.control} label="Verification code" name="code" required disabled={busy || expiresIn === 0} />
            <p className="text-center text-sm text-muted" role="timer" aria-live="off">
              {expiresIn > 0 ? `Code expires in ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}` : "This code has expired. Request a new code below."}
            </p>
            <Button block type="submit" aria-busy={busy} disabled={busy || expiresIn === 0} variant="filled">{busy ? pendingLabel : "Verify and sign in"}</Button>
            <Button block type="button" disabled={busy || resendIn > 0} onClick={resendCode} variant="bordered">
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </Button>
          </form>
        )}

        {step === "LOGIN" && (
          <p className="mt-5 text-center text-sm text-muted">
            New applicant? {busy ? <span className="inline-flex min-h-11 items-center px-2 text-sm text-muted">Create an account</span> : <Link className="inline-flex min-h-11 items-center rounded-sm px-2 text-sm font-semibold text-primary hover:underline hover:text-primary-dark" href="/register">Create an account</Link>}
          </p>
        )}
      </section>
      <p className="sr-only" role="status">{busy ? pendingLabel : ""}</p>
    </AuthPageFrame>
  );
}

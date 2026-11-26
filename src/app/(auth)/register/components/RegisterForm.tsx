"use client";

import { useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { message } from "antd";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FormInput, FormOtp } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { FormLoading } from "@/components/ui/FormLoading";
import { AuthPageFrame } from "../../components/AuthPageFrame";
import { createApplicantAccount, requestApplicantSignupOtp } from "../actions";
import { registerSchema, signupCodeSchema, type RegisterValues } from "../schema";

type Challenge = { challengeId: string; phoneNumber: string; expiresAt: number; resendAt: number };

export function RegisterForm() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [now, setNow] = useState(0);
  const [resending, setResending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [accountReady, setAccountReady] = useState<string | null>(null);
  const form = useForm<RegisterValues>({
    resolver: yupResolver(registerSchema),
    defaultValues: { email: "", phoneNumber: "", password: "", confirmPassword: "" },
  });
  const codeForm = useForm<{ code: string }>({
    resolver: yupResolver(signupCodeSchema), defaultValues: { code: "" },
  });

  useEffect(() => {
    if (!challenge) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  const expiresIn = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) : 0;
  const resendIn = challenge ? Math.max(0, Math.ceil((challenge.resendAt - now) / 1000)) : 0;
  const busy = form.formState.isSubmitting || codeForm.formState.isSubmitting || resending || redirecting;

  function showError(content: string) {
    void messageApi.error({ content, key: 'signup-error', duration: 5 });
  }

  function showCodeScreen(next: Challenge) {
    codeForm.reset({ code: "" });
    setNow(Date.now());
    setChallenge(next);
  }

  const sendCode = form.handleSubmit(async (values) => {

    try {
      const result = await requestApplicantSignupOtp(values);
      if (!result.success) return showError(result.message);
      showCodeScreen(result);
    } catch {
      showError("We could not send the code. Please try again.");
    }
  });

  const verifyCode = codeForm.handleSubmit(async ({ code }) => {
    if (!challenge || resending || Date.now() >= challenge.expiresAt) return;

    try {
      const result = await createApplicantAccount({ ...form.getValues(), challengeId: challenge.challengeId, code });
      if (!result.success) return showError(result.message);
      // Clear the password once account creation has succeeded.
      form.reset();
      codeForm.reset();
      setAccountReady(result.message);
      if (result.redirectTo) {
        setRedirecting(true);
        // Recreate the browser auth client from the session cookies written by
        // the server action, including the sidebar's persistent auth provider.
        window.location.replace(result.redirectTo);
      }
    } catch {
      setRedirecting(false);
      showError("Verification could not finish. If your account was created, use Sign in below; otherwise request a new code.");
    }
  });

  async function resendCode() {
    if (busy || resendIn > 0) return;
    setResending(true);

    try {
      const result = await requestApplicantSignupOtp(form.getValues());
      if (!result.success) return showError(result.message);
      showCodeScreen(result);
    } catch {
      showError("We could not resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthPageFrame>
      {contextHolder}
      {busy && <FormLoading message={redirecting ? "Opening your dashboard…" : codeForm.formState.isSubmitting ? "Signing you up…" : "Sending verification code…"} />}
      <section hidden={busy}>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {accountReady ? "Your account is ready" : challenge ? "Verify your mobile number" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {accountReady ? accountReady : challenge
            ? `Enter the six-digit code sent to ${challenge.phoneNumber}. Once verified, you will be signed in automatically.`
            : "Create your applicant account with a verified Philippine mobile number."}
        </p>


        {!accountReady && (!challenge ? (
          <form className="mt-7 space-y-4" onSubmit={sendCode}>
            <FormInput autoComplete="email" control={form.control} label="Email address" name="email" required type="email" disabled={busy} />
            <FormInput autoComplete="tel-national" control={form.control} label="Mobile number" name="phoneNumber" required
              addonBefore={<span aria-label="Philippines country code">+63</span>} inputMode="numeric" maxLength={10}
              disabled={busy} hint="Enter the 10 digits after +63, starting with 9." />
            <FormInput autoComplete="new-password" control={form.control} label="Password" name="password" required type="password" disabled={busy} />
            <FormInput autoComplete="new-password" control={form.control} label="Confirm password" name="confirmPassword" required type="password" disabled={busy} />
            <Button block type="submit" loading={form.formState.isSubmitting} variant="filled">Send verification code</Button>
          </form>
        ) : (
          <form className="mt-7 space-y-4" onSubmit={verifyCode}>
            <FormOtp key={challenge.challengeId} control={codeForm.control} name="code" label="Verification code" required disabled={busy || expiresIn === 0} />
            <p className="text-center text-sm text-muted" role="timer" aria-live="off">
              {expiresIn > 0 ? `Code expires in ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}` : "This code has expired. Request a new code below."}
            </p>
            <Button block type="submit" loading={codeForm.formState.isSubmitting} disabled={busy || expiresIn === 0} variant="filled">Verify and sign in</Button>
            <Button block type="button" loading={resending} disabled={busy || resendIn > 0} onClick={resendCode} variant="bordered">
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </Button>
            <Button block type="button" disabled={busy} variant="bordered" onClick={() => { setChallenge(null); codeForm.reset(); }}>
              Change signup details
            </Button>
          </form>
        ))}
        <p className="mt-5 text-center text-sm text-muted">
          Already registered? <Link className="inline-flex min-h-11 items-center rounded-sm px-2 text-sm font-semibold text-primary hover:underline hover:text-primary-dark" href="/">Sign in</Link>
        </p>
      </section>
    </AuthPageFrame>
  );
}

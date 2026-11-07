"use client";

import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormInput } from "@/components/form";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, type RegisterValues } from "../schema";

export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(
    null,
  );
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterValues>({
    resolver: yupResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    setConfirmationMessage(null);
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
    });

    if (error) {
      setFormError("We could not create the account. Check the details and try again.");
      return;
    }

    if (data.session) {
      router.replace("/applicant");
      return;
    }

    setConfirmationMessage(
      "Your account was created. If email confirmation is enabled, confirm your address before signing in.",
    );
  });

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        Applicant account
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        Create your account
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Registration is open to applicants. HR and Evaluator accounts require an invitation.
      </p>

      <form className="mt-6" onSubmit={onSubmit}>
        {formError && (
          <Alert className="mb-4" message={formError} showIcon type="error" />
        )}
        {confirmationMessage && (
          <Alert
            className="mb-4"
            message={confirmationMessage}
            showIcon
            type="success"
          />
        )}
        <FormInput
          autoComplete="email"
          control={control}
          label="Email address"
          name="email"
          required
          type="email"
        />
        <FormInput
          autoComplete="new-password"
          control={control}
          label="Password"
          name="password"
          required
          type="password"
        />
        <FormInput
          autoComplete="new-password"
          control={control}
          label="Confirm password"
          name="confirmPassword"
          required
          type="password"
        />
        <Button block htmlType="submit" loading={isSubmitting} type="primary">
          Create applicant account
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Already registered?{" "}
        <Link className="font-medium text-primary hover:text-primary-dark" href="/login">
          Sign in
        </Link>
      </p>
    </section>
  );
}

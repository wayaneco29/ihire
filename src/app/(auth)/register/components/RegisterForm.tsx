"use client";

import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormInput } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { AuthPageFrame } from "../../components/AuthPageFrame";
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
      setFormError(
        "We could not create the account. Check the details and try again.",
      );
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
    <AuthPageFrame>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Registration is open to applicants. HR and Evaluator accounts require
          an invitation.
        </p>

        <form className="mt-7" onSubmit={onSubmit}>
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
          <div className="space-y-4">
            <FormInput
              autoComplete="email"
              control={control}
              label="Email address"
              name="email"
              required
              type="email"
              className="rounded-sm!"
            />
            <FormInput
              autoComplete="new-password"
              control={control}
              label="Password"
              name="password"
              required
              type="password"
              className="rounded-sm!"
            />
            <FormInput
              autoComplete="new-password"
              control={control}
              label="Confirm password"
              name="confirmPassword"
              required
              type="password"
              className="rounded-sm!"
            />
            <Button
              block
              className="mt-2"
              type="submit"
              loading={isSubmitting}
              variant="filled"
            >
              Create applicant account
            </Button>
          </div>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Already registered?{" "}
          <Link
            className="inline-flex min-h-10 items-center rounded-sm px-2 text-sm font-semibold text-primary hover:underline hover:text-primary-dark"
            href="/"
            replace
          >
            Sign in
          </Link>
        </p>
      </section>
    </AuthPageFrame>
  );
}

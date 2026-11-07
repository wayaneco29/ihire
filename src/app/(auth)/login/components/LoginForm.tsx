"use client";

import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormInput } from "@/components/form";
import { createClient } from "@/lib/supabase/client";
import { isUserRole, ROLE_HOME } from "@/lib/auth/role-routing";
import { loginSchema, type LoginValues } from "../schema";

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    const client = createClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setFormError("The email or password is incorrect.");
      return;
    }

    let role: unknown = data.user.app_metadata?.role;
    if (!isUserRole(role)) {
      const profileAbortController = new AbortController();
      const profileTimeout = setTimeout(() => profileAbortController.abort(), 8_000);
      try {
        const { data: profile } = await client
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .abortSignal(profileAbortController.signal)
          .maybeSingle();
        role = profile?.role ?? role;
      } catch {
        // Continue to the default Applicant route if the profile lookup is unavailable.
      } finally {
        clearTimeout(profileTimeout);
      }
    }

    const resolvedRole = isUserRole(role) ? role : "APPLICANT";
    router.replace(ROLE_HOME[resolvedRole]);
  });

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        Recruitment portal
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        Sign in
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Use your applicant account or the account provided in your staff invitation.
      </p>

      <form className="mt-6" onSubmit={onSubmit}>
        {formError && (
          <Alert className="mb-4" message={formError} showIcon type="error" />
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
          autoComplete="current-password"
          control={control}
          label="Password"
          name="password"
          required
          type="password"
        />
        <Button block htmlType="submit" loading={isSubmitting} type="primary">
          Sign in
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        New applicant?{" "}
        <Link className="font-medium text-primary hover:text-primary-dark" href="/register">
          Create an account
        </Link>
      </p>
    </section>
  );
}

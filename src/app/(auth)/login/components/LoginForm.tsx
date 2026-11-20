"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { message } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormInput } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { isUserRole, ROLE_HOME } from "@/lib/auth/role-routing";
import { AuthPageFrame } from "../../components/AuthPageFrame";
import { loginSchema, type LoginValues } from "../schema";

export function LoginForm() {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    const client = createClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      messageApi.error("The email or password is incorrect.");
      return;
    }

    let role: unknown = data.user.app_metadata?.role;
    if (!isUserRole(role)) {
      const profileAbortController = new AbortController();
      const profileTimeout = setTimeout(
        () => profileAbortController.abort(),
        8_000,
      );
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
    <AuthPageFrame>
      <section>
        {contextHolder}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Welcome back
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Sign in to access your dashboard, staff tools, and school services.
        </p>

        <form className="mt-7" onSubmit={onSubmit}>
          <div className="space-y-4">
            <FormInput
              autoComplete="email"
              control={control}
              label="Email address"
              name="email"
              required
              type="email"
              size="small"
              className="rounded-sm!"
            />
            <FormInput
              autoComplete="current-password"
              control={control}
              label="Password"
              name="password"
              required
              type="password"
              size="small"
              className="rounded-sm!"
            />
            <Button
              block
              className="mt-2"
              type="submit"
              loading={isSubmitting}
              variant="filled"
            >
              Sign in
            </Button>
          </div>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          New applicant?{" "}
          <Link
            className="inline-flex min-h-11 items-center rounded-sm px-2 text-sm font-semibold text-primary hover:underline hover:text-primary-dark"
            href="/register"
          >
            Create an account
          </Link>
        </p>
      </section>
    </AuthPageFrame>
  );
}

"use client";

import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button } from "antd";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FormInput } from "@/components/form";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { acceptInvitation } from "../actions";
import { acceptInviteSchema, type AcceptInviteValues } from "../schema";

export function AcceptInviteForm({
  token,
  email,
  role,
}: Readonly<{ token: string; email: string; role: string }>) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<AcceptInviteValues>({
    resolver: yupResolver(acceptInviteSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setSuccess(null);
    const result = await acceptInvitation(token, values);
    if (result.success) setSuccess(result.message);
    else setError(result.message);
  });

  return (
    <SurfaceCard as="section" className="p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        {role} invitation
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        Set your password
      </h1>
      <p className="mt-2 break-all text-sm text-muted">Account: {email}</p>

      {success ? (
        <div className="mt-6 space-y-4">
          <Alert message={success} showIcon type="success" />
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-dark"
            href="/login"
          >
            Go to sign in
          </Link>
        </div>
      ) : (
        <form className="mt-6" onSubmit={onSubmit}>
          {error && (
            <Alert className="mb-4" message={error} showIcon type="error" />
          )}
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
            Accept invitation
          </Button>
        </form>
      )}
    </SurfaceCard>
  );
}

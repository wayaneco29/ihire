"use client";

import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert } from "antd";
import { useForm } from "react-hook-form";
import { FormInput } from "@/components/form";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { acceptInvitation } from "../actions";
import { acceptInviteSchema, type AcceptInviteValues } from "../schema";
import { InviteAccountReady } from "../../components/InviteAccountReady";

export function AcceptInviteForm({
  token,
  email,
  role,
}: Readonly<{ token: string; email: string; role: string }>) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
    setSuccess(false);
    try {
      const result = await acceptInvitation(token, values);
      if (result.success) setSuccess(true);
      else setError(result.message);
    } catch {
      setError(
        "We couldn't confirm the result. Submit again to safely resume, or contact the Super Admin who invited you.",
      );
    }
  });

  const roleLabel =
    role === "EVALUATOR"
      ? "Evaluator"
      : role === "DOCUMENT_REVIEWER"
        ? "Document reviewer"
        : role === "SDS"
          ? "School Division Superintendent"
          : role === "ASDS"
            ? "Assistant School Division Superintendent"
            : role === "SUPER_ADMIN"
              ? "Super Admin"
        : role;

  return (
    <SurfaceCard as="section" className="min-w-0 overflow-hidden p-0">
      {success ? (
        <div className="p-6 sm:p-8">
          <InviteAccountReady
            description="Sign in with the password you just created to continue to the recruitment portal."
            email={email}
          />
        </div>
      ) : (
        <>
          <div className="border-b border-line-subtle bg-panel-muted/40 px-6 py-5 sm:px-8">
            <span className="inline-flex items-center rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
              {roleLabel} invitation
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
              Set up your staff account
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Choose a password to finish accepting your invitation.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex min-w-0 items-center gap-3 rounded-sm border border-line-subtle bg-panel-muted/30 p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-light text-sm font-bold text-primary">
                {email.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">
                  Invited account
                </p>
                <p className="mt-0.5 break-all text-sm font-semibold text-ink">
                  {email}
                </p>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              {error && <Alert message={error} showIcon type="error" />}
              <FormInput
                autoComplete="new-password"
                control={control}
                hint="Use at least 8 characters."
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
                loading={isSubmitting}
                type="submit"
                variant="filled"
              >
                Accept invitation
              </Button>
            </form>
          </div>
        </>
      )}
    </SurfaceCard>
  );
}

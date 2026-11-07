"use client";

import { useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, Tag } from "antd";
import { useForm } from "react-hook-form";
import { FormInput, FormSelect } from "@/components/form";
import type { Tables } from "@/types/database";
import {
  createInvitation,
  resendInvitation,
  revokeInvitation,
} from "../actions";
import { invitationSchema, type InvitationValues } from "../schema";

type Invitation = Pick<
  Tables<"invitations">,
  "id" | "email" | "role" | "created_at" | "expires_at" | "accepted_at" | "revoked_at"
>;
type RowActionResult =
  | Awaited<ReturnType<typeof revokeInvitation>>
  | Awaited<ReturnType<typeof resendInvitation>>;

function inviteStatus(invitation: Invitation) {
  if (invitation.accepted_at) return "Accepted";
  if (invitation.revoked_at) return "Revoked";
  if (Date.parse(invitation.expires_at) <= Date.now()) return "Expired";
  return "Pending";
}

export function InvitationManager({
  invitations,
}: Readonly<{ invitations: Invitation[] }>) {
  const [isWorking, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<InvitationValues>({
    resolver: yupResolver(invitationSchema),
    defaultValues: { email: "", role: "HR" },
  });

  function showResult(result: Awaited<ReturnType<typeof createInvitation>>) {
    if (!result.success) {
      setError(result.message);
      setMessage(null);
      setInviteUrl(null);
      return;
    }
    setError(null);
    setMessage(`Invitation link expires ${new Date(result.expiresAt).toLocaleString()}.`);
    setInviteUrl(`${window.location.origin}${result.invitePath}`);
  }

  const onCreate = handleSubmit(async (values) => {
    setError(null);
    setMessage(null);
    const result = await createInvitation(values);
    showResult(result);
    if (result.success) reset({ email: "", role: "HR" });
  });

  function runRowAction(
    action: (id: string) => Promise<RowActionResult>,
    id: string,
  ) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      setInviteUrl(null);
      const result = await action(id);
      if (result.success && "invitePath" in result) showResult(result);
      else if (result.success) setMessage(result.message);
      else setError(result.message);
    });
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage("Invitation link copied.");
    } catch {
      setMessage("Copy was unavailable. Select and copy the link below.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-ink">Create invitation</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Each link can be used once and expires after seven days.
        </p>
        <form className="mt-5" onSubmit={onCreate}>
          <FormInput
            autoComplete="email"
            control={control}
            label="Staff email"
            name="email"
            required
            type="email"
          />
          <FormSelect
            control={control}
            label="Role"
            name="role"
            options={[
              { label: "HR", value: "HR" },
              { label: "Evaluator", value: "EVALUATOR" },
            ]}
            required
          />
          <Button
            block
            htmlType="submit"
            loading={isSubmitting || isWorking}
            type="primary"
          >
            Create one-time link
          </Button>
        </form>
        {error && <Alert className="mt-4" message={error} showIcon type="error" />}
        {message && (
          <Alert className="mt-4" message={message} showIcon type="success" />
        )}
        {inviteUrl && (
          <div className="mt-4 rounded-xl border border-primary/15 bg-primary-light/50 p-3">
            <p className="break-all text-xs leading-5 text-ink">{inviteUrl}</p>
            <Button className="mt-3" onClick={copyInvite} size="small">
              Copy link
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-ink">Invitation history</h2>
        {invitations.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No invitations yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {invitations.map((invitation) => {
              const status = inviteStatus(invitation);
              const canManage = status === "Pending" || status === "Expired";
              return (
                <li
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  key={invitation.id}
                >
                  <div className="min-w-0">
                    <p className="break-all text-sm font-medium text-ink">
                      {invitation.email}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {invitation.role} · expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag color={status === "Pending" ? "green" : "default"}>{status}</Tag>
                    {canManage && (
                      <>
                        <Button
                          disabled={isWorking}
                          onClick={() => runRowAction(resendInvitation, invitation.id)}
                          size="small"
                        >
                          Resend link
                        </Button>
                        {status === "Pending" && (
                          <Button
                            danger
                            disabled={isWorking}
                            onClick={() => runRowAction(revokeInvitation, invitation.id)}
                            size="small"
                          >
                            Revoke
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

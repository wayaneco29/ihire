"use client";

import { useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert } from "antd";
import { useForm } from "react-hook-form";
import { FormInput, FormRadio } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { Tables } from "@/types/database";
import {
  createInvitation,
  resendInvitation,
  revokeInvitation,
} from "../actions";
import { invitationSchema, type InvitationValues } from "../schema";

type Invitation = Pick<
  Tables<"invitations">,
  | "id"
  | "email"
  | "role"
  | "created_at"
  | "expires_at"
  | "accepted_at"
  | "revoked_at"
>;
type InvitationStatus = "Pending" | "Accepted" | "Expired" | "Revoked";
type HistoryFilter = "All" | InvitationStatus;
type RowActionResult =
  | Awaited<ReturnType<typeof revokeInvitation>>
  | Awaited<ReturnType<typeof resendInvitation>>;

const INVITATION_ROLES: {
  value: InvitationValues["role"];
  title: string;
  description: string;
}[] = [
  {
    value: "HR",
    title: "HR",
    description: "Manages applicants and staff records",
  },
  {
    value: "EVALUATOR",
    title: "Evaluator",
    description: "Scores applicants against criteria",
  },
  {
    value: "DOCUMENT_REVIEWER",
    title: "Document reviewer",
    description: "Checks submitted documents",
  },
];

const STATUS_STYLES: Record<InvitationStatus, { pill: string; dot: string }> = {
  Pending: { pill: "bg-warning/10 text-warning", dot: "bg-warning" },
  Accepted: { pill: "bg-success/10 text-success", dot: "bg-success" },
  Expired: { pill: "bg-panel-muted text-muted", dot: "bg-muted" },
  Revoked: { pill: "bg-danger/10 text-danger", dot: "bg-danger" },
};

function inviteStatus(invitation: Invitation): InvitationStatus {
  if (invitation.accepted_at) return "Accepted";
  if (invitation.revoked_at) return "Revoked";
  if (Date.parse(invitation.expires_at) <= Date.now()) return "Expired";
  return "Pending";
}

function roleLabel(role: Invitation["role"]) {
  return (
    INVITATION_ROLES.find((option) => option.value === role)?.title ?? role
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InvitationManager({
  invitations,
}: Readonly<{ invitations: Invitation[] }>) {
  const [isWorking, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("All");
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<InvitationValues>({
    resolver: yupResolver(invitationSchema),
    defaultValues: { email: "", role: "HR" },
  });

  const counts = invitations.reduce<Record<InvitationStatus, number>>(
    (totals, invitation) => {
      totals[inviteStatus(invitation)] += 1;
      return totals;
    },
    { Pending: 0, Accepted: 0, Expired: 0, Revoked: 0 },
  );
  const historyFilters: { key: HistoryFilter; count: number }[] = [
    { key: "All", count: invitations.length },
    { key: "Pending", count: counts.Pending },
    { key: "Accepted", count: counts.Accepted },
    { key: "Expired", count: counts.Expired },
    ...(counts.Revoked > 0
      ? [{ key: "Revoked" as const, count: counts.Revoked }]
      : []),
  ];
  const visibleInvitations = invitations.filter(
    (invitation) =>
      historyFilter === "All" || inviteStatus(invitation) === historyFilter,
  );

  function showResult(result: Awaited<ReturnType<typeof createInvitation>>) {
    if (!result.success) {
      setError(result.message);
      setMessage(null);
      setInviteUrl(null);
      return;
    }
    setError(null);
    setMessage(
      `Invitation link expires ${formatDate(new Date(result.expiresAt).toLocaleString())}.`,
    );
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
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
      <SurfaceCard as="section" className="min-w-0 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Create invitation</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Each link works once and expires after seven days.
        </p>

        <form className="mt-5" onSubmit={onCreate}>
          <FormInput
            autoComplete="email"
            control={control}
            label="Staff email"
            name="email"
            className="rounded-sm!"
            required
            type="email"
          />
          <div className="mt-5">
            <FormRadio
              control={control}
              label="Role"
              layout="cards"
              name="role"
              className="w-full [&_.ant-radio-wrapper]:px-4! [&_.ant-radio-wrapper]:py-2! [&_.ant-radio-wrapper]:gap-2!"
              options={INVITATION_ROLES.map((role) => ({
                value: role.value,
                label: (
                  <span className="flex flex-col gap-0.5 py-0.5">
                    <span className="text-sm font-semibold text-ink">
                      {role.title}
                    </span>
                    <span className="text-xs leading-5 text-muted">
                      {role.description}
                    </span>
                  </span>
                ),
              }))}
              required
            />
          </div>
          <Button
            block
            className="mt-5 text-sm! rounded-sm!"
            type="submit"
            loading={isSubmitting || isWorking}
            variant="filled"
            size="sm"
          >
            Create one-time link
          </Button>
        </form>

        {error && (
          <Alert
            className="mt-4! rounded-sm!"
            message={error}
            showIcon
            type="error"
          />
        )}
        {message && (
          <Alert
            className="mt-4! rounded-sm!"
            message={message}
            showIcon
            type="success"
          />
        )}
        {inviteUrl && (
          <div className="mt-4 rounded-sm border border-primary/15 bg-primary-light/50 p-3">
            <p className="break-all text-xs leading-5 text-ink">{inviteUrl}</p>
            <Button
              className="mt-3 text-sm!"
              onClick={copyInvite}
              size="sm"
              variant="bordered"
            >
              Copy link
            </Button>
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard as="section" className="min-w-0 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Invitation history
            </h2>
            <p className="mt-1 text-sm text-muted">
              Staff invitation links and their current status
            </p>
          </div>
          <div
            aria-label="Filter invitation history"
            className="flex max-w-full flex-wrap gap-1 rounded-sm border border-line-subtle bg-panel-muted p-1"
            role="group"
          >
            {historyFilters.map((filter) => (
              <button
                aria-pressed={historyFilter === filter.key}
                className={`rounded-sm px-3 py-2 cursor-pointer text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${historyFilter === filter.key ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                key={filter.key}
                onClick={() => setHistoryFilter(filter.key)}
                type="button"
              >
                {filter.key}
                <span className="ml-1 opacity-75">{filter.count}</span>
              </button>
            ))}
          </div>
        </div>

        {visibleInvitations.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              compact
              description={
                invitations.length === 0
                  ? "Staff invitations will appear here once you create a link."
                  : `There are no ${historyFilter.toLowerCase()} invitations right now.`
              }
              title={
                invitations.length === 0 ? "No invitations yet" : "No results"
              }
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line-subtle overflow-hidden rounded-sm border border-line-subtle">
            {visibleInvitations.map((invitation) => {
              const status = inviteStatus(invitation);
              const canManage = status === "Pending" || status === "Expired";
              const statusStyle = STATUS_STYLES[status];

              return (
                <li
                  className="flex min-w-0 flex-col gap-3 bg-panel px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                  key={invitation.id}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-light text-sm font-bold text-primary">
                      {invitation.email.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="break-all text-sm font-semibold text-ink">
                        {invitation.email}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {roleLabel(invitation.role)}, link was valid until{" "}
                        {formatDate(invitation.expires_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[52px] sm:pl-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.pill}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full ${statusStyle.dot}`}
                      />
                      {status}
                    </span>
                    {canManage && (
                      <>
                        <Button
                          disabled={isWorking}
                          onClick={() =>
                            runRowAction(resendInvitation, invitation.id)
                          }
                          size="sm"
                          variant="bordered"
                          className="text-sm!"
                        >
                          Resend
                        </Button>
                        {status === "Pending" && (
                          <Button
                            disabled={isWorking}
                            onClick={() =>
                              runRowAction(revokeInvitation, invitation.id)
                            }
                            size="sm"
                            variant="danger"
                            className="text-sm!"
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
      </SurfaceCard>
    </div>
  );
}

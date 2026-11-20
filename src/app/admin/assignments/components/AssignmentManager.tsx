"use client";

import Link from "next/link";
import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Tag } from "antd";
import { useForm } from "react-hook-form";
import { FormSelect } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";
import type { PublicViews } from "@/types/database-views";
import { reassignApplication } from "../actions";
import {
  assignmentSchema,
  type AssignmentValues,
  UNASSIGNED_EVALUATOR,
} from "../schema";

type Assignment = PublicViews["v_admin_application_assignments"]["Row"];
type EvaluatorCount =
  PublicViews["v_admin_evaluator_assignment_counts"]["Row"];
type AssignmentHistory =
  PublicViews["v_admin_application_assignment_history"]["Row"];
type EvaluatorOption = { id: string; email: string };

function AssignmentEditor({
  application,
  evaluators,
}: {
  application: Assignment;
  evaluators: EvaluatorOption[];
}) {
  const [message, setMessage] = useState<{
    text: string;
    success: boolean;
  } | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<AssignmentValues>({
    resolver: yupResolver(assignmentSchema),
    defaultValues: {
      applicationId: application.application_id,
      evaluatorId:
        application.assigned_evaluator_id ?? UNASSIGNED_EVALUATOR,
    },
  });
  const currentEvaluatorId = application.assigned_evaluator_id;
  const currentEvaluatorUnavailable =
    currentEvaluatorId !== null &&
    !evaluators.some(
      (evaluator) => evaluator.id === currentEvaluatorId,
    );

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    const result = await reassignApplication(values);
    setMessage({ text: result.message, success: result.success });
  });

  return (
    <form className="min-w-[280px] space-y-2" onSubmit={onSubmit}>
      <FormSelect
        control={control}
        label={`Evaluator for ${application.applicant_number}`}
        name="evaluatorId"
        options={[
          { label: "Unassigned", value: UNASSIGNED_EVALUATOR },
          ...(currentEvaluatorUnavailable && currentEvaluatorId
            ? [
                {
                  label: `${application.assigned_evaluator_email ?? "Former evaluator"} (not eligible)`,
                  value: currentEvaluatorId,
                  disabled: true,
                },
              ]
            : []),
          ...evaluators.map((evaluator) => ({
            label: evaluator.email,
            value: evaluator.id,
          })),
        ]}
        required
      />
      <Button
        className="w-full"
        disabled={isSubmitting}
        loading={isSubmitting}
        type="submit"
        variant="bordered"
      >
        Save assignment
      </Button>
      {message && (
        <Alert
          message={message.text}
          showIcon
          type={message.success ? "success" : "error"}
        />
      )}
    </form>
  );
}

export function AssignmentManager({
  assignments,
  evaluatorCounts,
  evaluators,
  history,
  openCount,
  unassignedCount,
  filter,
  page,
  totalPages,
}: {
  assignments: Assignment[];
  evaluatorCounts: EvaluatorCount[];
  evaluators: EvaluatorOption[];
  history: AssignmentHistory[];
  openCount: number;
  unassignedCount: number;
  filter: "all" | "unassigned";
  page: number;
  totalPages: number;
}) {
  const filterHref = (nextFilter: "all" | "unassigned") =>
    nextFilter === "all"
      ? "/admin/assignments"
      : "/admin/assignments?filter=unassigned";
  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams();
    if (filter === "unassigned") query.set("filter", filter);
    query.set("page", String(nextPage));
    return `/admin/assignments?${query.toString()}`;
  };

  return (
    <div className="space-y-6">
      {evaluators.length === 0 && (
        <Alert
          description="New applications will remain unassigned until an account has the Evaluator role. Invite or enable evaluators, then assign the pending applications below."
          message="No eligible evaluators"
          showIcon
          type="warning"
        />
      )}
      <section
        aria-label="Assignment overview"
        className="grid gap-3 sm:grid-cols-3"
      >
        <SurfaceCard className="p-4">
          <p className="text-sm text-muted">Open applications</p>
          <p className="mt-2 text-2xl font-bold text-ink">{openCount}</p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-sm text-muted">Unassigned</p>
          <p className="mt-2 text-2xl font-bold text-warning">
            {unassignedCount}
          </p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-sm text-muted">Eligible evaluators</p>
          <p className="mt-2 text-2xl font-bold text-ink">
            {evaluators.length}
          </p>
        </SurfaceCard>
      </section>

      <SurfaceCard as="section" className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Current workload
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              New submissions rotate globally through evaluator accounts in
              creation order. Existing assignments stay in place unless changed
              here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              aria-current={filter === "all" ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-sm border px-4 text-sm font-semibold ${filter === "all" ? "border-primary bg-primary-light text-primary" : "border-line-strong text-ink hover:bg-panel-muted"}`}
              href={filterHref("all")}
            >
              All open
            </Link>
            <Link
              aria-current={filter === "unassigned" ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-sm border px-4 text-sm font-semibold ${filter === "unassigned" ? "border-primary bg-primary-light text-primary" : "border-line-strong text-ink hover:bg-panel-muted"}`}
              href={filterHref("unassigned")}
            >
              Unassigned
            </Link>
          </div>
        </div>
        {evaluatorCounts.length > 0 && (
          <ul className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {evaluatorCounts.map((evaluator) => (
              <li
                className="flex items-center justify-between gap-3 rounded-sm border border-line-subtle bg-panel-muted px-3 py-2 text-sm"
                key={evaluator.evaluator_id}
              >
                <span className="break-all text-ink">
                  {evaluator.evaluator_email}
                </span>
                <Tag>{evaluator.assigned_count} assigned</Tag>
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>

      <SurfaceCard as="section" className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">
              {filter === "unassigned"
                ? "Applications needing assignment"
                : "Open applications"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {assignments.length} shown · {filter === "unassigned" ? unassignedCount : openCount}{" "}
              total
            </p>
          </div>
          <p className="text-sm text-muted">
            Page {page} of {totalPages}
          </p>
        </div>
        {assignments.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              description={
                filter === "unassigned"
                  ? "All open applications currently have an evaluator."
                  : "New submitted applications will appear here."
              }
              title="No applications to show"
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line-subtle">
            {assignments.map((application) => (
              <li
                className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] lg:items-center"
                key={application.application_id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">
                      {application.applicant_number}
                    </p>
                    <WorkflowStatusTag status={application.application_status} />
                    {application.assigned_evaluator_id ? (
                      <Tag color="green">Assigned</Tag>
                    ) : (
                      <Tag color="orange">Unassigned</Tag>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-ink">
                    {application.job_title}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Applied {formatDate(application.applied_at)}
                    {application.assigned_evaluator_email
                      ? ` · ${application.assigned_evaluator_email}`
                      : ""}
                  </p>
                </div>
                <AssignmentEditor
                  application={application}
                  evaluators={evaluators}
                />
              </li>
            ))}
          </ul>
        )}
        {totalPages > 1 && (
          <nav
            aria-label="Application assignment pages"
            className="mt-4 flex items-center justify-between border-t border-line-subtle pt-4"
          >
            <Link
              aria-disabled={page <= 1}
              className={`text-sm font-semibold ${page <= 1 ? "pointer-events-none text-muted" : "text-primary hover:text-primary-dark"}`}
              href={pageHref(Math.max(1, page - 1))}
            >
              Previous
            </Link>
            <span className="text-sm text-muted">
              Page {page} of {totalPages}
            </span>
            <Link
              aria-disabled={page >= totalPages}
              className={`text-sm font-semibold ${page >= totalPages ? "pointer-events-none text-muted" : "text-primary hover:text-primary-dark"}`}
              href={pageHref(Math.min(totalPages, page + 1))}
            >
              Next
            </Link>
          </nav>
        )}
      </SurfaceCard>

      <SurfaceCard as="section" className="p-5 sm:p-6">
        <h2 className="text-base font-semibold text-ink">
          Recent assignment history
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Assignment changes will be recorded here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line-subtle">
            {history.map((item) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                key={item.id}
              >
                <div className="min-w-0 text-sm">
                  <p className="break-all text-ink">
                    {item.previous_evaluator_email ?? "Unassigned"}{" "}
                    <span aria-hidden="true">→</span>{" "}
                    {item.evaluator_email ?? "Unassigned"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Application {item.application_id.slice(0, 8)} ·{" "}
                    {item.assignment_source === "ROUND_ROBIN"
                      ? "Round-robin"
                      : `Changed by ${item.assigned_by_email ?? "admin"}`}
                  </p>
                </div>
                <time className="text-xs text-muted">
                  {formatDate(item.assigned_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>
    </div>
  );
}

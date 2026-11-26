import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableEmptyRow } from "@/components/ui/TableEmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { HiringRemarksForm } from "@/app/sds/applications/components/HiringRemarksForm";
import { formatDate } from "@/utils/format-date";
import { getHrApplicationStatusDescription } from "@/utils/hr-application-status";
import type { Database } from "@/types/database";

type StaffSupabase = SupabaseClient<Database>;

export async function StaffApplicationDetailPage({
  applicationId,
  basePath,
  supabase,
  canHire,
  workspace,
  returnStatus = "QUALIFIED",
}: Readonly<{
  applicationId: string;
  basePath: string;
  supabase: StaffSupabase;
  canHire: boolean;
  workspace?: "SDS" | "ASDS" | "HR";
  returnStatus?: string;
}>) {
  if (!/^[0-9a-f-]{36}$/i.test(applicationId)) notFound();
  const { data: application, error } = await supabase
    .from("v_staff_application_reviews")
    .select(
      "application_id, applicant_name, applicant_number, application_status, applied_at, job_id, job_title, position_title",
    )
    .eq("application_id", applicationId)
    .maybeSingle();
  if (error || !application) notFound();
  const scoreResult = await supabase
    .from("v_staff_application_scores")
    .select(
      "criterion_key, criterion_title, maximum_points, points, minimum_total_points, is_complete, total_points",
    )
    .eq("application_id", applicationId)
    .order("criterion_key");
  const scoreRows = scoreResult.data ?? [];
  const scoreSummary = scoreRows[0] ?? null;
  const workspaceLabel = workspace ?? (canHire ? "SDS" : "ASDS");
  const backHref =
    workspaceLabel === "HR"
      ? `${basePath}/postings/${application.job_id}?status=${encodeURIComponent(returnStatus)}`
      : `${basePath}/postings/${application.job_id}`;

  return (
    <div className="mx-auto">
      <PageHeader
        actions={
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href={`${basePath}/applications/${application.application_id}/pds/download`}
          >
            <ArrowDownTrayIcon aria-hidden="true" className="size-4" />
            Download PDS
          </Link>
        }
        eyebrow={`${workspaceLabel} workspace · Application`}
        title={application.applicant_name}
        description={`${application.job_title} · ${application.position_title ?? "Position not recorded"}`}
        backHref={backHref}
        backLabel={workspaceLabel === "HR" ? "Back to applicants" : "Ranked applicants"}
      />
      <section className="mt-7 rounded-xl border border-line bg-panel p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Application status</h2>
          <WorkflowStatusTag status={application.application_status} />
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          {getHrApplicationStatusDescription(application.application_status)}
        </p>
        <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-line-subtle pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted">Applicant</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {application.applicant_name}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Applicant number</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {application.applicant_number}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Job posting</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {application.job_title}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Position</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {application.position_title ?? "Position not recorded"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Applied</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {formatDate(application.applied_at, "MMM D, YYYY · h:mm A")}
            </dd>
          </div>
        </dl>
      </section>
      <section className="mt-6 rounded-xl border border-line bg-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Scoring summary</h2>
            <p className="mt-1 text-sm text-muted">
              Points for each configured criterion, including automatic PDS
              scores.
            </p>
          </div>
          {scoreSummary && (
            <p className="text-sm font-semibold text-ink">
              Total {scoreSummary.total_points ?? 0}
              {scoreSummary.minimum_total_points == null
                ? ""
                : ` / minimum ${scoreSummary.minimum_total_points}`}
            </p>
          )}
        </div>
        {scoreResult.error ? (
          <p className="mt-4 text-sm text-danger">
            The scoring summary could not be loaded. Refresh the page to try
            again.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-y border-line-subtle text-xs text-muted">
                <tr>
                  <th className="py-2 pr-4 font-medium">Criterion</th>
                  <th className="px-4 py-2 text-right font-medium">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {scoreRows.length ? (
                  scoreRows.map((row) => (
                    <tr key={row.criterion_key}>
                      <td className="py-3 pr-4 font-medium text-ink">
                        {row.criterion_title}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">
                        {row.points == null
                          ? "Awaiting score"
                          : `${row.points} / ${row.maximum_points}`}
                      </td>
                    </tr>
                  ))
                ) : (
                  <TableEmptyRow
                    colSpan={2}
                    description="Scoring details will appear here when criteria are configured."
                    title="No criterion scores yet"
                  />
                )}
              </tbody>
            </table>
          </div>
        )}
        {application.application_status === "NOT_QUALIFIED" &&
          scoreSummary?.minimum_total_points != null &&
          scoreSummary.total_points < scoreSummary.minimum_total_points && (
            <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              Automatically disqualified because the completed total is below
              the posting minimum.
            </p>
          )}
        {scoreSummary && !scoreSummary.is_complete && (
          <p className="mt-3 text-sm text-muted">
            The total is incomplete until every criterion has points.
          </p>
        )}
      </section>
      {canHire && application.application_status === "QUALIFIED" && (
        <HiringRemarksForm
          applicationId={application.application_id}
          applicantName={application.applicant_name}
        />
      )}
    </div>
  );
}

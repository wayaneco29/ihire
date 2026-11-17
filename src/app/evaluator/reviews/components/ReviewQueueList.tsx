import Link from "next/link";
import { ArrowRightIcon, BriefcaseIcon } from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";
import { formatPositionLabel } from "@/utils/format-position-track";
import type { PublicViews } from "@/types/database-views";
import { REVIEW_QUEUE_STATUS_OPTIONS, reviewQueueHref, type ReviewQueueStatus } from "../queue";

type ReviewQueueJob = PublicViews["v_evaluator_review_queue_with_scored_summary"]["Row"];
type ReviewQueueApplicant = PublicViews["v_evaluator_review_queue_with_scored"]["Row"];

export function ReviewQueueList({
  jobs,
  applicants,
  selectedJobId,
  page,
  totalPages,
  waitingCount,
  selectedStatus,
}: {
  jobs: ReviewQueueJob[];
  applicants: ReviewQueueApplicant[];
  selectedJobId?: string;
  page: number;
  totalPages: number;
  waitingCount: number;
  selectedStatus?: ReviewQueueStatus;
}) {
  if (!selectedJobId) {
    if (!jobs.length) {
      return (
        <div className="mt-7">
          <EmptyState
            description="New applications assigned to you will appear here."
            title="No reviews waiting"
          />
        </div>
      );
    }

    return (
      <section aria-labelledby="postings-heading" className="mt-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="text-lg font-semibold text-ink" id="postings-heading">Job postings</h2><p className="mt-1 text-sm text-muted">Choose a posting to review its applicants.</p></div>
          <p className="text-sm tabular-nums text-muted">{jobs.length} {jobs.length === 1 ? "posting" : "postings"}</p>
        </div>
      <ul className="grid gap-3 xl:grid-cols-2">
        {[...jobs]
          .sort((first, second) => second.waiting_count - first.waiting_count)
          .map((job) => (
            <li key={job.job_id}>
              <Link
                className="group flex h-full flex-col rounded-sm border border-line bg-panel p-5 transition hover:border-primary hover:bg-primary-light/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6"
                href={`/evaluator/reviews?jobId=${job.job_id}`}
              >
                <div className="flex w-full items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="grid size-9 place-items-center rounded-sm bg-panel-muted text-muted group-hover:bg-primary-light group-hover:text-primary"><BriefcaseIcon aria-hidden="true" className="size-5" /></span>
                    <h3 className="mt-3 text-lg font-semibold leading-snug text-ink group-hover:text-primary">
                      {job.job_title}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded-sm bg-primary-light px-3 py-2 text-center text-primary">
                    <span className="block text-xl font-bold leading-none">
                      {job.waiting_count}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold">
                      waiting
                    </span>
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span>
                    {job.waiting_count} applicant
                    {job.waiting_count === 1 ? "" : "s"} waiting
                  </span>
                  {job.rereview_count > 0 && (
                    <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
                      {job.rereview_count} re-review
                      {job.rereview_count === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <span className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary">
                  View applicants
                  <ArrowRightIcon aria-hidden="true" className="ml-2 size-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
      </ul>
      </section>
    );
  }

  const selectedJob = jobs.find((job) => job.job_id === selectedJobId);
  const statusFilter = (
    <nav aria-label="Filter applications by status" className="mt-7">
      <p className="mb-2 text-sm font-semibold text-ink">Application status</p>
      <div className="flex flex-wrap gap-2">
        {[{ value: undefined, label: "All statuses" }, ...REVIEW_QUEUE_STATUS_OPTIONS].map((option) => (
          <Link
            aria-current={selectedStatus === option.value ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-sm border px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selectedStatus === option.value ? "border-primary bg-primary-light text-primary" : "border-line bg-panel text-muted hover:border-primary hover:text-primary"}`}
            href={reviewQueueHref(selectedJobId, 1, option.value)}
            key={option.value ?? "ALL"}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </nav>
  );
  if (!selectedJob || !applicants.length) {
    return (
      <>{selectedJob && statusFilter}<div className="mt-7">
        <EmptyState
          action={
            <Link
              className="font-semibold text-primary hover:text-primary-dark"
              href="/evaluator/reviews"
            >
              Back to job postings
            </Link>
          }
          description={selectedStatus ? "Choose another status to see applicants in this posting." : "This posting no longer has applicants waiting for review."}
          title={selectedStatus ? "No applicants with this status" : "Queue is clear"}
        />
      </div></>
    );
  }

  return (
    <>{statusFilter}<div className="mt-5 overflow-hidden rounded-sm border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
        <div>
          <h2 className="font-semibold text-ink">Applicants</h2>
          <p className="mt-1 text-sm text-muted">
            {waitingCount} waiting for review
          </p>
        </div>
        <p className="text-sm text-muted">
          Open an applicant, then move through this posting&apos;s queue.
        </p>
      </div>
      <div className="divide-y divide-line-subtle md:hidden">
        {applicants.map((item) => (
          <article className="p-5" key={item.application_id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-ink">{item.applicant_number}</h3>
                <p className="mt-1 text-sm text-muted">{item.position_title ? formatPositionLabel(item.position_title, item.position_track ?? "") : "Position not recorded"}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${item.review_kind === "REREVIEW" ? "bg-warning/10 text-warning" : "bg-primary-light text-primary"}`}>{item.review_kind === "REREVIEW" ? "Re-review" : item.review_kind === "ASSESSMENT" ? "Decision needed" : "Initial"}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
              <span>Applied {formatDate(item.applied_at)}</span>
              <WorkflowStatusTag status={item.application_status} />
            </div>
            <Link className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/evaluator/applications/${item.application_id}?jobId=${selectedJobId}&page=${page}${selectedStatus ? `&status=${selectedStatus}` : ""}`}>Review applicant <ArrowRightIcon aria-hidden="true" className="size-4" /></Link>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-panel-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold" scope="col">
                Applicant
              </th>
              <th className="px-5 py-3 font-semibold" scope="col">
                Position
              </th>
              <th className="px-5 py-3 font-semibold" scope="col">
                Applied
              </th>
              <th className="px-5 py-3 font-semibold" scope="col">
                Application status
              </th>
              <th className="px-5 py-3 font-semibold" scope="col">
                Queue
              </th>
              <th className="px-5 py-3 text-right font-semibold" scope="col">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {applicants.map((item) => (
              <tr
                className="transition hover:bg-panel-muted/60"
                key={item.application_id}
              >
                <td className="px-5 py-4 font-semibold text-ink">
                  {item.applicant_number}
                </td>
                <td className="px-5 py-4 text-muted">
                  {item.position_title
                    ? formatPositionLabel(
                        item.position_title,
                        item.position_track ?? "",
                      )
                    : "Position not recorded"}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-muted">
                  {formatDate(item.applied_at)}
                </td>
                <td className="px-5 py-4">
                  <WorkflowStatusTag status={item.application_status} />
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.review_kind === "REREVIEW" ? "bg-warning/10 text-warning" : "bg-primary-light text-primary"}`}
                  >
                    {item.review_kind === "REREVIEW"
                      ? "Re-review"
                      : item.review_kind === "ASSESSMENT"
                        ? "Decision needed"
                        : "Initial review"}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    className="inline-flex min-h-10 items-center justify-center rounded-sm bg-primary px-3 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
                    href={`/evaluator/applications/${item.application_id}?jobId=${selectedJobId}&page=${page}${selectedStatus ? `&status=${selectedStatus}` : ""}`}
                  >
                    Review applicant
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line-subtle px-5 py-4">
        <Link
          aria-disabled={page <= 1}
          className={`text-sm font-semibold ${page <= 1 ? "pointer-events-none text-muted" : "text-primary hover:text-primary-dark"}`}
          href={reviewQueueHref(selectedJobId, Math.max(1, page - 1), selectedStatus)}
        >
          Previous
        </Link>
        <p className="text-sm text-muted">
          Page {page} of {totalPages}
        </p>
        <Link
          aria-disabled={page >= totalPages}
          className={`text-sm font-semibold ${page >= totalPages ? "pointer-events-none text-muted" : "text-primary hover:text-primary-dark"}`}
          href={reviewQueueHref(selectedJobId, Math.min(totalPages, page + 1), selectedStatus)}
        >
          Next
        </Link>
      </div>
    </div></>
  );
}

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";
import type { ReviewQueueItem } from "../queue";

export function ReviewQueueList({
  items,
  selectedJobId,
}: {
  items: ReviewQueueItem[];
  selectedJobId?: string;
}) {
  const postings = new Map<string, ReviewQueueItem[]>();
  for (const item of items) {
    const postingItems = postings.get(item.job_id) ?? [];
    postingItems.push(item);
    postings.set(item.job_id, postingItems);
  }

  if (!items.length) {
    return (
      <div className="mt-7">
        <EmptyState
          description="New applications and documents that need review will appear here."
          title="No reviews waiting"
        />
      </div>
    );
  }

  if (selectedJobId) {
    const applicants = postings.get(selectedJobId);
    if (!applicants) {
      return (
        <div className="mt-7">
          <EmptyState
            action={
              <Link
                className="font-semibold text-primary hover:text-primary-dark"
                href="/evaluator/reviews"
              >
                Back to job postings
              </Link>
            }
            description="This posting no longer has applicants waiting for review."
            title="Queue is clear"
          />
        </div>
      );
    }

    return (
      <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
          <div>
            <h2 className="font-semibold text-ink">Applicants</h2>
            <p className="mt-1 text-sm text-muted">
              {applicants.length} waiting for review
            </p>
          </div>
          <p className="text-sm text-muted">
            Open the first applicant, then move through the queue.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-panel-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold" scope="col">
                  Applicant
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
                  <td className="whitespace-nowrap px-5 py-4 text-muted">
                    {formatDate(item.applied_at)}
                  </td>
                  <td className="px-5 py-4">
                    <WorkflowStatusTag status={item.application_status} />
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.reviewKind === "REREVIEW" ? "bg-warning/10 text-warning" : "bg-primary-light text-primary"}`}
                    >
                      {item.reviewKind === "REREVIEW"
                        ? "Re-review"
                        : "Initial review"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
                      href={`/evaluator/applications/${item.application_id}?jobId=${selectedJobId}`}
                    >
                      Review applicant
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <ul className="mt-7 grid gap-4 xl:grid-cols-2">
      {[...postings.entries()]
        .sort(([, first], [, second]) => second.length - first.length)
        .map(([jobId, applicants]) => {
          const title = applicants[0].jobTitle;
          const reReviewCount = applicants.filter(
            (item) => item.reviewKind === "REREVIEW",
          ).length;
          return (
            <li key={jobId}>
              <Link
                className="group flex h-full flex-col rounded-2xl border border-line bg-panel p-5 transition hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6"
                href={`/evaluator/reviews?jobId=${jobId}`}
              >
                <div className="flex w-full items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      Job posting
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-ink group-hover:text-primary">
                      {title}
                    </h2>
                  </div>
                  <span className="shrink-0 rounded-md bg-primary-light px-3 py-2 text-center text-primary">
                    <span className="block text-xl font-bold leading-none">
                      {applicants.length}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold">
                      pending
                    </span>
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span>
                    {applicants.length} applicant
                    {applicants.length === 1 ? "" : "s"} waiting
                  </span>
                  {reReviewCount > 0 && (
                    <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
                      {reReviewCount} re-review{reReviewCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <span className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary">
                  View applicants{" "}
                  <span
                    aria-hidden="true"
                    className="ml-2 transition group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
    </ul>
  );
}

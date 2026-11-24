"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import type { PostingDisplayStatus } from "@/utils/job-posting-status";
import { PostingStatusPill } from "../../postings/components/PostingStatusPill";

type PostingFilter = "all" | "open" | "filled" | "closed";

type PostingProgress = {
  id: string;
  title: string;
  deadlineDate: string | null;
  deadlinePassed: boolean;
  daysRemaining: number | null;
  applicants: number;
  status: PostingDisplayStatus;
};

type HrDashboardViewProps = {
  hiredCount: number;
  pendingCount: number;
  postings: PostingProgress[];
  totalApplicants: number;
};

export function HrDashboardView({
  hiredCount,
  pendingCount,
  postings,
  totalApplicants,
}: HrDashboardViewProps) {
  const [filter, setFilter] = useState<PostingFilter>("all");
  const openCount = postings.filter(
    (posting) => posting.status === "OPEN",
  ).length;
  const filledCount = postings.filter(
    (posting) => posting.status === "FILLED",
  ).length;
  const closedCount = postings.length - openCount - filledCount;
  const visiblePostings = useMemo(
    () =>
      postings.filter((posting) => {
        if (filter === "open") return posting.status === "OPEN";
        if (filter === "filled") return posting.status === "FILLED";
        if (filter === "closed") {
          return posting.status === "CLOSED" || posting.status === "DRAFT";
        }
        return true;
      }),
    [filter, postings],
  );
  const metrics = [
    { label: "Awaiting HR decision", value: pendingCount },
    { label: "Total applicants", value: totalApplicants },
    { label: "Hired", value: hiredCount },
    { label: "Open postings", value: openCount },
    { label: "Total postings", value: postings.length },
  ];
  const filters: { id: PostingFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: postings.length },
    { id: "open", label: "Open", count: openCount },
    { id: "filled", label: "Filled", count: filledCount },
    { id: "closed", label: "Closed", count: closedCount },
  ];

  return (
    <div className="mx-auto">
      <section
        aria-label="Hiring totals"
        className="mt-7 grid grid-cols-2 overflow-hidden rounded-md border border-line bg-panel md:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]"
      >
        {metrics.map((metric, index) => (
          <article
            className={`p-4 sm:p-5 ${
              index === 0
                ? "col-span-2 border-b border-line-subtle bg-warning/10 md:col-span-1 md:border-b-0 md:border-r"
                : index === 1
                  ? "border-r border-b border-line-subtle md:border-b-0 md:border-r"
                  : index === 2
                    ? "border-b border-line-subtle md:border-b-0 md:border-r"
                    : index === 3
                      ? "border-r border-line-subtle md:border-r"
                      : ""
            }`}
            key={metric.label}
          >
            <p
              className={`text-sm ${index === 0 ? "font-medium text-warning" : "text-muted"}`}
            >
              {metric.label}
            </p>
            <p
              className={`mt-1 font-semibold tracking-tight ${
                index === 0
                  ? "text-3xl text-warning"
                  : "text-3xl text-ink"
              }`}
            >
              {metric.value}
            </p>
            {index === 0 && (
              <Link
                className="mt-2 inline-flex text-sm font-medium text-warning underline underline-offset-2 hover:text-warning/80"
                href="/hr/postings"
              >
                Review applicants
              </Link>
            )}
          </article>
        ))}
      </section>

      <section className="mt-9">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Posting progress</h2>
            <p className="mt-1 text-sm text-muted">Soonest deadline first.</p>
          </div>

          <nav
            aria-label="Filter postings"
            className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-md border border-line bg-panel p-1"
          >
            {filters.map((option) => (
              <Button
                aria-pressed={filter === option.id}
                className={`inline-flex min-h-11 items-center justify-center rounded-sm px-4 text-sm font-semibold transition-colors ${
                  filter === option.id
                    ? "bg-primary-light text-primary"
                    : "text-muted hover:bg-panel-muted hover:text-ink"
                }`}
                key={option.id}
                onClick={() => setFilter(option.id)}
                type="button"
                variant="unstyled"
              >
                {option.label} {option.count}
              </Button>
            ))}
          </nav>
        </div>

        {!postings.length ? (
          <div className="mt-4 rounded-md border border-line bg-panel p-6 text-center">
            <h3 className="font-semibold text-ink">No job postings yet</h3>
            <p className="mt-1 text-sm text-muted">
              Create a posting to begin receiving applications.
            </p>
            <Link
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[8px] bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark"
              href="/hr/postings/new"
            >
              Create your first posting
            </Link>
          </div>
        ) : visiblePostings.length ? (
          <ul className="mt-3 divide-y divide-line-subtle overflow-hidden rounded-md border border-line bg-panel">
            {visiblePostings.map((posting) => {
              const deadlineHeading =
                posting.status === "FILLED"
                  ? "Hiring complete"
                  : posting.status === "DRAFT"
                    ? "Draft"
                    : posting.status === "CLOSED"
                      ? "Closed"
                      : !posting.deadlineDate
                        ? "No deadline"
                        : posting.daysRemaining === 0
                          ? "Due today"
                          : `${posting.daysRemaining} ${
                              posting.daysRemaining === 1 ? "day" : "days"
                            } left`;
              const deadlineDetails = posting.deadlineDate
                ? `${posting.deadlinePassed ? "Deadline was" : "Deadline"} ${
                    posting.deadlineDate
                  }`
                : "No deadline set";

              return (
                <li key={posting.id}>
                  <Link
                    className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-4 transition-colors hover:bg-panel-muted sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto_1.25rem] sm:gap-x-5 sm:px-5 ${
                      posting.status === "OPEN" ? "" : "text-muted"
                    }`}
                    href={`/hr/postings/${posting.id}`}
                  >
                    <div className="min-w-0">
                      <PostingStatusPill status={posting.status} />
                      <h3
                        className={`mt-1 break-words font-semibold ${
                          posting.status === "OPEN"
                            ? "text-ink group-hover:text-primary"
                            : "text-muted-strong"
                        }`}
                      >
                        {posting.title}
                      </h3>
                    </div>

                    <p className="col-span-2 row-start-2 text-sm sm:col-span-1 sm:row-start-auto">
                      <span
                        className={`font-semibold ${posting.status === "OPEN" ? "text-ink" : "text-muted-strong"}`}
                      >
                        {posting.applicants}
                      </span>{" "}
                      {posting.applicants === 1 ? "applicant" : "applicants"}{" "}
                      applied
                    </p>

                    <div className="col-start-2 row-start-1 text-right sm:col-start-3 sm:row-start-auto">
                      <p
                        className={`text-sm font-semibold ${
                          posting.status === "OPEN" &&
                          posting.daysRemaining !== null &&
                          posting.daysRemaining <= 7
                            ? "text-warning"
                            : posting.status === "OPEN"
                              ? "text-ink"
                              : "text-muted-strong"
                        }`}
                      >
                        {deadlineHeading}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {deadlineDetails}
                      </p>
                    </div>

                    <ChevronRightIcon
                      aria-hidden="true"
                      className="hidden size-4 text-muted transition-transform group-hover:translate-x-0.5 sm:col-start-4 sm:row-start-auto sm:block"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-lg border border-line bg-panel p-6 text-center text-sm text-muted">
            No {filter} postings.
          </p>
        )}
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronRightIcon,
  UsersIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import type { PostingDisplayStatus } from "@/utils/job-posting-status";
import { PostingStatusPill } from "../../postings/components/PostingStatusPill";

type PostingFilter =
  | "all"
  | "open"
  | "filled"
  | "closed"
  | "expired"
  | "draft";

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
  const [filter, setFilter] = useState<PostingFilter>("open");
  const openCount = postings.filter(
    (posting) => posting.status === "OPEN",
  ).length;
  const filledCount = postings.filter(
    (posting) => posting.status === "FILLED",
  ).length;
  const closedCount = postings.filter(
    (posting) => posting.status === "CLOSED",
  ).length;
  const expiredCount = postings.filter(
    (posting) => posting.status === "EXPIRED",
  ).length;
  const draftCount = postings.filter(
    (posting) => posting.status === "DRAFT",
  ).length;
  const visiblePostings = useMemo(
    () =>
      postings.filter((posting) => {
        if (filter === "open") return posting.status === "OPEN";
        if (filter === "filled") return posting.status === "FILLED";
        if (filter === "closed") {
          return posting.status === "CLOSED";
        }
        if (filter === "expired") return posting.status === "EXPIRED";
        if (filter === "draft") return posting.status === "DRAFT";
        return true;
      }),
    [filter, postings],
  );
  const metrics = [
    { label: "Awaiting decision", value: pendingCount },
    { label: "Open postings", value: openCount },
    { label: "Total applicants", value: totalApplicants },
    { label: "Hired", value: hiredCount },
  ];
  const filters: { id: PostingFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: postings.length },
    { id: "open", label: "Open", count: openCount },
    { id: "filled", label: "Filled", count: filledCount },
    { id: "closed", label: "Closed", count: closedCount },
    { id: "expired", label: "Expired", count: expiredCount },
    { id: "draft", label: "Drafts", count: draftCount },
  ];

  return (
    <div className="mx-auto">
      <section
        aria-label="Hiring overview"
        className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4 xl:gap-5"
      >
        {metrics.map((metric) => (
          <article
            className="rounded-xl border border-line bg-panel px-5 py-5 sm:px-6"
            key={metric.label}
          >
            <p className="text-xs text-muted">{metric.label}</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-ink tabular-nums">
              {metric.value}
            </p>
          </article>
        ))}
      </section>
      <section className="mt-10" aria-labelledby="job-postings-title">
        <div className="flex flex-col gap-3">
          <nav
            aria-label="Filter postings"
            className="flex max-w-full flex-wrap items-center gap-x-6 border-b border-line"
          >
            {filters.map((option) => (
              <Button
                aria-pressed={filter === option.id}
                className={`inline-flex min-h-11 items-center justify-center gap-2 border-b-2 px-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  filter === option.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:border-line-strong hover:text-ink"
                }`}
                key={option.id}
                onClick={() => setFilter(option.id)}
                type="button"
                variant="unstyled"
              >
                {option.label}
                <span className="text-xs text-muted tabular-nums">
                  {option.count}
                </span>
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
          <ul
            aria-label="Job postings"
            className="mt-5 divide-y divide-line-subtle overflow-hidden rounded-xl border border-line bg-panel"
          >
            {visiblePostings.map((posting) => {
              const deadlineHeading =
                posting.status === "FILLED"
                  ? "Hiring complete"
                  : posting.status === "DRAFT"
                    ? "Draft"
                    : posting.status === "CLOSED"
                      ? "Closed"
                      : posting.status === "EXPIRED"
                        ? "Expired"
                      : !posting.deadlineDate || posting.daysRemaining === null
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
                    className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-4 py-5 transition-colors hover:bg-panel-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto_1.25rem] sm:gap-x-5 sm:px-6 ${
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

                    <p className="col-span-2 row-start-2 flex items-center gap-1.5 text-xs text-muted sm:col-span-1 sm:row-start-auto">
                      <UsersIcon
                        aria-hidden="true"
                        className="mr-1 size-4 shrink-0"
                      />
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
                        className={`flex items-center justify-end gap-2 text-sm font-semibold ${
                          posting.status === "OPEN" &&
                          posting.daysRemaining !== null &&
                          posting.daysRemaining <= 7
                            ? "text-warning"
                            : posting.status === "OPEN"
                              ? "text-ink"
                              : "text-muted-strong"
                        }`}
                      >
                        {posting.status === "OPEN" && (
                          <ClockIcon
                            aria-hidden="true"
                            className="size-4 shrink-0"
                          />
                        )}
                        {deadlineHeading}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {deadlineDetails}
                      </p>
                    </div>

                    <ChevronRightIcon
                      aria-hidden="true"
                      className="hidden size-4 text-muted sm:col-start-4 sm:row-start-auto sm:block"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-lg border border-line bg-panel p-6 text-center text-sm text-muted">
            No {filter === "draft" ? "draft" : filter} postings.
          </p>
        )}
      </section>
    </div>
  );
}

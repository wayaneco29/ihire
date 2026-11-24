"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input, Select } from "antd";
import { Button } from "@/components/ui/Button";
import {
  CalendarDaysIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDate } from "@/utils/format-date";

type DeadlineFilter = "ALL" | "SOON" | "NONE";

export type JobListItem = {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  slots: number;
  deadline: string | null;
  applied: boolean;
};

function getDeadlineMessage(deadline: string | null, nowMs: number) {
  if (!deadline) return "No application deadline has been announced.";

  const daysRemaining = Math.ceil(
    (new Date(deadline).getTime() - nowMs) / (24 * 60 * 60 * 1000),
  );
  if (daysRemaining <= 0) return "Applications close today.";
  return `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left before applications close.`;
}

export function JobListClient({
  jobs,
  nowMs,
}: {
  jobs: JobListItem[];
  nowMs: number;
}) {
  const [search, setSearch] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("ALL");

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const closingSoon = nowMs + 30 * 24 * 60 * 60 * 1000;

    return jobs.filter((job) => {
      const matchesSearch =
        !query ||
        [job.title, job.description, job.requirements ?? ""]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query);
      const deadline = job.deadline ? new Date(job.deadline).getTime() : null;
      const matchesDeadline =
        deadlineFilter === "ALL" ||
        (deadlineFilter === "SOON" &&
          deadline !== null &&
          deadline <= closingSoon) ||
        (deadlineFilter === "NONE" && deadline === null);
      return matchesSearch && matchesDeadline;
    });
  }, [deadlineFilter, jobs, nowMs, search]);

  return (
    <>
      <section
        aria-label="Filter job postings"
        className="mt-7 grid gap-2 sm:grid-cols-[minmax(0,1fr)_17rem] sm:gap-3"
      >
        <label className="block min-w-0 rounded-xl">
          <span className="sr-only">Search job postings</span>
          <Input
            prefix={
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="mr-2 size-5 text-muted"
              />
            }
            className="rounded-sm!"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title or description"
            size="medium"
            type="search"
            value={search}
          />
        </label>
        <label className="block min-w-0">
          <span className="sr-only">Filter by application deadline</span>
          <Select
            className="w-full"
            prefix={
              <CalendarDaysIcon
                aria-hidden="true"
                className="mr-2 size-5 text-muted"
              />
            }
            aria-label="Filter by application deadline"
            options={[
              { label: "Any deadline", value: "ALL" },
              { label: "Closing within 30 days", value: "SOON" },
              { label: "No deadline listed", value: "NONE" },
            ]}
            onChange={(value: string) => {
              if (value === "ALL" || value === "SOON" || value === "NONE") {
                setDeadlineFilter(value);
              }
            }}
            size="medium"
            value={deadlineFilter}
          />
        </label>
      </section>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {filteredJobs.length}{" "}
          {filteredJobs.length === 1 ? "posting" : "postings"} found
        </p>
        {filteredJobs.length > 0 && (search || deadlineFilter !== "ALL") && (
          <Button
            onClick={() => {
              setSearch("");
              setDeadlineFilter("ALL");
            }}
            type="button"
            variant="ghost"
          >
            Clear filters
          </Button>
        )}
      </div>

      {filteredJobs.length ? (
        <ul className="mt-4 grid gap-4">
          {filteredJobs.map((job) => {
            const deadlineMessage = getDeadlineMessage(job.deadline, nowMs);
            return (
              <li
                className="grid overflow-hidden rounded-sm border border-line bg-panel shadow-card lg:grid-cols-[minmax(0,1fr)_19rem]"
                key={job.id}
              >
                <article className="min-w-0 p-5 sm:p-7 lg:p-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                      {job.title}
                    </h2>
                    <StatusTag className="gap-2 border-primary/10 bg-primary-light px-3 text-primary">
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-full bg-primary"
                      />
                      Open
                    </StatusTag>
                  </div>
                  <p className="mt-4 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted sm:text-base">
                    {job.description}
                  </p>
                  <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-light text-primary"
                      >
                        <UserGroupIcon className="size-6" />
                      </span>
                      <div>
                        <dt className="text-sm text-muted">Hiring slots</dt>
                        <dd className="mt-0.5 text-lg font-semibold leading-tight text-ink">
                          {job.slots}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-light text-primary"
                      >
                        <CalendarDaysIcon className="size-6" />
                      </span>
                      <div>
                        <dt className="text-sm text-muted">
                          Application deadline
                        </dt>
                        <dd className="mt-0.5 text-lg font-semibold leading-tight text-ink">
                          {job.deadline
                            ? formatDate(job.deadline)
                            : "Not specified"}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </article>
                <aside className="flex flex-col justify-center gap-4 bg-primary-light p-5 sm:p-7 lg:p-8">
                  <StatusTag
                    className={
                      job.applied
                        ? "w-fit gap-2 border-primary bg-primary px-3 text-on-primary"
                        : "w-fit gap-2 border-primary/15 bg-panel/70 px-3 text-primary"
                    }
                  >
                    {job.applied && (
                      <CheckIcon aria-hidden="true" className="size-4" />
                    )}
                    {job.applied ? "Application submitted" : "Ready to apply"}
                  </StatusTag>
                  <p className="max-w-xs text-sm leading-6 text-ink">
                    {deadlineMessage}
                  </p>
                  <Link
                    className="mt-1 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    href={`/applicant/jobs/${job.id}`}
                  >
                    {job.applied ? "View posting" : "View and apply"}
                  </Link>
                </aside>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3">
          <EmptyState
            action={
              <Button
                className="!border-line-strong !text-ink hover:!bg-panel-muted"
                onClick={() => {
                  setSearch("");
                  setDeadlineFilter("ALL");
                }}
                type="button"
                variant="bordered"
              >
                Clear filters
              </Button>
            }
            description="Try another search or clear the selected filters."
            title="No postings match"
          />
        </div>
      )}
    </>
  );
}

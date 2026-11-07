"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";

export type JobListItem = {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  slots: number;
  deadline: string | null;
  applied: boolean;
};

export function JobListClient({ jobs, nowMs }: { jobs: JobListItem[]; nowMs: number }) {
  const [search, setSearch] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState("ALL");

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
        (deadlineFilter === "SOON" && deadline !== null && deadline <= closingSoon) ||
        (deadlineFilter === "NONE" && deadline === null);
      return matchesSearch && matchesDeadline;
    });
  }, [deadlineFilter, jobs, nowMs, search]);

  return (
    <>
      <section aria-label="Filter job postings" className="mt-7 grid gap-3 rounded-2xl border border-line bg-panel p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Search postings</span>
          <input
            className="min-h-11 w-full rounded-lg border border-line-strong bg-panel px-3 text-sm text-ink outline-none transition placeholder:text-muted-strong focus:border-primary focus:ring-2 focus:ring-primary/15"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title or description"
            type="search"
            value={search}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Deadline</span>
          <select
            className="min-h-11 w-full rounded-lg border border-line-strong bg-panel px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            onChange={(event) => setDeadlineFilter(event.target.value)}
            value={deadlineFilter}
          >
            <option value="ALL">Any deadline</option>
            <option value="SOON">Closing within 30 days</option>
            <option value="NONE">No deadline listed</option>
          </select>
        </label>
      </section>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {filteredJobs.length} {filteredJobs.length === 1 ? "posting" : "postings"} found
        </p>
        {(search || deadlineFilter !== "ALL") && (
          <button
            className="min-h-11 rounded-lg px-2 text-sm font-medium text-primary hover:bg-primary-light hover:text-primary-dark"
            onClick={() => {
              setSearch("");
              setDeadlineFilter("ALL");
            }}
            type="button"
          >
            Clear filters
          </button>
        )}
      </div>

      {filteredJobs.length ? (
        <ul className="mt-3 grid gap-4 lg:grid-cols-2">
          {filteredJobs.map((job) => (
            <li className="flex flex-col rounded-2xl border border-line bg-panel p-5 sm:p-6" key={job.id}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink">{job.title}</h2>
                <WorkflowStatusTag status="OPEN" />
              </div>
              <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted">{job.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-panel-muted p-3">
                <div>
                  <dt className="text-xs text-muted">Available positions</dt>
                  <dd className="mt-1 text-sm font-medium text-ink">{job.slots}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Application deadline</dt>
                  <dd className="mt-1 text-sm font-medium text-ink">{job.deadline ? formatDate(job.deadline) : "Not specified"}</dd>
                </div>
              </dl>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                {job.applied ? (
                  <span className="text-sm font-medium text-primary">Application submitted</span>
                ) : <span className="text-sm text-muted">Applications are open</span>}
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
                  href={`/applicant/jobs/${job.id}`}
                >
                  {job.applied ? "View posting" : "View and apply"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <section className="mt-3 grid min-h-48 place-items-center rounded-2xl border border-dashed border-line-strong bg-panel p-6 text-center">
          <div>
            <h2 className="font-semibold text-ink">No postings match</h2>
            <p className="mt-2 text-sm text-muted">Try another search or clear the selected filters.</p>
          </div>
        </section>
      )}
    </>
  );
}

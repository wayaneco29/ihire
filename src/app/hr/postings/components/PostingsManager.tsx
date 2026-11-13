"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { FormInput, FormSelect } from "@/components/form";

type PostingStatus = "DRAFT" | "OPEN" | "CLOSED";
type SortOrder = "deadline-asc" | "deadline-desc" | "created-desc";

type PostingItem = {
  id: string;
  title: string;
  description: string;
  slots: number;
  status: PostingStatus;
  deadline: string | null;
  created_at: string;
  deadlineLabel: string | null;
  daysRemaining: number | null;
  total: number;
  qualified: number;
  hired: number;
};

function deadlineSortValue(deadline: string | null) {
  if (!deadline) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(deadline);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

type FilterFormValues = {
  search: string;
  status: string;
  sortOrder: SortOrder;
};

export function PostingsManager({
  postings,
}: Readonly<{ postings: PostingItem[] }>) {
  const filterForm = useForm<FilterFormValues>({
    defaultValues: {
      search: "",
      status: "ALL",
      sortOrder: "deadline-asc",
    },
  });

  const search = filterForm.watch("search");
  const status = filterForm.watch("status");
  const sortOrder = filterForm.watch("sortOrder");

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const matches = postings.filter(
      (posting) =>
        (!term || posting.title.toLocaleLowerCase().includes(term)) &&
        (status === "ALL" || posting.status === status),
    );

    return matches.sort((a, b) => {
      if (sortOrder === "created-desc") {
        return Date.parse(b.created_at) - Date.parse(a.created_at);
      }

      const left = deadlineSortValue(a.deadline);
      const right = deadlineSortValue(b.deadline);
      if (left === right) {
        return Date.parse(b.created_at) - Date.parse(a.created_at);
      }
      if (!Number.isFinite(left)) return 1;
      if (!Number.isFinite(right)) return -1;
      return sortOrder === "deadline-asc" ? left - right : right - left;
    });
  }, [postings, search, sortOrder, status]);

  return (
    <section className="mt-6">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_190px]">
        <FormInput<FilterFormValues>
          control={filterForm.control}
          label="Search job postings"
          name="search"
          placeholder="Search job titles"
          size="medium"
          type="search"
        />
        <FormSelect<FilterFormValues>
          control={filterForm.control}
          label="Filter by posting status"
          name="status"
          options={[
            { label: "All statuses", value: "ALL" },
            { label: "Open", value: "OPEN" },
            { label: "Closed", value: "CLOSED" },
            { label: "Draft", value: "DRAFT" },
          ]}
          placeholder="Filter by status"
        />
        <FormSelect<FilterFormValues>
          control={filterForm.control}
          label="Sort postings"
          name="sortOrder"
          options={[
            { label: "Soonest deadline", value: "deadline-asc" },
            { label: "Latest deadline", value: "deadline-desc" },
            { label: "Recently created", value: "created-desc" },
          ]}
          placeholder="Sort postings"
        />
      </div>

      <p aria-live="polite" className="mt-3 text-xs text-muted">
        {filtered.length} of {postings.length}{" "}
        {postings.length === 1 ? "posting" : "postings"}
      </p>

      {filtered.length ? (
        <div className="mt-3 overflow-x-auto rounded-sm shadow bg-panel">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-panel-muted/60 text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium" scope="col">
                  Posting
                </th>
                <th className="px-3 py-3 font-medium" scope="col">
                  Applicants
                </th>
                <th className="px-3 py-3 font-medium" scope="col">
                  Qualified
                </th>
                <th className="px-3 py-3 font-medium" scope="col">
                  Hired
                </th>
                <th className="px-3 py-3 font-medium" scope="col">
                  Deadline
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {filtered.map((posting) => {
                const hiredPercent =
                  posting.slots > 0
                    ? Math.min(
                        100,
                        Math.round((posting.hired / posting.slots) * 100),
                      )
                    : 0;
                const progressMaximum = Math.max(posting.slots, 1);

                return (
                  <tr
                    className="transition-colors hover:bg-panel-muted/50"
                    key={posting.id}
                  >
                    <th
                      className="max-w-[330px] px-4 py-4 text-left font-normal"
                      scope="row"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Link
                          className="truncate font-semibold text-ink hover:text-primary"
                          href={`/hr/postings/${posting.id}`}
                        >
                          {posting.title}
                        </Link>
                        <StatusPill status={posting.status} />
                      </div>
                      {posting.description && (
                        <p className="mt-1 truncate text-xs text-muted">
                          {posting.description}
                        </p>
                      )}
                    </th>
                    <td className="px-3 py-4 font-semibold text-ink">
                      {posting.total}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className="font-semibold text-ink">
                        {posting.qualified}
                      </span>{" "}
                      <span className="text-muted">of {posting.total}</span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="whitespace-nowrap">
                        <span className="font-semibold text-ink">
                          {posting.hired}
                        </span>{" "}
                        <span className="text-muted">of {posting.slots}</span>
                      </div>
                      <div
                        aria-label={`${posting.hired} of ${posting.slots} hiring slots filled`}
                        aria-valuemax={progressMaximum}
                        aria-valuemin={0}
                        aria-valuenow={Math.min(posting.hired, progressMaximum)}
                        className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-line"
                        role="progressbar"
                      >
                        <span
                          className="block h-full rounded-full bg-success"
                          style={{ width: `${hiredPercent}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <p className="font-medium text-ink">
                        {posting.deadlineLabel ?? "No deadline"}
                      </p>
                      {posting.status === "OPEN" &&
                        posting.daysRemaining !== null && (
                          <p
                            className={`mt-0.5 text-xs ${
                              posting.daysRemaining <= 7
                                ? "text-warning"
                                : "text-muted"
                            }`}
                          >
                            {posting.daysRemaining === 0
                              ? "Due today"
                              : `${posting.daysRemaining} ${
                                  posting.daysRemaining === 1 ? "day" : "days"
                                } left`}
                          </p>
                        )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-4 whitespace-nowrap">
                        <Link
                          className="inline-flex min-h-9 items-center rounded-sm px-1 text-xs font-semibold text-primary hover:text-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          href={`/hr/postings/${posting.id}/edit`}
                        >
                          Edit posting
                        </Link>
                        <Link
                          className="inline-flex min-h-9 items-center justify-center rounded-[8px] border border-primary px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          href={`/hr/postings/${posting.id}`}
                        >
                          View applicants
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-line bg-panel p-8 text-center">
          <p className="text-sm text-muted">No postings match these filters.</p>
        </div>
      )}
    </section>
  );
}

function StatusPill({ status }: Readonly<{ status: PostingStatus }>) {
  const label =
    status === "OPEN" ? "Open" : status === "DRAFT" ? "Draft" : "Closed";

  return (
    <span
      className={`inline-flex min-h-6 shrink-0 items-center rounded-full px-2.5 text-[11px] font-semibold ${
        status === "OPEN"
          ? "bg-success/15 text-success"
          : "border border-line bg-panel-muted text-muted-strong"
      }`}
    >
      {label}
    </span>
  );
}

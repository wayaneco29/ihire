"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input, Pagination, Select } from "antd";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { MetricCard } from "@/components/ui/MetricCard";
import { TableEmptyRow } from "@/components/ui/TableEmptyState";
import type { PostingDisplayStatus } from "@/utils/job-posting-status";
import { PostingStatusPill } from "./PostingStatusPill";

type PostingItem = {
  id: string;
  title: string;
  description: string;
  slots: number;
  status: PostingDisplayStatus;
  deadline: string | null;
  created_at: string;
  deadlineLabel: string | null;
  daysRemaining: number | null;
  total: number;
  qualified: number;
  hired: number;
};

type PostingStatusFilter = PostingDisplayStatus | "ALL";

const STATUS_FILTER_OPTIONS: { label: string; value: PostingStatusFilter }[] = [
  { label: "All job statuses", value: "ALL" },
  { label: "Open", value: "OPEN" },
  { label: "Closed", value: "CLOSED" },
  { label: "Draft", value: "DRAFT" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Filled", value: "FILLED" },
];

export function PostingsManager({
  postings,
}: Readonly<{ postings: PostingItem[] }>) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PostingStatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return postings.filter((posting) => {
      const matchesStatus = status === "ALL" || posting.status === status;
      const matchesSearch =
        !query ||
        `${posting.title} ${posting.description}`
          .toLocaleLowerCase()
          .includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [postings, search, status]);
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );
  const startIndex = (currentPage - 1) * pageSize;
  const visiblePostings = filtered.slice(startIndex, startIndex + pageSize);
  const totalApplicants = postings.reduce(
    (total, posting) => total + posting.total,
    0,
  );
  const totalQualified = postings.reduce(
    (total, posting) => total + posting.qualified,
    0,
  );
  const totalHired = postings.reduce(
    (total, posting) => total + posting.hired,
    0,
  );

  return (
    <section aria-label="Manage job postings" className="mt-7 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Job postings" value={postings.length} />
        <MetricCard label="Total applicants" value={totalApplicants} />
        <MetricCard label="Qualified applicants" value={totalQualified} />
        <MetricCard label="Hired" value={totalHired} />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="flex flex-col gap-3 border-b border-line-subtle px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              aria-label="Search job postings"
              className="w-full sm:max-w-sm"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search job postings"
              prefix={
                <MagnifyingGlassIcon
                  aria-hidden="true"
                  className="size-4 text-muted"
                />
              }
              value={search}
            />
            <Select
              aria-label="Filter job postings by status"
              className="w-full sm:w-48"
              onChange={(value: PostingStatusFilter) => {
                setStatus(value);
                setPage(1);
              }}
              options={STATUS_FILTER_OPTIONS}
              value={status}
            />
          </div>
          <p aria-live="polite" className="whitespace-nowrap text-sm text-muted">
            {filtered.length} {filtered.length === 1 ? "job posting" : "job postings"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-line-subtle text-left text-sm">
            <thead className="bg-panel-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="min-w-64 px-5 py-3 font-medium">Job posting</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Applicants</th>
                <th className="px-5 py-3 font-medium">Qualified</th>
                <th className="px-5 py-3 font-medium">Hired</th>
                <th className="px-5 py-3 font-medium">Deadline</th>
                <th className="px-5 py-3">
                  <span className="sr-only">Posting actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {filtered.length === 0 ? (
                <TableEmptyRow
                  colSpan={7}
                  description={
                    postings.length === 0
                      ? "Your job postings will appear here after you create one."
                      : "Try another search or choose a different job status."
                  }
                  title={
                    postings.length === 0
                      ? "No postings yet"
                      : "No postings match these filters"
                  }
                />
              ) : (
                visiblePostings.map((posting) => (
                  <tr className="hover:bg-panel-muted/60" key={posting.id}>
                    <td className="px-5 py-4">
                      <Link
                        className="font-semibold text-ink hover:text-primary"
                        href={`/hr/postings/${posting.id}`}
                      >
                        {posting.title}
                      </Link>
                      {posting.description && (
                        <p className="mt-0.5 line-clamp-2 max-w-xl text-xs text-muted">
                          {posting.description}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <PostingStatusPill compact status={posting.status} />
                    </td>
                    <td className="px-5 py-4 font-medium tabular-nums text-ink">
                      {posting.total}
                    </td>
                    <td className="px-5 py-4 font-medium tabular-nums text-ink">
                      {posting.qualified}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-ink">
                      <span className="font-semibold">{posting.hired}</span>
                      <span className="text-muted"> of {posting.slots}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted">
                      <p>{posting.deadlineLabel ?? "No deadline"}</p>
                      {posting.daysRemaining !== null &&
                        posting.status === "OPEN" && (
                          <p className="mt-0.5 text-xs">
                            {posting.daysRemaining < 0
                              ? "Deadline passed"
                              : posting.daysRemaining === 0
                                ? "Due today"
                                : `${posting.daysRemaining} ${posting.daysRemaining === 1 ? "day" : "days"} left`}
                          </p>
                        )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          aria-label={`Edit ${posting.title}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-primary px-3 text-sm font-semibold text-primary transition hover:bg-primary-light"
                          href={`/hr/postings/${posting.id}/edit`}
                        >
                          Edit
                        </Link>
                        <Link
                          aria-label={`Open ${posting.title}`}
                          className="inline-flex min-h-10 min-w-20 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
                          href={`/hr/postings/${posting.id}`}
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line-subtle px-4 py-3 sm:px-5">
            <p className="text-sm text-muted">
              Showing {startIndex + 1}–
              {Math.min(startIndex + pageSize, filtered.length)} of {filtered.length}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Pagination
                aria-label="Posting pages"
                className="pagination"
                current={currentPage}
                nextIcon={<ChevronRightIcon className="size-4" />}
                onChange={setPage}
                pageSize={pageSize}
                prevIcon={<ChevronLeftIcon className="size-4" />}
                showSizeChanger={false}
                size="small"
                total={filtered.length}
              />
              <Select
                aria-label="Rows per page"
                className="w-20"
                onChange={(value: number) => {
                  setPageSize(value);
                  setPage(1);
                }}
                options={[10, 25, 50].map((value) => ({
                  label: value,
                  value,
                }))}
                value={pageSize}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

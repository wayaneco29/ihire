"use client";

import Link from "next/link";
import { useState } from "react";
import { Pagination, Select, Table, type TableColumnsType } from "antd";
import { Button } from "@/components/ui/Button";
import { TableEmptyState } from "@/components/ui/TableEmptyState";

import type { PostingDisplayStatus } from "@/utils/job-posting-status";
import { PostingStatusPill } from "./PostingStatusPill";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

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

const POSTING_COLUMNS: TableColumnsType<PostingItem> = [
  {
    title: "Posting",
    key: "posting",
    width: 350,
    rowScope: "row",
    className: "px-6!",
    render: (_, posting) => (
      <div className="min-w-0">
        <Link
          className="font-semibold leading-6 text-primary! font-[Bricolage_Grotesque]!  hover:underline underline-offset-4"
          href={`/hr/postings/${posting.id}`}
        >
          {posting.title}
        </Link>
        {posting.description && (
          <p className="line-clamp-2 text-xs font-normal text-muted">
            {posting.description}
          </p>
        )}
      </div>
    ),
  },
  {
    title: "Status",
    key: "status",
    width: 100,
    render: (_, posting) => (
      <PostingStatusPill compact status={posting.status} />
    ),
  },
  {
    title: "Applicants",
    key: "applicants",
    width: 110,
    render: (_, posting) => (
      <span
        className={`text-xl font-semibold tabular-nums ${posting.total ? "text-ink" : "text-muted"}`}
      >
        {posting.total}
      </span>
    ),
  },
  {
    title: "Qualified",
    key: "qualified",
    width: 110,
    render: (_, posting) => (
      <span className="text-xl font-semibold text-muted tabular-nums">
        {posting.qualified}
      </span>
    ),
  },
  {
    title: "Hired",
    key: "hired",
    width: 150,
    render: (_, posting) => (
      <div className="whitespace-nowrap">
        <span className="text-xl font-semibold text-muted tabular-nums">
          {posting.hired}
        </span>{" "}
        <span className="text-xs text-muted">of {posting.slots} slots</span>
      </div>
    ),
  },
  {
    title: "Deadline",
    key: "deadline",
    width: 170,
    render: (_, posting) => (
      <span className="whitespace-nowrap text-xs font-semibold text-ink">
        {posting.deadlineLabel ?? "No deadline"}
      </span>
    ),
  },
  {
    title: <span className="sr-only">Actions</span>,
    key: "actions",
    width: 170,
    fixed: "right",
    align: "right",
    className: "pr-4!",
    render: (_, posting) => (
      <div className="flex items-center justify-end gap-2">
        <Link
          className="border border-primary text-primary! rounded-sm text-xs px-4 py-1.5 hover:bg-primary-light!"
          aria-label={`Edit ${posting.title}`}
          href={`/hr/postings/${posting.id}/edit`}
        >
          Edit
        </Link>
        <Link
          aria-label={`View applicants for ${posting.title}`}
          className="border border-primary text-white! rounded-sm text-xs px-4 py-1.5 bg-primary!"
          href={`/hr/postings/${posting.id}`}
        >
          View
        </Link>
      </div>
    ),
  },
];
export function PostingsManager({
  postings,
}: Readonly<{ postings: PostingItem[] }>) {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const filtered = postings.filter(
    (posting) => status === "ALL" || posting.status === status,
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );
  const startIndex = (currentPage - 1) * pageSize;
  const visiblePostings = filtered.slice(startIndex, startIndex + pageSize);
  const statuses = [
    "ALL",
    "OPEN",
    "CLOSED",
    ...(["EXPIRED", "FILLED", "DRAFT"] as const).filter((value) =>
      postings.some((posting) => posting.status === value),
    ),
  ];

  return (
    <section className="mt-7" aria-label="Manage job postings">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Posting status"
          className="inline-flex flex-wrap gap-1 rounded-md bg-panel p-1"
        >
          {statuses.map((value) => (
            <Button
              key={value}
              variant="unstyled"
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              className={`inline-flex min-h-9 items-center justify-center rounded-sm px-3 text-xs! font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${status === value ? "bg-primary-light text-ink" : "text-muted hover:text-ink"}`}
            >
              {value === "ALL"
                ? "All"
                : value === "DRAFT"
                  ? "Drafts"
                  : value.charAt(0) + value.slice(1).toLowerCase()}
            </Button>
          ))}
        </nav>
        <p aria-live="polite" className="text-xs text-muted">
          {filtered.length} {filtered.length === 1 ? "posting" : "postings"}
        </p>
      </div>
      <div
        className="overflow-hidden rounded-sm border border-line bg-panel"
        role="region"
        aria-label="Job postings table"
      >
        <Table<PostingItem>
          className="[&_.ant-table]:rounded-none! [&_.ant-table-container]:rounded-none! [&_.ant-table-content]:rounded-none! [&_.ant-table-header]:rounded-none! [&_.ant-table-thead>tr>th]:rounded-none! [&_.ant-table-thead>tr>th]:!bg-primary-light [&_.ant-table-thead>tr>th]:!text-ink [&_.ant-table-tbody>tr.ant-table-row>th]:py-4! [&_.ant-table-tbody>tr.ant-table-row>td]:py-2! [&_.ant-table-thead>tr>th]:!text-xs [&_.ant-table-thead>tr>th]:!font-medium [&_.ant-table-thead>tr>th]:!border-line [&_.ant-table-thead>tr>th::before]:!hidden [&_.ant-table-tbody>tr.ant-table-row>td]:!bg-panel [&_.ant-table-tbody>tr.ant-table-row>th]:!bg-panel [&_.ant-table-tbody>tr.ant-table-row>td]:!border-line-subtle [&_.ant-table-tbody>tr.ant-table-row>th]:!border-line-subtle [&_.ant-table-tbody>tr.ant-table-row>td]:!py-6 [&_.ant-table-tbody>tr.ant-table-row>th]:!py-6 [&_.ant-table-tbody>tr.ant-table-row:hover>td]:!bg-panel-muted [&_.ant-table-tbody>tr.ant-table-row:hover>th]:!bg-panel-muted"
          columns={POSTING_COLUMNS}
          dataSource={visiblePostings}
          locale={{
            emptyText: (
              <TableEmptyState
                action={
                  postings.length > 0 && status !== "ALL" ? (
                    <Button
                      onClick={() => setStatus("ALL")}
                      variant="bordered"
                    >
                      Show all postings
                    </Button>
                  ) : undefined
                }
                description={
                  postings.length === 0
                    ? "Your job postings will appear here after you create one."
                    : "Choose another status or show all postings."
                }
                title={
                  postings.length === 0
                    ? "No postings yet"
                    : "No matching postings"
                }
              />
            ),
          }}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1040 }}
          tableLayout="fixed"
          size="small"
        />
          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line bg-panel px-6 py-4">
            {/* <p aria-live="polite" className="text-xs text-muted">
              Showing {startIndex + 1}–
              {Math.min(startIndex + pageSize, filtered.length)} of{" "}
              {filtered.length}
            </p> */}
            <div className="flex-1">
              <Pagination
                className="pagination"
                aria-label="Posting pages"
                current={currentPage}
                pageSize={pageSize}
                total={filtered.length}
                onChange={setPage}
                showSizeChanger={false}
                size="small"
                prevIcon={
                  <button type="button">
                    <ChevronLeftIcon className="size-4" />
                  </button>
                }
                nextIcon={
                  <button type="button">
                    <ChevronRightIcon className="size-4" />
                  </button>
                }
              />
            </div>

            <Select
              id="postings-page-size"
              aria-label="Rows per page"
              className="h-8.75! w-16 text-xs! rounded-sm!"
              value={pageSize}
              options={[5, 10, 25, 50].map((value) => ({
                value,
                label: value,
              }))}
              onChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            />
            </div>
          )}
      </div>
    </section>
  );
}

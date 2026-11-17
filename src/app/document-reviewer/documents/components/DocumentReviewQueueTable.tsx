"use client";

import Link from "next/link";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";

type ReviewerApplicant = {
  applicantNumber: string;
  documentCount: number;
  documentTypes: string[];
};

const columns: ColumnsType<ReviewerApplicant> = [
  {
    title: "Applicant",
    dataIndex: "applicantNumber",
    key: "applicant",
    render: (applicantNumber: string) => (
      <span className="font-semibold text-ink">
        Applicant {applicantNumber}
      </span>
    ),
  },
  {
    title: "Documents",
    key: "documents",
    render: (_, applicant) => (
      <div>
        <p>
          {applicant.documentCount} document
          {applicant.documentCount === 1 ? "" : "s"} awaiting review
        </p>
        <p className="mt-1 text-xs text-muted">
          {applicant.documentTypes.join(", ")}
        </p>
      </div>
    ),
  },
  {
    title: "Status",
    key: "status",
    width: 150,
    render: () => <WorkflowStatusTag status="FOR_REVIEW" />,
  },
  {
    title: "Action",
    key: "action",
    fixed: "right",
    width: 180,
    align: "right",
    className: "pr-6!",
    render: (_, applicant) => (
      <Link
        className="inline-flex min-h-10 items-center rounded-sm border border-line-strong px-4 text-sm font-medium text-ink hover:bg-panel-muted"
        href={`/document-reviewer/applicants/${encodeURIComponent(applicant.applicantNumber)}`}
      >
        Review documents
      </Link>
    ),
  },
];

export function DocumentReviewQueueTable({
  applicants,
}: {
  applicants: ReviewerApplicant[];
}) {
  return (
    <Table<ReviewerApplicant>
      className="[&_.ant-table-thead>tr>th]:bg-panel [&_.ant-table-thead>tr>th]:px-4 [&_.ant-table-thead>tr>th]:py-3 [&_.ant-table-thead>tr>th]:text-muted [&_.ant-table-tbody>tr>td]:border-line-subtle [&_.ant-table-tbody>tr>td]:bg-panel [&_.ant-table-tbody>tr>td]:px-4 [&_.ant-table-tbody>tr>td]:py-4 [&_.ant-table-tbody>tr>td]:text-ink"
      columns={columns}
      dataSource={applicants}
      pagination={{
        pageSize: 25,
        pageSizeOptions: [25, 50, 100],
        showSizeChanger: true,
        showTotal: (total) => `${total} applicants awaiting review`,
      }}
      rowKey="applicantNumber"
      scroll={{ x: 760 }}
      size="middle"
    />
  );
}

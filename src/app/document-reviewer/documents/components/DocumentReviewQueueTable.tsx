"use client";

import { useEffect, useState } from "react";
import { Modal, Table } from "antd";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { loadApplicantReviewDocuments } from "../../actions";
import { ApplicantDocumentReviewList } from "./ApplicantDocumentReviewList";
import type { ColumnsType } from "antd/es/table";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";

type ReviewerApplicant = {
  applicantNumber: string;
  documentCount: number;
  documentTypes: string[];
};

function getColumns(onReview: (applicantNumber: string) => void): ColumnsType<ReviewerApplicant> {
  return [
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
        <Button variant="bordered" onClick={() => onReview(applicant.applicantNumber)}>
          Review documents
        </Button>
      ),
    },
  ];
}

export function DocumentReviewQueueTable({
  applicants,
}: {
  applicants: ReviewerApplicant[];
}) {
  const [selectedApplicant, setSelectedApplicant] = useState<string | null>(null);
  return (
    <>
      <Table<ReviewerApplicant>
        className="[&_.ant-table-thead>tr>th]:bg-panel [&_.ant-table-thead>tr>th]:px-4 [&_.ant-table-thead>tr>th]:py-3 [&_.ant-table-thead>tr>th]:text-muted [&_.ant-table-tbody>tr>td]:border-line-subtle [&_.ant-table-tbody>tr>td]:bg-panel [&_.ant-table-tbody>tr>td]:px-4 [&_.ant-table-tbody>tr>td]:py-4 [&_.ant-table-tbody>tr>td]:text-ink"
        columns={getColumns(setSelectedApplicant)}
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
      {selectedApplicant && (
        <Modal
          centered destroyOnHidden footer={null} open width={960}
          title={`Review documents - Applicant ${selectedApplicant}`}
          onCancel={() => setSelectedApplicant(null)}
        >
          <div className="max-h-[78dvh] overflow-y-auto">
            <ApplicantReviewContent key={selectedApplicant} applicantNumber={selectedApplicant} />
          </div>
        </Modal>
      )}
    </>
  );
}

function ApplicantReviewContent({ applicantNumber }: { applicantNumber: string }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof loadApplicantReviewDocuments>> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadApplicantReviewDocuments(applicantNumber).then(
      (documents) => { if (!cancelled) setResult(documents); },
      () => {
        if (!cancelled) setResult({ success: false, message: "Documents could not be loaded. Please try again." });
      },
    );
    return () => { cancelled = true; };
  }, [applicantNumber, attempt]);

  if (!result) return <p className="py-8 text-center text-sm text-muted" role="status">Loading documents...</p>;
  if (!result.success) {
    return (
      <EmptyState
        title="Documents unavailable" description={result.message}
        action={<Button onClick={() => { setResult(null); setAttempt((value) => value + 1); }}>Retry</Button>}
      />
    );
  }

  return (
    <>
      {result.warning && <p className="mt-4 text-sm text-muted" role="status">{result.warning}</p>}
      <ApplicantDocumentReviewList
        applicantNumber={applicantNumber}
        documents={result.documents}
        onReviewSuccess={(documentId) => setResult((current) => current?.success ? {
          ...current, documents: current.documents.filter((document) => document.documentId !== documentId),
        } : current)}
      />
    </>
  );
}

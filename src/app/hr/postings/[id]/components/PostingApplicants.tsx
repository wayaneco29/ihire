"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Alert, Input, Popconfirm, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Button } from "@/components/ui/Button";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatPositionLabel } from "@/utils/format-position-track";
import { recordHiringDecision } from "../actions";

export type ApplicantItem = {
  application_id: string;
  applicant_number: string;
  application_status: string;
  applied_at: string;
  education_levels: string[] | null;
  experience_years: number | null;
  training_hours: number | null;
  skills: string[] | null;
  position_title: string | null;
  position_track: string | null;
};

type ApplicantFilter =
  | "ALL"
  | "UNDER_EVALUATION"
  | "QUALIFIED"
  | "NOT_QUALIFIED"
  | "HIRED";
type SortOrder = "asc" | "desc";

const FILTERS: { id: ApplicantFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "UNDER_EVALUATION", label: "Under evaluation" },
  { id: "QUALIFIED", label: "Qualified" },
  { id: "NOT_QUALIFIED", label: "Not qualified" },
  { id: "HIRED", label: "Hired" },
];

const UNDER_EVALUATION_STATUSES = [
  "SUBMITTED",
  "UNDER_EVALUATION",
  "ASSESSMENT_SCHEDULED",
];
const NOT_QUALIFIED_STATUSES = ["NOT_QUALIFIED", "REJECTED"];

function matchesFilter(applicant: ApplicantItem, filter: ApplicantFilter) {
  if (filter === "ALL") return true;
  if (filter === "UNDER_EVALUATION") {
    return UNDER_EVALUATION_STATUSES.includes(applicant.application_status);
  }
  if (filter === "NOT_QUALIFIED") {
    return NOT_QUALIFIED_STATUSES.includes(applicant.application_status);
  }
  return applicant.application_status === filter;
}

function positionLabel(applicant: ApplicantItem) {
  if (!applicant.position_title) return "Position not recorded";
  return formatPositionLabel(
    applicant.position_title,
    applicant.position_track ?? "",
  );
}

function experienceLabel(years: number | null) {
  return `${Number(years ?? 0).toFixed(1)} yrs`;
}

function trainingLabel(hours: number | null) {
  return `${Number(hours ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })} hrs`;
}

export function PostingApplicants({
  applicants,
  slots,
}: Readonly<{ applicants: ApplicantItem[]; slots: number }>) {
  const [filter, setFilter] = useState<ApplicantFilter>("ALL");
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [educationFilter, setEducationFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [isWorking, startTransition] = useTransition();

  const hiredCount = applicants.filter(
    (applicant) => applicant.application_status === "HIRED",
  ).length;
  const slotsFull = hiredCount >= slots;
  const positions = useMemo(
    () =>
      [...new Set(applicants.map(positionLabel).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [applicants],
  );
  const educationLevels = useMemo(
    () =>
      [
        ...new Set(
          applicants.flatMap((applicant) => applicant.education_levels ?? []),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [applicants],
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map(({ id }) => [
          id,
          applicants.filter((applicant) => matchesFilter(applicant, id)).length,
        ]),
      ) as Record<ApplicantFilter, number>,
    [applicants],
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return applicants
      .filter(
        (applicant) =>
          matchesFilter(applicant, filter) &&
          (!term ||
            applicant.applicant_number.toLocaleLowerCase().includes(term)) &&
          (positionFilter === "ALL" ||
            positionLabel(applicant) === positionFilter) &&
          (educationFilter === "ALL" ||
            applicant.education_levels?.includes(educationFilter)),
      )
      .sort((a, b) => {
        const result = a.applicant_number.localeCompare(
          b.applicant_number,
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          },
        );
        return sortOrder === "asc" ? result : -result;
      });
  }, [applicants, educationFilter, filter, positionFilter, search, sortOrder]);

  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );

  function updateFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
    setExpandedId(null);
  }

  function decide(applicationId: string, decision: "HIRED" | "REJECTED") {
    setWorkingId(applicationId);
    startTransition(async () => {
      const result = await recordHiringDecision(applicationId, decision);
      setFeedback(result);
      setWorkingId(null);
    });
  }

  const columns: ColumnsType<ApplicantItem> = [
    {
      title: (
        <button
          aria-label={`Sort by applicant number ${sortOrder === "asc" ? "descending" : "ascending"}`}
          className="inline-flex items-center gap-1 cursor-pointer hover:text-ink"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          type="button"
        >
          Applicant No.{" "}
          <span aria-hidden="true">{sortOrder === "asc" ? "↑" : "↓"}</span>
        </button>
      ),
      dataIndex: "applicant_number",
      key: "applicant_number",
      className: "pl-6!",
      fixed: "left",
      width: 150,
      render: (applicantNumber: string) => (
        <span className="font-semibold text-ink">{applicantNumber}</span>
      ),
    },
    {
      title: "Position",
      key: "position",
      width: 190,
      ellipsis: true,
      render: (_, applicant) => positionLabel(applicant),
    },
    {
      title: "Education",
      key: "education",
      width: 190,
      ellipsis: true,
      render: (_, applicant) =>
        applicant.education_levels?.join(", ") || "Not provided",
    },
    {
      title: "Experience",
      dataIndex: "experience_years",
      key: "experience",
      width: 120,
      render: (years: number | null) => experienceLabel(years),
    },
    {
      title: "Training",
      dataIndex: "training_hours",
      key: "training",
      width: 120,
      render: (hours: number | null) => trainingLabel(hours),
    },
    {
      title: "Skills",
      key: "skills",
      width: 220,
      ellipsis: true,
      render: (_, applicant) => applicant.skills?.join(", ") || "Not provided",
    },
    {
      title: "Status",
      dataIndex: "application_status",
      key: "status",
      width: 160,
      render: (applicationStatus: string) => (
        <WorkflowStatusTag
          label={
            UNDER_EVALUATION_STATUSES.includes(applicationStatus)
              ? "Under evaluation"
              : undefined
          }
          status={applicationStatus}
        />
      ),
    },
    {
      title: "Actions",
      key: "review",
      fixed: "right",
      width: 150,
      align: "right",
      className: "pr-6!",
      render: (_, applicant) => {
        const expanded = expandedId === applicant.application_id;

        return (
          <Button
            aria-controls={`applicant-details-${applicant.application_id}`}
            aria-expanded={expanded}
            onClick={() =>
              setExpandedId(expanded ? null : applicant.application_id)
            }
            size="sm"
            type="button"
            variant="bordered"
          >
            {expanded ? "Close" : "Review"}
          </Button>
        );
      },
    },
  ];

  return (
    <section className="mt-6">
      {feedback && (
        <Alert
          className="mb-4"
          message={feedback.message}
          showIcon
          type={feedback.success ? "success" : "error"}
        />
      )}
      <div className="px-5 py-4 shadow rounded-sm bg-panel">
        <nav
          aria-label="Filter applicants by status"
          className="flex flex-wrap gap-1.5"
        >
          {FILTERS.map((option) => (
            <Button
              aria-pressed={filter === option.id}
              className={`min-h-10 rounded-full border px-6 text-sm! cursor-pointer transition-colors ${filter === option.id ? "border-primary/50 bg-primary-light text-ink" : "border-line bg-transparent text-muted hover:bg-panel"}`}
              key={option.id}
              onClick={() => updateFilter(setFilter, option.id)}
              size="sm"
              type="button"
              variant="unstyled"
            >
              {option.label}{" "}
              <span className="tabular-nums">
                {counts[option.id].toLocaleString()}
              </span>
            </Button>
          ))}
        </nav>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_190px]">
        <label>
          <span className="sr-only">Search by applicant number</span>
          <Input
            aria-label="Search by applicant number"
            className="w-full rounded-sm!"
            onChange={(event) => updateFilter(setSearch, event.target.value)}
            placeholder="Search by applicant number, e.g. 0053"
            type="search"
            value={search}
          />
        </label>
        <label>
          <span className="sr-only">Filter by position</span>
          <Select
            aria-label="Filter by position"
            className="w-full rounded-sm!"
            onChange={(value) => updateFilter(setPositionFilter, value)}
            options={[
              { label: "All positions", value: "ALL" },
              ...positions.map((position) => ({
                label: position,
                value: position,
              })),
            ]}
            value={positionFilter}
          />
        </label>
        <label>
          <span className="sr-only">Filter by education level</span>
          <Select
            aria-label="Filter by education level"
            className="w-full rounded-sm!"
            onChange={(value) => updateFilter(setEducationFilter, value)}
            options={[
              { label: "All education levels", value: "ALL" },
              ...educationLevels.map((level) => ({
                label: level,
                value: level,
              })),
            ]}
            value={educationFilter}
          />
        </label>
      </div>

      {slotsFull && (
        <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          All {slots} hiring slots are filled. This posting has been closed
          automatically.
        </p>
      )}

      <p aria-live="polite" className="sr-only">
        Showing page {currentPage} of applicants. {filtered.length} applicants
        match the current filters.
      </p>

      <div className="mt-3 overflow-hidden rounded-sm border border-line bg-panel">
        <Table<ApplicantItem>
          columns={columns}
          dataSource={filtered}
          expandable={{
            expandedRowKeys: expandedId ? [expandedId] : [],
            expandedRowRender: (applicant) => (
              <ApplicantDetails
                applicant={applicant}
                education={
                  applicant.education_levels?.join(", ") || "Not provided"
                }
                evaluated={["QUALIFIED", "NOT_QUALIFIED"].includes(
                  applicant.application_status,
                )}
                onDecide={decide}
                pending={isWorking && workingId === applicant.application_id}
                skills={applicant.skills?.join(", ") || "Not provided"}
                slotsFull={slotsFull}
                terminal={["HIRED", "REJECTED"].includes(
                  applicant.application_status,
                )}
              />
            ),
            showExpandColumn: false,
          }}
          locale={{
            emptyText: (
              <div className="py-5 text-sm text-muted">
                No applicants match these filters.
              </div>
            ),
          }}
          onChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? 25);
          }}
          pagination={
            filtered.length
              ? {
                  current: currentPage,
                  pageSize,
                  pageSizeOptions: [25, 50, 100],
                  showSizeChanger: true,
                  total: filtered.length,
                  showTotal: (total, range) =>
                    `Showing ${range[0]}–${range[1]} of ${total.toLocaleString()} applicants`,
                }
              : false
          }
          rowKey="application_id"
          scroll={{ x: 1254 }}
          size="middle"
        />
      </div>
    </section>
  );
}

function ApplicantDetails({
  applicant,
  education,
  evaluated,
  onDecide,
  pending,
  skills,
  slotsFull,
  terminal,
}: Readonly<{
  applicant: ApplicantItem;
  education: string;
  evaluated: boolean;
  onDecide: (applicationId: string, decision: "HIRED" | "REJECTED") => void;
  pending: boolean;
  skills: string;
  slotsFull: boolean;
  terminal: boolean;
}>) {
  return (
    <div
      className="flex flex-col gap-4 bg-panel-muted/40 px-4 py-4 lg:flex-row lg:items-start lg:justify-between"
      id={`applicant-details-${applicant.application_id}`}
    >
      <dl className="grid flex-1 gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <Detail
          label="Position applying for"
          value={positionLabel(applicant)}
        />
        <Detail label="Education" value={education} />
        <Detail
          label="Experience"
          value={`${Number(applicant.experience_years ?? 0).toFixed(1)} years`}
        />
        <Detail
          label="Training"
          value={`${trainingLabel(applicant.training_hours).replace(" hrs", " hours")}`}
        />
        <Detail label="Skills" value={skills} />
      </dl>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {applicant.application_status === "HIRED" && (
          <Link
            className="inline-flex h-9 items-center justify-center rounded-[8px] border border-primary px-3.5 text-sm font-semibold text-primary hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href={`/hr/applications/${applicant.application_id}/pds`}
          >
            Printable PDS
          </Link>
        )}
        {evaluated && !terminal && (
          <>
            <Popconfirm
              onConfirm={() => onDecide(applicant.application_id, "HIRED")}
              title={`Hire ${applicant.applicant_number}?`}
              description="This records a final hiring decision and uses one slot."
            >
              <Button
                disabled={slotsFull || pending}
                loading={pending}
                size="sm"
                variant="filled"
              >
                Hire
              </Button>
            </Popconfirm>
            <Popconfirm
              onConfirm={() => onDecide(applicant.application_id, "REJECTED")}
              title={`Reject ${applicant.applicant_number}?`}
              description="This records a final rejection decision."
            >
              <Button
                disabled={pending}
                loading={pending}
                size="sm"
                variant="danger"
              >
                Reject
              </Button>
            </Popconfirm>
          </>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert, Input, Modal, Select, Table } from "antd";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { ColumnsType } from "antd/es/table";
import { Button } from "@/components/ui/Button";
import {
  TableEmptyRow,
  TableEmptyState,
} from "@/components/ui/TableEmptyState";
import { EDUCATION_LEVEL_OPTIONS } from "@/constants/pds-options";
import { formatDate } from "@/utils/format-date";
import { formatPositionLabel } from "@/utils/format-position-track";

export type ApplicantItem = {
  application_id: string;
  applicant_name: string;
  applicant_number: string;
  application_status: string;
  applied_at: string;
  education_levels: string[] | null;
  experience_years: number | null;
  training_hours: number | null;
  skills: string[] | null;
  position_title: string | null;
  position_track: string | null;
  assessment_points: number | null;
  assessment_rank: number | null;
  criterion_scores: {
    key: string;
    title: string;
    points: number | null;
    maximumPoints: number | null;
  }[];
};

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
  assessmentScoresUnavailable,
  initialApplicationId = null,
}: Readonly<{
  applicants: ApplicantItem[];
  assessmentScoresUnavailable: boolean;
  initialApplicationId?: string | null;
}>) {
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [educationFilter, setEducationFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(
    initialApplicationId,
  );
  const selectedApplicant =
    applicants.find(
      (applicant) => applicant.application_id === selectedApplicantId,
    ) ?? null;
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
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return applicants
      .filter(
        (applicant) =>
          (!term ||
            (applicant.applicant_number.toLocaleLowerCase().includes(term) ||
              applicant.applicant_name.toLocaleLowerCase().includes(term))) &&
          (positionFilter === "ALL" ||
            positionLabel(applicant) === positionFilter) &&
          (educationFilter === "ALL" ||
            applicant.education_levels?.includes(educationFilter)),
      )
      .sort((a, b) => {
        if (a.assessment_points === null && b.assessment_points !== null)
          return 1;
        if (b.assessment_points === null && a.assessment_points !== null)
          return -1;
        if (
          a.assessment_points !== null &&
          b.assessment_points !== null &&
          a.assessment_points !== b.assessment_points
        ) {
          return b.assessment_points - a.assessment_points;
        }
        const result = a.applicant_number.localeCompare(
          b.applicant_number,
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          },
        );
        return result;
      });
  }, [applicants, educationFilter, positionFilter, search]);

  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );

  function updateFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
    setSelectedApplicantId(null);
  }

  const columns: ColumnsType<ApplicantItem> = [
    {
      title: "Rank",
      key: "assessment_rank",
      width: 68,
      align: "left",
      fixed: "left",
      className: "pl-6!",
      render: (_, applicant) =>
        applicant.assessment_rank === null
          ? "—"
          : `#${applicant.assessment_rank}`,
    },
    {
      title: "Applicant name",
      dataIndex: "applicant_name",
      key: "applicant_name",
      fixed: "left",
      width: 210,
      ellipsis: true,
      render: (name: string) => <span className="font-semibold text-ink">{name}</span>,
    },
    {
      title: "Applicant ID",
      dataIndex: "applicant_number",
      key: "applicant_number",
      fixed: "left",
      width: 125,
      render: (applicantNumber: string) => (
        <span className="font-semibold text-ink">{applicantNumber}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "application_status",
      key: "application_status",
      width: 150,
      render: (status: string) => formatCodeLabel(status),
    },
    {
      title: "Position",
      key: "position",
      width: 155,
      ellipsis: true,
      render: (_, applicant) => positionLabel(applicant),
    },
    {
      title: "Total points",
      dataIndex: "assessment_points",
      key: "assessment_points",
      width: 115,
      render: (points: number | null) =>
        points === null
          ? "Awaiting scores"
          : points.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    },
    {
      title: "Education",
      key: "education",
      width: 150,
      ellipsis: true,
      render: (_, applicant) =>
        applicant.education_levels?.map(educationLevelLabel).join(", ") ||
        "Not provided",
    },
    {
      title: "Experience",
      dataIndex: "experience_years",
      key: "experience",
      width: 105,
      render: (years: number | null) => experienceLabel(years),
    },
    {
      title: "Training",
      dataIndex: "training_hours",
      key: "training",
      width: 105,
      render: (hours: number | null) => trainingLabel(hours),
    },
    {
      title: "Skills",
      key: "skills",
      width: 150,
      ellipsis: true,
      render: (_, applicant) => applicant.skills?.join(", ") || "Not provided",
    },
    {
      title: "Actions",
      key: "review",
      fixed: "right",
      width: 130,
      align: "right",
      className: "pr-6!",
      render: (_, applicant) => {
        return (
          <Button
            onClick={() => setSelectedApplicantId(applicant.application_id)}
            type="button"
            variant="bordered"
          >
            Review
          </Button>
        );
      },
    },
  ];

  return (
    <section className="mt-4">
      {assessmentScoresUnavailable && (
        <Alert
          className="mb-4"
          message="Assessment points could not be loaded. Ranking may be incomplete; refresh to try again."
          showIcon
          type="warning"
        />
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(180px,auto)_minmax(220px,1fr)] xl:grid-cols-[minmax(180px,auto)_minmax(220px,1fr)_170px_190px] xl:items-center">
        <div>
          <h2 className="text-sm font-semibold text-ink">Applicants</h2>
          <p className="mt-1 text-xs text-muted">
            {applicants.length.toLocaleString()} applications
          </p>
        </div>
        <label>
          <span className="sr-only">Search by applicant name or number</span>
          <Input
            aria-label="Search by applicant name or number"
            className="w-full rounded-md!"
            onChange={(event) => updateFilter(setSearch, event.target.value)}
            prefix={
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="size-4 text-muted"
              />
            }
            placeholder="Search by applicant name or number"
            size="medium"
            type="search"
            value={search}
          />
        </label>
        <label>
          <span className="sr-only">Filter by position</span>
          <Select
            aria-label="Filter by position"
            className="w-full rounded-md!"
            onChange={(value) => updateFilter(setPositionFilter, value)}
            options={[
              { label: "All positions", value: "ALL" },
              ...positions.map((position) => ({
                label: position,
                value: position,
              })),
            ]}
            size="medium"
            value={positionFilter}
          />
        </label>
        <label>
          <span className="sr-only">Filter by education level</span>
          <Select
            aria-label="Filter by education level"
            className="w-full rounded-md!"
            onChange={(value) => updateFilter(setEducationFilter, value)}
            options={[
              { label: "All education levels", value: "ALL" },
              ...educationLevels.map((level) => ({
                label: educationLevelLabel(level),
                value: level,
              })),
            ]}
            size="medium"
            value={educationFilter}
          />
        </label>
      </div>

      <p aria-live="polite" className="sr-only">
        Showing page {currentPage} of applicants. {filtered.length} applications
        match the current filters.
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-panel">
        <Table<ApplicantItem>
          className="[&_.ant-table-thead>tr>th]:!bg-panel-muted [&_.ant-table-thead>tr>th]:!px-3 [&_.ant-table-thead>tr>th]:!py-3 [&_.ant-table-thead>tr>th]:!text-muted [&_.ant-table-thead>tr>th]:!text-xs [&_.ant-table-thead>tr>th]:!font-medium [&_.ant-table-thead>tr>th]:!border-line [&_.ant-table-thead>tr>th::before]:!hidden [&_.ant-table-tbody>tr.ant-table-row>td]:!bg-panel [&_.ant-table-tbody>tr.ant-table-row>th]:!bg-panel [&_.ant-table-tbody>tr.ant-table-row>td]:!px-3 [&_.ant-table-tbody>tr.ant-table-row>th]:!px-3 [&_.ant-table-tbody>tr.ant-table-row>td]:!py-4 [&_.ant-table-tbody>tr.ant-table-row>th]:!py-4 [&_.ant-table-tbody>tr.ant-table-row>td]:!border-line-subtle [&_.ant-table-tbody>tr.ant-table-row>th]:!border-line-subtle [&_.ant-table-tbody>tr.ant-table-row:hover>td]:!bg-panel-muted [&_.ant-table-tbody>tr.ant-table-row:hover>th]:!bg-panel-muted [&_.ant-table-placeholder>td]:!bg-panel [&_.ant-table-placeholder>td]:!border-line-subtle"
          // className="[&_.ant-table-thead>tr>th]:!bg-panel-muted [&_.ant-table-thead>tr>th]:!text-muted [&_.ant-table-thead>tr>th]:!text-xs [&_.ant-table-thead>tr>th]:!font-medium [&_.ant-table-thead>tr>th]:!border-line [&_.ant-table-thead>tr>th::before]:!hidden [&_.ant-table-tbody>tr.ant-table-row>td]:!bg-panel [&_.ant-table-tbody>tr.ant-table-row>th]:!bg-panel [&_.ant-table-tbody>tr.ant-table-row>td]:!border-line-subtle [&_.ant-table-tbody>tr.ant-table-row>th]:!border-line-subtle [&_.ant-table-tbody>tr.ant-table-row:hover>td]:!bg-panel-muted [&_.ant-table-tbody>tr.ant-table-row:hover>th]:!bg-panel-muted [&_.ant-table-placeholder>td]:!bg-panel [&_.ant-table-placeholder>td]:!border-line-subtle"
          columns={columns}
          dataSource={filtered}
          locale={{
            emptyText: (
              <TableEmptyState
                description="No applications match these filters."
                title="No applications found"
              />
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
                    `Showing ${range[0]}–${range[1]} of ${total.toLocaleString()} applications`,
                }
              : false
          }
          rowKey="application_id"
          scroll={{ x: 1100 }}
          size="middle"
        />
      </div>
      <Modal
        centered
        destroyOnHidden
        footer={null}
        onCancel={() => setSelectedApplicantId(null)}
        open={Boolean(selectedApplicant)}
        title={
          selectedApplicant
          ? `Review ${selectedApplicant.applicant_name}`
            : "Review applicant"
        }
        width={860}
      >
        {selectedApplicant && (
          <ApplicantDetails
            applicant={selectedApplicant}
          />
        )}
      </Modal>
    </section>
  );
}

function ApplicantDetails({
  applicant,
}: Readonly<{
  applicant: ApplicantItem;
}>) {
  return (
    <div className="max-h-[70dvh] space-y-6 overflow-y-auto pr-1">
      <dl className="grid gap-x-5 gap-y-4 rounded-sm bg-panel-muted/50 p-4 sm:grid-cols-2">
        <Detail label="Applicant name" value={applicant.applicant_name} />
        <Detail label="Applicant ID" value={applicant.applicant_number} />
        <Detail
          label="Rank"
          value={
            applicant.assessment_rank
              ? `#${applicant.assessment_rank}`
              : "Not ranked"
          }
        />
        <Detail label="Position" value={positionLabel(applicant)} />
        <Detail
          label="Application status"
          value={formatCodeLabel(applicant.application_status)}
        />
        <Detail label="Applied" value={formatDate(applicant.applied_at)} />
        <Detail
          label="Education"
          value={
            applicant.education_levels?.map(educationLevelLabel).join(", ") ||
            "Not provided"
          }
        />
        <Detail
          label="Experience"
          value={`${Number(applicant.experience_years ?? 0).toFixed(1)} years`}
        />
        <Detail
          label="Training"
          value={`${trainingLabel(applicant.training_hours).replace(" hrs", " hours")}`}
        />
        <Detail
          label="Skills"
          value={applicant.skills?.join(", ") || "Not provided"}
        />
      </dl>
      <section aria-labelledby="criterion-scores-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3
              className="font-semibold text-ink"
              id="criterion-scores-heading"
            >
              Criterion scores
            </h3>
            <p className="mt-1 text-sm text-muted">
              Points awarded in each configured category.
            </p>
          </div>
          <p className="text-sm font-semibold text-ink">
            Total:{" "}
            {applicant.assessment_points?.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            }) ?? "Unavailable"}
          </p>
        </div>
        <div className="overflow-hidden rounded-sm border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel-muted text-sm font-semibold text-ink">
              <tr>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Category
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Source
                </th>
                <th
                  className="px-4 py-3 text-right font-semibold"
                  scope="col"
                >
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {applicant.criterion_scores.length > 0 ? (
                applicant.criterion_scores.map((score) => (
                  <tr key={score.key}>
                    <td className="px-4 py-3 font-medium text-ink">
                      {score.title}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {criterionSource(score.key)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">
                      {score.points === null
                        ? "Not scored"
                        : score.points.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                      {score.maximumPoints !== null &&
                        ` / ${score.maximumPoints.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                ))
              ) : (
                <TableEmptyRow
                  colSpan={3}
                  description="Scores will appear here when the application has been evaluated."
                  title="No criterion scores available"
                />
              )}
            </tbody>
          </table>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-subtle pt-4">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          href={`/hr/applications/${applicant.application_id}/pds/download`}
        >
          Download PDS
        </Link>
      </div>
    </div>
  );
}

function criterionSource(key: string) {
  if (key === "EDUCATION") return "PDS education records";
  if (key === "TRAINING") return "Verified certificates";
  if (key === "EXPERIENCE") return "Work experience records";
  return "Evaluator scoring";
}

function formatCodeLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function educationLevelLabel(value: string) {
  return (
    EDUCATION_LEVEL_OPTIONS.find((option) => option.value === value)?.label ??
    formatCodeLabel(value)
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

"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Alert, Input, Modal, Popconfirm, Select, Table } from "antd";
import { CheckIcon } from "@heroicons/react/20/solid";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { ColumnsType } from "antd/es/table";
import { Button } from "@/components/ui/Button";
import { EDUCATION_LEVEL_OPTIONS } from "@/constants/pds-options";
import { formatDate } from "@/utils/format-date";
import { formatPositionLabel } from "@/utils/format-position-track";
import {
  getHiringReadinessBlockers,
  type HiringReadiness,
} from "@/utils/hiring-readiness";
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
  hiredCount,
  hiringReadiness,
  initialApplicationId = null,
  slots,
}: Readonly<{
  applicants: ApplicantItem[];
  assessmentScoresUnavailable: boolean;
  hiredCount: number;
  hiringReadiness: HiringReadiness | null;
  initialApplicationId?: string | null;
  slots: number;
}>) {
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [educationFilter, setEducationFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(
    initialApplicationId,
  );
  const [feedback, setFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [isWorking, startTransition] = useTransition();

  const slotsFull = hiredCount >= slots;
  const canHire =
    hiringReadiness?.can_hire === true &&
    !slotsFull &&
    !assessmentScoresUnavailable;
  const readinessBlockers = hiringReadiness
    ? getHiringReadinessBlockers(hiringReadiness)
    : [];
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
            applicant.applicant_number.toLocaleLowerCase().includes(term)) &&
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

  function decide(applicationId: string) {
    setWorkingId(applicationId);
    startTransition(async () => {
      const result = await recordHiringDecision(applicationId);
      setFeedback(result);
      setWorkingId(null);
      if (result.success) setSelectedApplicantId(null);
    });
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
      {feedback && (
        <Alert
          className="mb-4"
          message={feedback.message}
          showIcon
          type={feedback.success ? "success" : "error"}
        />
      )}
      {assessmentScoresUnavailable && (
        <Alert
          className="mb-4"
          message="Assessment points could not be loaded. Ranking may be incomplete; refresh to try again."
          showIcon
          type="warning"
        />
      )}
      {!hiringReadiness ? (
        <Alert
          className="mb-4"
          message="Hiring readiness could not be checked. Refresh the page before making a hiring decision."
          showIcon
          type="warning"
        />
      ) : (
        <section
          aria-labelledby="hiring-readiness-heading"
          aria-describedby="hiring-readiness-guidance"
          className="mb-4 overflow-hidden rounded-xl border border-line bg-panel"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
            <div>
              <h2
                className="text-sm font-semibold text-ink"
                id="hiring-readiness-heading"
              >
                Hiring readiness
              </h2>
              <div
                className="mt-1 max-w-2xl text-xs leading-6 text-muted"
                id="hiring-readiness-guidance"
              >
                {canHire ? (
                  <p>
                    All evaluations, required document checks, and correction
                    windows are complete. HR can now hire qualified applicants.
                  </p>
                ) : (
                  <>
                    {assessmentScoresUnavailable && (
                      <p>
                        Applicant score data is unavailable. Refresh before
                        making a hiring decision.
                      </p>
                    )}
                    {readinessBlockers.length > 0 ? (
                      <ul className="mt-1 list-disc space-y-0.5 pl-5">
                        {readinessBlockers.map((blocker) => (
                          <li key={blocker}>{blocker}</li>
                        ))}
                      </ul>
                    ) : (
                      !assessmentScoresUnavailable && (
                        <p>
                          Hiring readiness could not be confirmed. Refresh the
                          page to check the latest applicant and slot data.
                        </p>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
            <span
              className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${canHire ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}
            >
              {canHire && <CheckIcon aria-hidden="true" className="size-4" />}
              {canHire ? "Ready to hire" : "Hiring on hold"}
            </span>
          </div>
          <dl className="grid border-t border-line-subtle text-sm sm:grid-cols-3">
            <ReadinessCount
              divided={false}
              label="Applications awaiting evaluation"
              value={hiringReadiness.pending_applications}
            />
            <ReadinessCount
              divided
              label="Required documents awaiting verification"
              value={hiringReadiness.pending_required_documents}
            />
            <ReadinessCount
              divided
              label="Open correction windows"
              value={hiringReadiness.pending_document_corrections}
            />
          </dl>
        </section>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(180px,auto)_minmax(220px,1fr)] xl:grid-cols-[minmax(180px,auto)_minmax(220px,1fr)_170px_190px] xl:items-center">
        <div>
          <h2 className="text-sm font-semibold text-ink">Qualified applicants</h2>
          <p className="mt-1 text-xs text-muted">
            {applicants.length.toLocaleString()} qualified applicants
          </p>
        </div>
        <label>
          <span className="sr-only">Search by applicant number</span>
          <Input
            aria-label="Search by applicant number"
            className="w-full rounded-md!"
            onChange={(event) => updateFilter(setSearch, event.target.value)}
            prefix={
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="size-4 text-muted"
              />
            }
            placeholder="Search by applicant number, e.g. 0053"
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

      {slotsFull && (
        <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          All {slots} hiring slots are filled. This posting has been closed
          automatically.
        </p>
      )}

      <p aria-live="polite" className="sr-only">
        Showing page {currentPage} of qualified applicants. {filtered.length} qualified
        applicants match the current filters.
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-panel">
        <Table<ApplicantItem>
          className="[&_.ant-table-thead>tr>th]:!bg-panel-muted [&_.ant-table-thead>tr>th]:!px-3 [&_.ant-table-thead>tr>th]:!py-3 [&_.ant-table-thead>tr>th]:!text-muted [&_.ant-table-thead>tr>th]:!text-xs [&_.ant-table-thead>tr>th]:!font-medium [&_.ant-table-thead>tr>th]:!border-line [&_.ant-table-thead>tr>th::before]:!hidden [&_.ant-table-tbody>tr.ant-table-row>td]:!bg-panel [&_.ant-table-tbody>tr.ant-table-row>th]:!bg-panel [&_.ant-table-tbody>tr.ant-table-row>td]:!px-3 [&_.ant-table-tbody>tr.ant-table-row>th]:!px-3 [&_.ant-table-tbody>tr.ant-table-row>td]:!py-4 [&_.ant-table-tbody>tr.ant-table-row>th]:!py-4 [&_.ant-table-tbody>tr.ant-table-row>td]:!border-line-subtle [&_.ant-table-tbody>tr.ant-table-row>th]:!border-line-subtle [&_.ant-table-tbody>tr.ant-table-row:hover>td]:!bg-panel-muted [&_.ant-table-tbody>tr.ant-table-row:hover>th]:!bg-panel-muted [&_.ant-table-placeholder>td]:!bg-panel [&_.ant-table-placeholder>td]:!border-line-subtle"
          // className="[&_.ant-table-thead>tr>th]:!bg-panel-muted [&_.ant-table-thead>tr>th]:!text-muted [&_.ant-table-thead>tr>th]:!text-xs [&_.ant-table-thead>tr>th]:!font-medium [&_.ant-table-thead>tr>th]:!border-line [&_.ant-table-thead>tr>th::before]:!hidden [&_.ant-table-tbody>tr.ant-table-row>td]:!bg-panel [&_.ant-table-tbody>tr.ant-table-row>th]:!bg-panel [&_.ant-table-tbody>tr.ant-table-row>td]:!border-line-subtle [&_.ant-table-tbody>tr.ant-table-row>th]:!border-line-subtle [&_.ant-table-tbody>tr.ant-table-row:hover>td]:!bg-panel-muted [&_.ant-table-tbody>tr.ant-table-row:hover>th]:!bg-panel-muted [&_.ant-table-placeholder>td]:!bg-panel [&_.ant-table-placeholder>td]:!border-line-subtle"
          columns={columns}
          dataSource={filtered}
          locale={{
            emptyText: (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold text-ink">
                  No qualified applicants
                </p>
                <p className="mt-1 text-sm text-muted">
                  No qualified applicants match these filters.
                </p>
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
            ? `Review applicant ${selectedApplicant.applicant_number}`
            : "Review applicant"
        }
        width={860}
      >
        {selectedApplicant && (
          <ApplicantDetails
            applicant={selectedApplicant}
            evaluated={selectedApplicant.application_status === "QUALIFIED"}
            onDecide={decide}
            pending={
              isWorking && workingId === selectedApplicant.application_id
            }
            canHire={canHire}
            terminal={["HIRED", "NOT_SELECTED"].includes(
              selectedApplicant.application_status,
            )}
          />
        )}
      </Modal>
    </section>
  );
}

function ApplicantDetails({
  applicant,
  evaluated,
  onDecide,
  pending,
  canHire,
  terminal,
}: Readonly<{
  applicant: ApplicantItem;
  evaluated: boolean;
  onDecide: (applicationId: string) => void;
  pending: boolean;
  canHire: boolean;
  terminal: boolean;
}>) {
  return (
    <div className="max-h-[70dvh] space-y-6 overflow-y-auto pr-1">
      <dl className="grid gap-x-5 gap-y-4 rounded-sm bg-panel-muted/50 p-4 sm:grid-cols-2">
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
        {applicant.criterion_scores.length ? (
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
                {applicant.criterion_scores.map((score) => (
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-sm border border-line bg-panel-muted p-4 text-sm text-muted">
            No criterion scores are available for this applicant.
          </p>
        )}
      </section>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-subtle pt-4">
        {applicant.application_status === "HIRED" && (
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href={`/hr/applications/${applicant.application_id}/pds`}
          >
            Printable PDS
          </Link>
        )}
        {evaluated && !terminal && (
          <Popconfirm
            onConfirm={() => onDecide(applicant.application_id)}
            title={`Hire ${applicant.applicant_number}?`}
            description="This uses one hiring slot. If it fills the last slot, all remaining qualified applicants will be marked Not Selected."
          >
            <Button
              disabled={!canHire || pending}
              loading={pending}
              variant="filled"
            >
              Hire
            </Button>
          </Popconfirm>
        )}
      </div>
    </div>
  );
}

function ReadinessCount({
  label,
  value,
  divided,
}: Readonly<{ label: string; value: number; divided: boolean }>) {
  return (
    <div
      className={`border-t border-line-subtle px-5 py-4 first:border-t-0 sm:border-t-0 ${divided ? "sm:border-l" : "sm:border-l-0"}`}
    >
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">
        {value}
      </dd>
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

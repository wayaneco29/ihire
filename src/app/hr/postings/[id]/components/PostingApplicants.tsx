"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Alert, Input, Modal, Popconfirm, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Button } from "@/components/ui/Button";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { EDUCATION_LEVEL_OPTIONS } from "@/constants/pds-options";
import { formatDate } from "@/utils/format-date";
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
  assessment_points: number | null;
  assessment_rank: number | null;
  criterion_scores: {
    key: string;
    title: string;
    points: number | null;
    maximumPoints: number | null;
  }[];
};

type ApplicantFilter = "QUALIFIED" | "HIRED" | "NOT_SELECTED";
type HiringReadiness = {
  intake_closed: boolean;
  pending_applications: number;
  pending_required_documents: number;
  pending_document_corrections: number;
  hired_count: number;
  slot_count: number;
  can_hire: boolean;
};
const FILTERS: { id: ApplicantFilter; label: string }[] = [
  { id: "QUALIFIED", label: "Qualified for hire" },
  { id: "HIRED", label: "Hired" },
  { id: "NOT_SELECTED", label: "Not selected" },
];

function matchesFilter(applicant: ApplicantItem, filter: ApplicantFilter) {
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
  assessmentScoresUnavailable,
  hiringReadiness,
  initialApplicationId = null,
  slots,
}: Readonly<{
  applicants: ApplicantItem[];
  assessmentScoresUnavailable: boolean;
  hiringReadiness: HiringReadiness | null;
  initialApplicationId?: string | null;
  slots: number;
}>) {
  const [filter, setFilter] = useState<ApplicantFilter>("QUALIFIED");
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

  const hiredCount = applicants.filter(
    (applicant) => applicant.application_status === "HIRED",
  ).length;
  const slotsFull = hiredCount >= slots;
  const canHire =
    hiringReadiness?.can_hire === true &&
    !slotsFull &&
    !assessmentScoresUnavailable;
  const selectedApplicant =
    applicants.find((applicant) => applicant.application_id === selectedApplicantId) ?? null;
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
        if (a.assessment_points === null && b.assessment_points !== null) return 1;
        if (b.assessment_points === null && a.assessment_points !== null) return -1;
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
  }, [applicants, educationFilter, filter, positionFilter, search]);

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
      width: 80,
      align: "center",
      fixed: "left",
      className: "pl-6!",
      render: (_, applicant) =>
        applicant.assessment_rank === null ? "—" : `#${applicant.assessment_rank}`,
    },
    {
      title: "Applicant ID",
      dataIndex: "applicant_number",
      key: "applicant_number",
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
      title: "Total points",
      dataIndex: "assessment_points",
      key: "assessment_points",
      width: 180,
      align: "right",
      render: (points: number | null) =>
        points === null
          ? "Awaiting scores"
          : points.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    },
    {
      title: "Education",
      key: "education",
      width: 190,
      ellipsis: true,
      render: (_, applicant) =>
        applicant.education_levels?.map(educationLevelLabel).join(", ") ||
        "Not provided",
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
        <WorkflowStatusTag status={applicationStatus} />
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
    <section className="mt-6">
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
          className="mb-4 rounded-sm border border-line bg-panel px-4 py-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                className="text-sm font-semibold text-ink"
                id="hiring-readiness-heading"
              >
                Hiring readiness
              </h2>
              <p className="mt-1 text-sm text-muted">
                {assessmentScoresUnavailable
                  ? "Applicant score data is unavailable; refresh before making a hiring decision."
                  : `Intake is ${hiringReadiness.intake_closed ? "closed" : "open"}.`}
                {!assessmentScoresUnavailable && hiringReadiness.can_hire
                  ? " Reviews and required document checks are resolved; qualified applicants can be hired."
                  : !assessmentScoresUnavailable
                    ? " Hiring is enabled after intake closes and all active applications and required document correction windows are resolved."
                    : ""}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${canHire ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}
            >
              {canHire ? "Ready to hire" : "Hiring on hold"}
            </span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <ReadinessCount
              label="Applications awaiting evaluation"
              value={hiringReadiness.pending_applications}
            />
            <ReadinessCount
              label="Required documents awaiting verification"
              value={hiringReadiness.pending_required_documents}
            />
            <ReadinessCount
              label="Open correction windows"
              value={hiringReadiness.pending_document_corrections}
            />
          </dl>
        </section>
      )}
      <p className="mb-3 text-sm text-muted">
        Applicants are ranked by total criterion points, including education,
        training certificates, experience, and evaluator scores. Equal totals
        are ordered by applicant number.
      </p>
      <div className="px-5 py-4 shadow rounded-sm bg-panel">
        <nav
          aria-label="Filter applicants by status"
          className="flex flex-wrap gap-1.5"
        >
          {FILTERS.map((option) => (
            <Button
              aria-pressed={filter === option.id}
              className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold cursor-pointer transition-colors ${filter === option.id ? "border-primary/50 bg-primary-light text-ink" : "border-line bg-transparent text-muted hover:bg-panel"}`}
              key={option.id}
              onClick={() => updateFilter(setFilter, option.id)}
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
                label: educationLevelLabel(level),
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
          scroll={{ x: 1500 }}
          size="middle"
        />
      </div>
      <Modal
        centered
        destroyOnHidden
        footer={null}
        onCancel={() => setSelectedApplicantId(null)}
        open={Boolean(selectedApplicant)}
        title={selectedApplicant ? `Review applicant ${selectedApplicant.applicant_number}` : "Review applicant"}
        width={860}
      >
        {selectedApplicant && (
          <ApplicantDetails
            applicant={selectedApplicant}
            evaluated={selectedApplicant.application_status === "QUALIFIED"}
            onDecide={decide}
            pending={isWorking && workingId === selectedApplicant.application_id}
            canHire={canHire}
            terminal={["HIRED", "NOT_SELECTED"].includes(selectedApplicant.application_status)}
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
        <Detail label="Rank" value={applicant.assessment_rank ? `#${applicant.assessment_rank}` : "Not ranked"} />
        <Detail label="Position" value={positionLabel(applicant)} />
        <Detail label="Application status" value={formatCodeLabel(applicant.application_status)} />
        <Detail label="Applied" value={formatDate(applicant.applied_at)} />
        <Detail
          label="Education"
          value={applicant.education_levels?.map(educationLevelLabel).join(", ") || "Not provided"}
        />
        <Detail
          label="Experience"
          value={`${Number(applicant.experience_years ?? 0).toFixed(1)} years`}
        />
        <Detail
          label="Training"
          value={`${trainingLabel(applicant.training_hours).replace(" hrs", " hours")}`}
        />
        <Detail label="Skills" value={applicant.skills?.join(", ") || "Not provided"} />
      </dl>
      <section aria-labelledby="criterion-scores-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink" id="criterion-scores-heading">Criterion scores</h3>
            <p className="mt-1 text-sm text-muted">Points awarded in each configured category.</p>
          </div>
          <p className="text-sm font-semibold text-ink">
            Total: {applicant.assessment_points?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "Unavailable"}
          </p>
        </div>
        {applicant.criterion_scores.length ? (
          <div className="overflow-hidden rounded-sm border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold" scope="col">Category</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Source</th>
                  <th className="px-4 py-3 text-right font-semibold" scope="col">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {applicant.criterion_scores.map((score) => (
                  <tr key={score.key}>
                    <td className="px-4 py-3 font-medium text-ink">{score.title}</td>
                    <td className="px-4 py-3 text-muted">{criterionSource(score.key)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">
                      {score.points === null
                        ? "Not scored"
                        : score.points.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      {score.maximumPoints !== null && ` / ${score.maximumPoints.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
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

function ReadinessCount({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-sm bg-panel-muted/60 px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-semibold tabular-nums text-ink">{value}</dd>
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

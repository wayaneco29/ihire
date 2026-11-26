"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input, Pagination, Select } from "antd";
import {
  ArrowDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { TableEmptyRow } from "@/components/ui/TableEmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { APPLICATION_STATUSES } from "@/constants/statuses";
import { formatDate } from "@/utils/format-date";
import { formatStatusLabel } from "@/utils/format-status-label";
import type { PublicEnums } from "@/types/database-enums";

type ApplicationStatus = PublicEnums["application_status"];
type StatusFilter = ApplicationStatus | "ALL";
type JobStatusFilter = PublicEnums["job_status"] | "ALL";
type StaffBasePath = "/sds" | "/asds";

const STATUS_FILTER_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All statuses", value: "ALL" },
  ...APPLICATION_STATUSES.map((status) => ({
    label: formatStatusLabel(status),
    value: status,
  })),
];

const JOB_STATUS_FILTER_OPTIONS: { label: string; value: JobStatusFilter }[] = [
  { label: "All job statuses", value: "ALL" },
  { label: "Open", value: "OPEN" },
  { label: "Closed", value: "CLOSED" },
  { label: "Draft", value: "DRAFT" },
];

type PostingRow = {
  id: string;
  title: string;
  status: PublicEnums["job_status"];
  slots: number;
  deadline: string | null;
  created_at: string;
  positionNames: string[];
  total: number;
  awaitingDecision: number;
  underReview: number;
  hired: number;
};

type RankedApplicant = {
  application_id: string;
  applicant_name: string;
  applicant_number: string;
  application_status: ApplicationStatus;
  applied_at: string;
  job_id: string;
  job_title: string;
  position_title: string | null;
  totalPoints: number | null;
  maximumPoints: number | null;
  normalizedScore: number | null;
  minimumPoints: number | null;
  isComplete: boolean;
  rank: number | null;
};

type DecisionRow = {
  decision_id: string;
  application_id: string;
  job_id: string;
  applicant_name: string;
  applicant_number: string;
  job_title: string;
  position_title: string | null;
  decision: string;
  decided_at: string;
  decision_remarks: string;
  decided_by_email: string;
};

function MetricCard({
  label,
  value,
}: Readonly<{ label: string; value: number | string }>) {
  return (
    <div className="rounded-xl border border-line bg-panel px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}

function formatPoints(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function StaffJobPostingTable({
  postings,
  basePath,
}: Readonly<{ postings: PostingRow[]; basePath: StaffBasePath }>) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>("ALL");
  const filteredPostings = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return postings.filter((posting) => {
      const matchesStatus =
        statusFilter === "ALL" || posting.status === statusFilter;
      const matchesSearch =
        !query ||
        [posting.title, ...posting.positionNames].some((value) =>
          value.toLocaleLowerCase().includes(query),
        );
      return matchesStatus && matchesSearch;
    });
  }, [postings, search, statusFilter]);

  const totalApplicants = postings.reduce(
    (total, posting) => total + posting.total,
    0,
  );
  const awaitingDecision = postings.reduce(
    (total, posting) => total + posting.awaitingDecision,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Job postings" value={postings.length} />
        <MetricCard label="Total applicants" value={totalApplicants} />
        <MetricCard label="Awaiting your decision" value={awaitingDecision} />
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="flex flex-col gap-3 border-b border-line-subtle px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              aria-label="Search job postings"
              className="w-full sm:max-w-sm"
              onChange={(event) => setSearch(event.target.value)}
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
              onChange={(value: JobStatusFilter) => setStatusFilter(value)}
              options={JOB_STATUS_FILTER_OPTIONS}
              value={statusFilter}
            />
          </div>
          <p aria-live="polite" className="text-sm text-muted">
            {filteredPostings.length}{" "}
            {filteredPostings.length === 1 ? "job posting" : "job postings"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-line-subtle text-left text-sm">
            <thead className="bg-panel-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Job posting</th>
                <th className="px-5 py-3 font-medium">Position</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Applicants</th>
                <th className="px-5 py-3 font-medium">Awaiting decision</th>
                <th className="px-5 py-3">
                  <span className="sr-only">Open posting</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {filteredPostings.length === 0 ? (
                <TableEmptyRow
                  colSpan={6}
                  description={
                    postings.length === 0
                      ? "If you expected postings here, ask your administrator to check your staff access and posting visibility."
                      : "Try a different search or choose another job status."
                  }
                  title={
                    postings.length === 0
                      ? "No job postings are visible"
                      : "No postings match these filters"
                  }
                />
              ) : (
                filteredPostings.map((posting) => (
                  <tr className="hover:bg-panel-muted/60" key={posting.id}>
                    <td className="px-5 py-4">
                      <Link
                        className="font-semibold text-ink hover:text-primary"
                        href={`${basePath}/postings/${posting.id}`}
                      >
                        {posting.title}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {posting.positionNames.length
                        ? posting.positionNames.join(", ")
                        : "Position not recorded"}
                    </td>
                    <td className="px-5 py-4">
                      <WorkflowStatusTag status={posting.status} />
                    </td>
                    <td className="px-5 py-4 font-medium tabular-nums text-ink">
                      {posting.total}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${posting.awaitingDecision ? "bg-warning/15 text-warning" : "bg-panel-muted text-muted"}`}
                      >
                        {posting.awaitingDecision} to decide
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        className="inline-flex min-h-10 min-w-28 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
                        href={`${basePath}/postings/${posting.id}`}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function StaffRankedApplicantTable({
  applicants,
  basePath,
  canHire,
  posting,
  scoresUnavailable,
}: Readonly<{
  applicants: RankedApplicant[];
  basePath: StaffBasePath;
  canHire: boolean;
  scoresUnavailable: boolean;
  posting: {
    id: string;
    title: string;
    status: PublicEnums["job_status"];
    slots: number;
    deadline: string | null;
  };
}>) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    canHire ? "QUALIFIED" : "ALL",
  );
  const showRankColumn = statusFilter === "QUALIFIED";
  const [page, setPage] = useState(1);
  const filteredApplicants = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return applicants.filter((applicant) => {
      const statusMatches =
        statusFilter === "ALL" || applicant.application_status === statusFilter;
      const searchMatches =
        !query ||
        `${applicant.applicant_name} ${applicant.applicant_number}`
          .toLocaleLowerCase()
          .includes(query);
      return statusMatches && searchMatches;
    });
  }, [applicants, search, statusFilter]);
  const pageSize = 25;
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filteredApplicants.length / pageSize)),
  );
  const visibleApplicants = filteredApplicants.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const count = (statuses: ApplicationStatus[]) =>
    applicants.filter((applicant) =>
      statuses.includes(applicant.application_status),
    ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Awaiting decision" value={count(["QUALIFIED"])} />
        <MetricCard
          label="Under review"
          value={count([
            "SUBMITTED",
            "UNDER_EVALUATION",
            "ASSESSMENT_SCHEDULED",
            "ASSESSMENT_SCORED",
          ])}
        />
        <MetricCard label="Hired" value={count(["HIRED"])} />
        <MetricCard label="Not selected" value={count(["NOT_SELECTED"])} />
      </div>

      {scoresUnavailable && (
        <p
          className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
          role="status"
        >
          Applicant records are available, but scores and ranks could not be
          loaded. The applicant list is still shown below.
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="flex flex-col gap-3 border-b border-line-subtle px-4 py-4 lg:flex-row lg:items-end lg:justify-between sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="w-full sm:w-80">
              <span className="sr-only">Search applicants</span>
              <Input
                aria-label="Search name or applicant number"
                className="w-full"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name or applicant number"
                prefix={
                  <MagnifyingGlassIcon
                    aria-hidden="true"
                    className="size-4 text-muted"
                  />
                }
                value={search}
              />
            </label>
            <label className="w-full sm:w-48">
              <span className="sr-only">Filter by application status</span>
              <Select
                aria-label="Filter applicants by status"
                className="w-full"
                onChange={(value: StatusFilter) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
              />
            </label>
          </div>
          <p aria-live="polite" className="text-sm text-muted">
            Showing {filteredApplicants.length} of {applicants.length}{" "}
            applicants
            {posting.deadline
              ? ` · Deadline ${formatDate(posting.deadline, "MMM D, YYYY")}`
              : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-line-subtle text-left text-sm">
            <thead className="bg-panel-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                {showRankColumn && (
                  <th className="px-5 py-3 font-medium">Rank</th>
                )}
                <th className="px-5 py-3 font-medium">Applicant</th>
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Position</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">
                  <span className="inline-flex items-center gap-1">
                    Score{" "}
                    <ArrowDownIcon aria-hidden="true" className="size-3.5" />
                  </span>
                </th>
                <th className="px-5 py-3">
                  <span className="sr-only">Review applicant</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {filteredApplicants.length === 0 ? (
                <TableEmptyRow
                  colSpan={showRankColumn ? 7 : 6}
                  description={
                    applicants.length === 0
                      ? "Applicants will appear here after they apply to this posting."
                      : "Try another status or search by applicant name or number."
                  }
                  title={
                    applicants.length === 0
                      ? "No applicants yet"
                      : "No applicants match these filters"
                  }
                />
              ) : (
                visibleApplicants.map((applicant) => (
                  <tr
                    className="hover:bg-panel-muted/60"
                    key={applicant.application_id}
                  >
                    {showRankColumn && (
                      <td className="px-5 py-4 font-semibold tabular-nums text-ink">
                        {applicant.rank === null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          `#${applicant.rank}`
                        )}
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">
                        {applicant.applicant_name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        Applied{" "}
                        {formatDate(applicant.applied_at, "MMM D, YYYY")}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {applicant.applicant_number}
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {applicant.position_title ?? "Position not recorded"}
                    </td>
                    <td className="px-5 py-4">
                      <WorkflowStatusTag
                        status={applicant.application_status}
                      />
                    </td>
                    <td className="px-5 py-4 font-semibold tabular-nums text-ink">
                      {applicant.isComplete &&
                      applicant.totalPoints !== null &&
                      applicant.maximumPoints !== null ? (
                        <>
                          {formatPoints(applicant.totalPoints)}{" "}
                          <span className="font-normal text-muted">
                            / {formatPoints(applicant.maximumPoints)}
                          </span>
                        </>
                      ) : (
                        <span className="font-normal text-muted">
                          {scoresUnavailable ? "Unavailable" : "Incomplete"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        className="inline-flex min-h-10 min-w-28 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
                        href={`${basePath}/applications/${applicant.application_id}`}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredApplicants.length > pageSize && (
          <Pagination
            className="flex justify-end border-t border-line-subtle px-5 py-4"
            current={currentPage}
            onChange={setPage}
            pageSize={pageSize}
            showSizeChanger={false}
            total={filteredApplicants.length}
          />
        )}
      </section>
    </div>
  );
}

export function StaffDecisionHistoryTable({
  decisions,
  basePath,
}: Readonly<{ decisions: DecisionRow[]; basePath: StaffBasePath }>) {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(decisions.length / pageSize)),
  );
  const visibleDecisions = decisions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const latestDecision = decisions[0]?.decided_at;
  const postingsCount = new Set(decisions.map((decision) => decision.job_id))
    .size;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Recorded decisions" value={decisions.length} />
        <MetricCard
          label="Applicants hired"
          value={
            decisions.filter((decision) => decision.decision === "HIRED").length
          }
        />
        <MetricCard label="Postings with decisions" value={postingsCount} />
      </div>
      <section className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-4 py-4 sm:px-5">
          <h2 className="font-semibold text-ink">SDS decisions</h2>
          <p className="text-sm text-muted">
            {latestDecision
              ? `Latest: ${formatDate(latestDecision, "MMM D, YYYY")}`
              : "No decisions recorded"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-line-subtle text-left text-sm">
            <thead className="bg-panel-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Applicant</th>
                <th className="px-5 py-3 font-medium">Job posting</th>
                <th className="px-5 py-3 font-medium">Decision</th>
                <th className="px-5 py-3 font-medium">Remarks</th>
                <th className="px-5 py-3 font-medium">Recorded by</th>
                <th className="px-5 py-3">
                  <span className="sr-only">View application</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {decisions.length === 0 ? (
                <TableEmptyRow
                  colSpan={7}
                  description="When the SDS records a hiring decision, its date, applicant, and remarks will appear here."
                  title="No SDS decisions yet"
                />
              ) : (
                visibleDecisions.map((decision) => (
                  <tr
                    className="align-top hover:bg-panel-muted/60"
                    key={decision.decision_id}
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-muted">
                      {formatDate(decision.decided_at, "MMM D, YYYY · h:mm A")}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">
                        {decision.applicant_name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {decision.applicant_number}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink">
                        {decision.job_title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {decision.position_title ?? "Position not recorded"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <WorkflowStatusTag status={decision.decision} />
                    </td>
                    <td className="max-w-xs px-5 py-4 text-muted">
                      <p className="line-clamp-3 whitespace-pre-wrap">
                        {decision.decision_remarks}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink">
                        School Division Superintendent
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {decision.decided_by_email}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-primary px-3 text-sm font-semibold text-primary transition hover:bg-primary-light"
                        href={`${basePath}/applications/${decision.application_id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {decisions.length > pageSize && (
          <Pagination
            className="flex justify-end border-t border-line-subtle px-5 py-4"
            current={currentPage}
            onChange={setPage}
            pageSize={pageSize}
            showSizeChanger={false}
            total={decisions.length}
          />
        )}
      </section>
    </div>
  );
}

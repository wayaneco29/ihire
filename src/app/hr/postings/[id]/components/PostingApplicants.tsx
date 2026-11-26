"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert, Input, Pagination, Select } from "antd";
import {
  ArrowDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { MetricCard } from "@/components/ui/MetricCard";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { TableEmptyRow } from "@/components/ui/TableEmptyState";
import { formatDate } from "@/utils/format-date";
import { formatPositionLabel } from "@/utils/format-position-track";
import { APPLICATION_STATUSES } from "@/constants/statuses";

export type ApplicantItem = {
  application_id: string;
  applicant_name: string;
  applicant_number: string;
  application_status: string;
  applied_at: string;
  position_title: string | null;
  position_track: string | null;
  assessment_points: number | null;
  assessment_maximum_points: number | null;
  assessment_is_complete: boolean;
  assessment_rank: number | null;
};

function positionLabel(applicant: ApplicantItem) {
  if (!applicant.position_title) return "Position not recorded";
  return formatPositionLabel(
    applicant.position_title,
    applicant.position_track ?? "",
  );
}

const UNDER_REVIEW_STATUSES = [
  "SUBMITTED",
  "UNDER_EVALUATION",
  "ASSESSMENT_SCHEDULED",
  "ASSESSMENT_SCORED",
];

export function PostingApplicants({
  applicants,
  assessmentScoresUnavailable,
  initialStatusFilter = "QUALIFIED",
}: Readonly<{
  applicants: ApplicantItem[];
  assessmentScoresUnavailable: boolean;
  initialStatusFilter?: string;
}>) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return applicants
      .filter(
        (applicant) =>
          (!term ||
            (applicant.applicant_number.toLocaleLowerCase().includes(term) ||
              applicant.applicant_name.toLocaleLowerCase().includes(term))) &&
          (statusFilter === "ALL" ||
            applicant.application_status === statusFilter),
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
  }, [applicants, search, statusFilter]);

  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );
  const visibleApplicants = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function updateFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const showRankColumn = statusFilter === "QUALIFIED";
  const countStatuses = (statuses: string[]) =>
    applicants.filter((applicant) =>
      statuses.includes(applicant.application_status),
    ).length;

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Awaiting decision"
          value={countStatuses(["QUALIFIED"])}
        />
        <MetricCard
          label="Under review"
          value={countStatuses(UNDER_REVIEW_STATUSES)}
        />
        <MetricCard label="Hired" value={countStatuses(["HIRED"])} />
        <MetricCard
          label="Not selected"
          value={countStatuses(["NOT_SELECTED"])}
        />
      </div>
      <section className="mt-4 overflow-hidden rounded-xl border border-line bg-panel">
        <div className="flex flex-col gap-3 border-b border-line-subtle px-4 py-4 lg:flex-row lg:items-end lg:justify-between sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="w-full sm:w-80">
              <span className="sr-only">Search applicants</span>
              <Input
                aria-label="Search name or applicant number"
                className="w-full"
                onChange={(event) => updateFilter(setSearch, event.target.value)}
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
                onChange={(value: string) => updateFilter(setStatusFilter, value)}
                options={[
                  { label: "All statuses", value: "ALL" },
                  ...APPLICATION_STATUSES.map((status) => ({
                    label: formatCodeLabel(status),
                    value: status,
                  })),
                ]}
                value={statusFilter}
              />
            </label>
          </div>
          <p aria-live="polite" className="text-sm text-muted">
            Showing {filtered.length} of {applicants.length} applicants
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
                    Score <ArrowDownIcon aria-hidden="true" className="size-3.5" />
                  </span>
                </th>
                <th className="px-5 py-3">
                  <span className="sr-only">Review applicant</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {filtered.length === 0 ? (
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
                        {applicant.assessment_rank === null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          `#${applicant.assessment_rank}`
                        )}
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">
                        {applicant.applicant_name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        Applied {formatDate(applicant.applied_at, "MMM D, YYYY")}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {applicant.applicant_number}
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {positionLabel(applicant)}
                    </td>
                    <td className="px-5 py-4">
                      <WorkflowStatusTag status={applicant.application_status} />
                    </td>
                    <td className="px-5 py-4 font-semibold tabular-nums text-ink">
                      {assessmentScoresUnavailable ? (
                        <span className="font-normal text-muted">Unavailable</span>
                      ) :
                      !applicant.assessment_is_complete ||
                        applicant.assessment_points === null ||
                        applicant.assessment_maximum_points === null ||
                        applicant.assessment_maximum_points <= 0 ? (
                        <span className="font-normal text-muted">Incomplete</span>
                      ) : (
                        <>
                          {applicant.assessment_points.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}{" "}
                          <span className="font-normal text-muted">
                            / {applicant.assessment_maximum_points.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        className="inline-flex min-h-10 min-w-28 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
                        href={`/hr/applications/${applicant.application_id}?returnStatus=${encodeURIComponent(statusFilter)}`}
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
        {filtered.length > pageSize && (
          <Pagination
            className="flex justify-end border-t border-line-subtle px-5 py-4"
            current={currentPage}
            onChange={setPage}
            pageSize={pageSize}
            showSizeChanger={false}
            total={filtered.length}
          />
        )}
      </section>
    </section>
  );
}

function formatCodeLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

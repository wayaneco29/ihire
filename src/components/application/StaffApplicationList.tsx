"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Select } from "antd";
import { TableEmptyRow } from "@/components/ui/TableEmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { APPLICATION_STATUSES } from "@/constants/statuses";
import { formatDate } from "@/utils/format-date";
import { formatStatusLabel } from "@/utils/format-status-label";
import type { PublicEnums } from "@/types/database-enums";

type ApplicationStatus = PublicEnums["application_status"];
type StatusFilter = ApplicationStatus | "ALL";

const STATUS_FILTER_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All statuses", value: "ALL" },
  ...APPLICATION_STATUSES.map((status) => ({
    label: formatStatusLabel(status),
    value: status,
  })),
];

type StaffApplication = {
  application_id: string;
  applicant_name: string;
  applicant_number: string;
  application_status: ApplicationStatus;
  applied_at: string;
  job_title: string;
  position_title: string | null;
};

export function StaffApplicationList({
  applications,
  basePath,
}: Readonly<{
  applications: StaffApplication[];
  basePath: string;
}>) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    basePath === "/sds" ? "QUALIFIED" : "ALL",
  );
  const filteredApplications = useMemo(
    () =>
      statusFilter === "ALL"
        ? applications
        : applications.filter(
            (application) => application.application_status === statusFilter,
          ),
    [applications, statusFilter],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="w-full max-w-sm">
          <span className="mb-2 block text-sm font-medium text-ink">
            Filter by application status
          </span>
          <Select
            aria-label="Filter applications by status"
            className="w-full rounded-md!"
            onChange={(value: StatusFilter) => setStatusFilter(value)}
            options={STATUS_FILTER_OPTIONS}
            size="medium"
            value={statusFilter}
          />
        </label>
        <p aria-live="polite" className="text-sm text-muted">
          Showing {filteredApplications.length} of {applications.length} applications
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="min-w-full divide-y divide-line-subtle text-left text-sm">
          <thead className="bg-panel-muted text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Applicant</th>
              <th className="px-4 py-3 font-medium">Applicant number</th>
              <th className="px-4 py-3 font-medium">Job posting</th>
              <th className="px-4 py-3 font-medium">Position</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Applied</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {filteredApplications.length === 0 ? (
              <TableEmptyRow
                colSpan={7}
                description={
                  applications.length === 0
                    ? "Applications will appear here after applicants apply to an open posting."
                    : "Choose another status or select All statuses to see more applications."
                }
                title={
                  applications.length === 0
                    ? "No applications yet"
                    : "No applications match this status"
                }
              />
            ) : (
              filteredApplications.map((application) => (
                <tr key={application.application_id}>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {application.applicant_name}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {application.applicant_number}
                  </td>
                  <td className="px-4 py-3 text-ink">{application.job_title}</td>
                  <td className="px-4 py-3 text-muted">
                    {application.position_title ?? "Position not recorded"}
                  </td>
                  <td className="px-4 py-3">
                    <WorkflowStatusTag status={application.application_status} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(application.applied_at, "MMM D, YYYY")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      className="inline-flex min-h-10 items-center rounded-md border border-primary px-3 font-semibold text-primary hover:bg-primary-light"
                      href={`${basePath}/applications/${application.application_id}`}
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
    </section>
  );
}

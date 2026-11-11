"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Alert, Popconfirm } from "antd";
import { Button } from "@/components/ui/Button";
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

type ApplicantFilter = "ALL" | "UNDER_EVALUATION" | "QUALIFIED" | "NOT_QUALIFIED" | "HIRED";
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

function statusLabel(status: string) {
  if (status === "SUBMITTED") return "Under evaluation";
  if (status === "ASSESSMENT_SCHEDULED") return "Under evaluation";
  if (status === "NOT_QUALIFIED") return "Not qualified";
  return status
    .toLocaleLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(" ");
}

function statusClasses(status: string) {
  if (UNDER_EVALUATION_STATUSES.includes(status)) {
    return "bg-warning/15 text-warning";
  }
  if (status === "QUALIFIED") return "bg-success/15 text-success";
  if (status === "HIRED") return "bg-success text-on-primary";
  if (NOT_QUALIFIED_STATUSES.includes(status)) {
    return "bg-danger/10 text-danger";
  }
  return "bg-panel-muted text-muted-strong";
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
          (!term || applicant.applicant_number.toLocaleLowerCase().includes(term)) &&
          (positionFilter === "ALL" || positionLabel(applicant) === positionFilter) &&
          (educationFilter === "ALL" ||
            applicant.education_levels?.includes(educationFilter)),
      )
      .sort((a, b) => {
        const result = a.applicant_number.localeCompare(b.applicant_number, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        return sortOrder === "asc" ? result : -result;
      });
  }, [applicants, educationFilter, filter, positionFilter, search, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageApplicants = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const firstVisible = filtered.length ? (currentPage - 1) * pageSize + 1 : 0;
  const lastVisible = Math.min(currentPage * pageSize, filtered.length);

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

  return (
    <section className="mt-8">
      {feedback && (
        <Alert
          className="mb-4"
          message={feedback.message}
          showIcon
          type={feedback.success ? "success" : "error"}
        />
      )}

      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
          Applicants
        </h2>
        <p className="mt-1 text-sm text-muted">
          Names are hidden. Review each applicant by number and credentials.
        </p>
      </div>

      <nav
        aria-label="Filter applicants by status"
        className="mt-4 flex flex-wrap gap-1.5"
      >
        {FILTERS.map((option) => (
          <Button
            aria-pressed={filter === option.id}
            className={`min-h-9 rounded-full border px-3.5 text-sm font-medium ${
              filter === option.id
                ? "border-primary-light bg-primary-light text-primary"
                : "border-line bg-panel text-muted hover:bg-panel-muted"
            }`}
            key={option.id}
            onClick={() => updateFilter(setFilter, option.id)}
            size="sm"
            type="button"
            variant="unstyled"
          >
            {option.label} <span className="tabular-nums">{counts[option.id].toLocaleString()}</span>
          </Button>
        ))}
      </nav>

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_190px]">
        <label>
          <span className="sr-only">Search by applicant number</span>
          <input
            aria-label="Search by applicant number"
            className="h-11 w-full rounded-[8px] border border-line-strong bg-panel px-3 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onChange={(event) => updateFilter(setSearch, event.target.value)}
            placeholder="Search by applicant number, e.g. 0053"
            type="search"
            value={search}
          />
        </label>
        <label>
          <span className="sr-only">Filter by position</span>
          <select
            aria-label="Filter by position"
            className="h-11 w-full rounded-[8px] border border-line-strong bg-panel px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onChange={(event) =>
              updateFilter(setPositionFilter, event.target.value)
            }
            value={positionFilter}
          >
            <option value="ALL">All positions</option>
            {positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by education level</span>
          <select
            aria-label="Filter by education level"
            className="h-11 w-full rounded-[8px] border border-line-strong bg-panel px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onChange={(event) =>
              updateFilter(setEducationFilter, event.target.value)
            }
            value={educationFilter}
          >
            <option value="ALL">All education levels</option>
            {educationLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      </div>

      {slotsFull && (
        <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          All {slots} hiring slots are filled. This posting has been closed
          automatically.
        </p>
      )}

      <p aria-live="polite" className="sr-only">
        Showing {firstVisible} to {lastVisible} of {filtered.length} applicants.
      </p>

      {pageApplicants.length ? (
        <>
          <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-panel">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead className="bg-panel-muted/70 text-xs text-muted">
                <tr>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold" scope="col">
                    <button
                      aria-label={`Sort by applicant number ${sortOrder === "asc" ? "descending" : "ascending"}`}
                      className="inline-flex items-center gap-1 hover:text-ink"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      type="button"
                    >
                      Applicant No. <span aria-hidden="true">{sortOrder === "asc" ? "↑" : "↓"}</span>
                    </button>
                  </th>
                  <th className="px-3 py-3 font-semibold" scope="col">Position</th>
                  <th className="px-3 py-3 font-semibold" scope="col">Education</th>
                  <th className="px-3 py-3 font-semibold" scope="col">Experience</th>
                  <th className="px-3 py-3 font-semibold" scope="col">Training</th>
                  <th className="px-3 py-3 font-semibold" scope="col">Skills</th>
                  <th className="px-3 py-3 font-semibold" scope="col">Status</th>
                  <th className="px-3 py-3 font-semibold" scope="col"><span className="sr-only">Review</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageApplicants.map((applicant) => {
                  const expanded = expandedId === applicant.application_id;
                  const evaluated = ["QUALIFIED", "NOT_QUALIFIED"].includes(
                    applicant.application_status,
                  );
                  const terminal = ["HIRED", "REJECTED"].includes(
                    applicant.application_status,
                  );
                  const pending = isWorking && workingId === applicant.application_id;
                  const education = applicant.education_levels?.join(", ") || "Not provided";
                  const skills = applicant.skills?.join(", ") || "Not provided";

                  return (
                    <ApplicantTableRows
                      applicant={applicant}
                      education={education}
                      expanded={expanded}
                      evaluated={evaluated}
                      key={applicant.application_id}
                      onDecide={decide}
                      onToggle={() =>
                        setExpandedId(expanded ? null : applicant.application_id)
                      }
                      pending={pending}
                      skills={skills}
                      slotsFull={slotsFull}
                      terminal={terminal}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {firstVisible}–{lastVisible} of {filtered.length.toLocaleString()} applicants
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                Rows
                <select
                  aria-label="Rows per page"
                  className="h-9 rounded-[8px] border border-line-strong bg-panel px-2 text-sm text-ink"
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  value={pageSize}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <Button
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                size="sm"
                type="button"
                variant="bordered"
              >
                Previous
              </Button>
              <span className="whitespace-nowrap">Page {currentPage} of {pageCount}</span>
              <Button
                disabled={currentPage >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                size="sm"
                type="button"
                variant="bordered"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-lg border border-line bg-panel p-8 text-center text-sm text-muted">
          No applicants match these filters.
        </div>
      )}
    </section>
  );
}

function ApplicantTableRows({
  applicant,
  education,
  expanded,
  evaluated,
  onDecide,
  onToggle,
  pending,
  skills,
  slotsFull,
  terminal,
}: Readonly<{
  applicant: ApplicantItem;
  education: string;
  expanded: boolean;
  evaluated: boolean;
  onDecide: (applicationId: string, decision: "HIRED" | "REJECTED") => void;
  onToggle: () => void;
  pending: boolean;
  skills: string;
  slotsFull: boolean;
  terminal: boolean;
}>) {
  return (
    <>
      <tr className="transition-colors hover:bg-panel-muted/40">
        <th className="whitespace-nowrap px-3 py-3 font-semibold text-ink" scope="row">
          {applicant.applicant_number}
        </th>
        <td className="max-w-48 truncate px-3 py-3 text-muted-strong" title={positionLabel(applicant)}>
          {positionLabel(applicant)}
        </td>
        <td className="max-w-40 truncate px-3 py-3 text-muted-strong" title={education}>
          {education}
        </td>
        <td className="whitespace-nowrap px-3 py-3 text-muted-strong">
          {experienceLabel(applicant.experience_years)}
        </td>
        <td className="whitespace-nowrap px-3 py-3 text-muted-strong">
          {trainingLabel(applicant.training_hours)}
        </td>
        <td className="max-w-52 truncate px-3 py-3 text-muted-strong" title={skills}>
          {skills}
        </td>
        <td className="whitespace-nowrap px-3 py-3">
          <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 text-[11px] font-semibold ${statusClasses(applicant.application_status)}`}>
            {statusLabel(applicant.application_status)}
          </span>
        </td>
        <td className="px-3 py-2.5 text-right">
          <Button
            aria-controls={`applicant-details-${applicant.application_id}`}
            aria-expanded={expanded}
            onClick={onToggle}
            size="sm"
            type="button"
            variant="bordered"
          >
            {expanded ? "Close" : "Review"}
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr id={`applicant-details-${applicant.application_id}`}>
          <td className="bg-panel-muted/40 px-4 py-4" colSpan={8}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <dl className="grid flex-1 gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Position applying for" value={positionLabel(applicant)} />
                <Detail label="Education" value={education} />
                <Detail label="Experience" value={`${Number(applicant.experience_years ?? 0).toFixed(1)} years`} />
                <Detail label="Training" value={`${trainingLabel(applicant.training_hours).replace(" hrs", " hours")}`} />
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
                      <Button disabled={slotsFull || pending} loading={pending} size="sm" variant="filled">
                        Hire
                      </Button>
                    </Popconfirm>
                    <Popconfirm
                      onConfirm={() => onDecide(applicant.application_id, "REJECTED")}
                      title={`Reject ${applicant.applicant_number}?`}
                      description="This records a final rejection decision."
                    >
                      <Button disabled={pending} loading={pending} size="sm" variant="danger">
                        Reject
                      </Button>
                    </Popconfirm>
                  </>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
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

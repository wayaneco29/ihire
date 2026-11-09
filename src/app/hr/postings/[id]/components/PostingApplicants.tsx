"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Alert, Button, Popconfirm } from "antd";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
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
};

export function PostingApplicants({
  applicants,
  jobId,
  slots,
}: Readonly<{ applicants: ApplicantItem[]; jobId: string; slots: number }>) {
  const [filter, setFilter] = useState("ALL");
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
  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? applicants
        : applicants.filter(
            (applicant) => applicant.application_status === filter,
          ),
    [applicants, filter],
  );

  function decide(applicationId: string, decision: "HIRED" | "REJECTED") {
    setWorkingId(applicationId);
    startTransition(async () => {
      const result = await recordHiringDecision(applicationId, decision);
      setFeedback(result);
      setWorkingId(null);
    });
  }

  return (
    <section className="mt-7">
      {feedback && (
        <Alert
          className="mb-4"
          message={feedback.message}
          showIcon
          type={feedback.success ? "success" : "error"}
        />
      )}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Applicants</h2>
          <p className="mt-1 text-sm text-muted">
            Identity remains hidden. Review Applicant No. and credibility data.
          </p>
        </div>
        <label className="text-sm font-medium text-ink">
          Filter applicants
          <select
            className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-panel px-3 sm:w-56"
            onChange={(event) => setFilter(event.target.value)}
            value={filter}
          >
            <option value="ALL">All applicants</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_EVALUATION">Under evaluation</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="NOT_QUALIFIED">Not qualified</option>
            <option value="HIRED">Hired</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
      </div>
      {slotsFull && (
        <p className="mb-4 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          All {slots} slots are filled. This posting has been closed
          automatically.
        </p>
      )}
      {filtered.length ? (
        <ul className="grid gap-4">
          {filtered.map((applicant) => {
            const evaluated = ["QUALIFIED", "NOT_QUALIFIED"].includes(
              applicant.application_status,
            );
            const terminal = ["HIRED", "REJECTED"].includes(
              applicant.application_status,
            );
            const pending = isWorking && workingId === applicant.application_id;
            return (
              <li
                className="rounded-2xl border border-line bg-panel p-5 sm:p-6"
                key={applicant.application_id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Applicant number
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-ink">
                      {applicant.applicant_number}
                    </h3>
                  </div>
                  <WorkflowStatusTag status={applicant.application_status} />
                </div>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Credibility
                    label="Education"
                    value={
                      applicant.education_levels?.join(", ") || "Not provided"
                    }
                  />
                  <Credibility
                    label="Experience"
                    value={`${Number(applicant.experience_years ?? 0).toFixed(1)} years`}
                  />
                  <Credibility
                    label="Training"
                    value={`${applicant.training_hours ?? 0} hours`}
                  />
                  <Credibility
                    label="Skills"
                    value={applicant.skills?.join(", ") || "Not provided"}
                  />
                </dl>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {applicant.application_status === "HIRED" && (
                    <Link
                      className="inline-flex min-h-11 items-center rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary-light"
                      href={`/hr/applications/${applicant.application_id}/pds`}
                    >
                      Printable PDS
                    </Link>
                  )}
                  {evaluated && !terminal && (
                    <>
                      <Popconfirm
                        onConfirm={() =>
                          decide(applicant.application_id, "HIRED")
                        }
                        title={`Hire ${applicant.applicant_number}?`}
                        description="This records a final hiring decision and uses one slot."
                      >
                        <Button
                          disabled={slotsFull || pending}
                          loading={pending}
                          type="primary"
                        >
                          Hire {applicant.applicant_number}
                        </Button>
                      </Popconfirm>
                      <Popconfirm
                        onConfirm={() =>
                          decide(applicant.application_id, "REJECTED")
                        }
                        title={`Reject ${applicant.applicant_number}?`}
                        description="This records a final rejection decision."
                      >
                        <Button danger disabled={pending} loading={pending}>
                          Reject {applicant.applicant_number}
                        </Button>
                      </Popconfirm>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-line-strong bg-panel p-8 text-center text-sm text-muted">
          No applicants match this filter.
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {feedback?.message ?? ""}
      </p>
      <span className="sr-only">Posting {jobId}</span>
    </section>
  );
}

function Credibility({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md bg-panel-muted p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

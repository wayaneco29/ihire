"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";

type ReviewDocument = {
  document_id: string;
  document_type: string;
  document_status: string;
  uploaded_at: string;
};

export type ReviewQueueItem = {
  application_id: string;
  applicant_number: string;
  application_status: string;
  applied_at: string;
  jobTitle: string;
  education_levels: string[] | null;
  experience_years: number | null;
  training_hours: number | null;
  skills: string[] | null;
  documents: ReviewDocument[];
  reviewKind: "INITIAL" | "REREVIEW";
};

export function ReviewQueueList({ items }: { items: ReviewQueueItem[] }) {
  const [filter, setFilter] = useState<"ALL" | ReviewQueueItem["reviewKind"]>("ALL");
  const filteredItems = items.filter((item) => filter === "ALL" || item.reviewKind === filter);

  if (!items.length) {
    return (
      <div className="mt-7">
        <EmptyState
          description="New applications and documents that need another review will appear here."
          title="No reviews waiting"
        />
      </div>
    );
  }

  return (
    <>
      <div aria-label="Review queue filters" className="mt-7 flex flex-wrap gap-2" role="group">
        {([
          ["ALL", `All (${items.length})`],
          ["INITIAL", `Initial (${items.filter((item) => item.reviewKind === "INITIAL").length})`],
          ["REREVIEW", `Re-review (${items.filter((item) => item.reviewKind === "REREVIEW").length})`],
        ] as const).map(([value, label]) => (
          <button
            aria-pressed={filter === value}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium transition ${filter === value ? "border-primary bg-primary-light text-primary" : "border-line-strong bg-panel text-muted hover:bg-panel-muted"}`}
            key={value}
            onClick={() => setFilter(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <ul className="mt-4 grid gap-4 xl:grid-cols-2">
      {filteredItems.map((item) => {
        const statusCounts = item.documents.reduce<Record<string, number>>((counts, document) => {
          counts[document.document_status] = (counts[document.document_status] ?? 0) + 1;
          return counts;
        }, {});
        const forReview = statusCounts.FOR_REVIEW ?? 0;

        return (
          <li className="rounded-2xl border border-line bg-panel p-5 sm:p-6" key={item.application_id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{item.applicant_number}</p>
                <h2 className="mt-1 text-lg font-semibold text-ink">{item.jobTitle}</h2>
                <p className="mt-1 text-xs text-muted">Applied {formatDate(item.applied_at)}</p>
                {item.reviewKind === "REREVIEW" && (
                  <p className="mt-2 inline-flex rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
                    Re-review required
                  </p>
                )}
              </div>
              <WorkflowStatusTag status={item.application_status} />
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-panel-muted p-3">
                <dt className="text-xs text-muted">Education</dt>
                <dd className="mt-1 text-sm font-medium text-ink">
                  {item.education_levels?.length ? item.education_levels.join(", ").replaceAll("_", " ") : "Not listed"}
                </dd>
              </div>
              <div className="rounded-xl bg-panel-muted p-3">
                <dt className="text-xs text-muted">Experience</dt>
                <dd className="mt-1 text-sm font-medium text-ink">
                  {item.experience_years ? `${item.experience_years} years` : "None listed"}
                </dd>
              </div>
              <div className="rounded-xl bg-panel-muted p-3">
                <dt className="text-xs text-muted">Training</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{item.training_hours ?? 0} hours</dd>
              </div>
            </dl>

            <div className="mt-4">
              <p className="text-xs font-medium text-muted">Latest document statuses</p>
              {item.documents.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.documents.map((document) => (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink" key={document.document_id}>
                      <span>{document.document_type}</span>
                      <WorkflowStatusTag status={document.document_status} />
                    </span>
                  ))}
                </div>
              ) : <p className="mt-2 text-sm text-muted">No documents uploaded.</p>}
              <p className="mt-2 text-xs text-muted">
                {forReview ? `${forReview} document${forReview === 1 ? "" : "s"} need review` : "Application ready for assessment"}
              </p>
            </div>

            {item.skills?.length ? (
              <p className="mt-4 line-clamp-2 text-sm text-muted">
                <span className="font-medium text-ink">Skills:</span> {item.skills.join(", ")}
              </p>
            ) : null}

            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
              href={`/evaluator/applications/${item.application_id}`}
            >
              Review applicant
            </Link>
          </li>
        );
      })}
      </ul>
      {!filteredItems.length && (
        <div className="mt-4">
          <EmptyState
            description="There are no applications in this queue right now."
            title="Queue is clear"
          />
        </div>
      )}
    </>
  );
}

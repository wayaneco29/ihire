"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { groupSupportingDocuments } from "@/constants/documents";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";
import { createDocumentPreviewUrl } from "../../../documents/actions";

type AnonymizedDocument = {
  document_id: string;
  document_type: string;
  document_status: string;
  uploaded_at: string;
};

type EducationRecord = {
  education_id: string;
  level: string;
  school_name: string | null;
  degree_course: string | null;
  period_from: number | null;
  period_to: number | null;
  highest_level_units_earned: string | null;
  graduate_degree_type: string | null;
  graduate_degree_completed: boolean | null;
  graduate_units_earned: number | null;
  year_graduated: number | null;
  honors_received: string | null;
};

type EducationPoints = {
  applicant_qualification_level: number | null;
  base_qualification_level: number | null;
  education_points: number | null;
};

type TrainingPoints = {
  applicant_training_increment_level: number | null;
  maximum_training_points: number | null;
  minimum_training_increment_level: number | null;
  training_hours: number | null;
  training_points: number | null;
};

type ExperiencePoints = {
  applicant_experience_increment_level: number;
  qualifying_experience_months: number;
  minimum_experience_increment_level: number | null;
  maximum_experience_points: number | null;
  experience_points: number | null;
};

type WorkExperienceRecord = {
  experience_id: string;
  date_from: string;
  date_to: string | null;
  position_title: string;
  agency_company: string;
  appointment_status: string | null;
  is_gov_service: boolean;
  duties_description: string | null;
};

export function AnonymizedApplicantReview({
  applicationId,
  applicantNumber,
  experienceYears,
  trainingHours,
  skills,
  education,
  educationPoints,
  educationPointsUnavailable,
  trainingPoints,
  trainingPointsUnavailable,
  experiencePoints,
  experiencePointsUnavailable,
  qualifyingExperienceLabel,
  workExperience,
  educationUnavailable,
  workExperienceUnavailable,
  documentsUnavailable,
  documents,
}: {
  applicationId: string;
  applicantNumber: string;
  experienceYears: number | null;
  trainingHours: number | null;
  skills: string[] | null;
  education: EducationRecord[];
  educationPoints: EducationPoints | null;
  educationPointsUnavailable: boolean;
  trainingPoints: TrainingPoints | null;
  trainingPointsUnavailable: boolean;
  experiencePoints: ExperiencePoints;
  experiencePointsUnavailable: boolean;
  qualifyingExperienceLabel: string;
  workExperience: WorkExperienceRecord[];
  educationUnavailable: boolean;
  workExperienceUnavailable: boolean;
  documentsUnavailable: boolean;
  documents: AnonymizedDocument[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedDocument, setSelectedDocument] =
    useState<AnonymizedDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewContentType, setPreviewContentType] = useState<string | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"preview" | null>(null);
  const [isPending, startTransition] = useTransition();
  const documentGroups = groupSupportingDocuments(documents);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedDocument && !dialog.open) dialog.showModal();
    if (!selectedDocument && dialog.open) dialog.close();
  }, [selectedDocument]);

  function viewDocument(document: AnonymizedDocument) {
    setSelectedDocument(document);
    setPreviewUrl(null);
    setPreviewContentType(null);
    setFeedback(null);
    setPendingAction("preview");
    startTransition(async () => {
      const result = await createDocumentPreviewUrl({
        applicationId,
        documentId: document.document_id,
      });
      setPendingAction(null);
      if (!result.success || !result.signedUrl) {
        setFeedback(result.message);
        return;
      }
      setPreviewUrl(result.signedUrl);
      setPreviewContentType(result.contentType ?? null);
    });
  }

  return (
    <>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <section className="rounded-sm border border-line bg-panel p-5">
          <p className="text-xs text-muted">Applicant number</p>
          <p className="mt-2 text-lg font-semibold text-primary">
            {applicantNumber}
          </p>
        </section>
        <section className="rounded-sm border border-line bg-panel p-5">
          <p className="text-xs text-muted">Training hours</p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {trainingHours ?? 0}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">
            {trainingPointsUnavailable
              ? "Training score unavailable."
              : trainingPoints?.training_points !== null &&
                  trainingPoints?.training_points !== undefined &&
                  trainingPoints.maximum_training_points !== null &&
                  trainingPoints.minimum_training_increment_level !== null &&
                  trainingPoints.applicant_training_increment_level !== null
                ? `${trainingPoints.training_points} / ${trainingPoints.maximum_training_points} points · increment ${trainingPoints.applicant_training_increment_level} (minimum ${trainingPoints.minimum_training_increment_level})`
                : trainingPoints?.minimum_training_increment_level === null
                  ? "Position minimum training increment is not set."
                  : "Training points not available yet."}
          </p>
        </section>
      </div>

      <section className="mt-5 rounded-sm border border-line bg-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Skills</h2>
            <p className="mt-1 text-sm text-muted">
              Applicant credibility information
            </p>
          </div>
        </div>
        {skills?.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <li
                className="rounded-full bg-primary-light px-3 py-1.5 text-sm text-primary"
                key={skill}
              >
                {skill}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">No skills listed.</p>
        )}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-sm border border-line bg-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">Education</h2>
              <p className="mt-1 text-sm text-muted">
                Schools, programs, attendance, and graduation details
              </p>
            </div>
            <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
              {education.length} record{education.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-4 rounded-sm border border-primary/20 bg-primary-light/40 px-4 py-3">
            <p className="text-xs font-semibold text-primary-dark">
              Education points
            </p>
            <p className="mt-1 text-sm font-medium text-ink">
              {educationPointsUnavailable
                ? "Score unavailable. Refresh the page to try again."
                : educationPoints?.education_points !== null &&
                    educationPoints?.education_points !== undefined &&
                    educationPoints.applicant_qualification_level !== null &&
                    educationPoints.base_qualification_level !== null
                  ? `${educationPoints.education_points} points (education ${educationPoints.applicant_qualification_level} − position standard ${educationPoints.base_qualification_level})`
                  : educationPoints?.base_qualification_level === null
                    ? "The position education standard has not been set."
                    : "Not scored yet. Check the submitted PDS qualification level."}
            </p>
          </div>
          {educationUnavailable ? (
            <p className="mt-5 rounded-sm border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              Education details could not be loaded. Apply the latest Supabase
              migrations, then refresh this page.
            </p>
          ) : education.length ? (
            <ul className="mt-5 space-y-3">
              {education.map((item) => (
                <li
                  className="rounded-sm border border-line-subtle bg-panel-muted p-4"
                  key={item.education_id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {item.school_name || item.level.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {item.degree_course ||
                          item.highest_level_units_earned ||
                          `${item.level.replaceAll("_", " ")} studies`}
                      </p>
                    </div>
                    <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-xs font-medium capitalize text-muted">
                      {item.level.replaceAll("_", " ").toLowerCase()}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-3 border-t border-line-subtle pt-3 sm:grid-cols-2">
                    <DetailValue
                      label="Attendance"
                      value={`${item.period_from ?? "—"} – ${item.period_to ?? "Present"}`}
                    />
                    <DetailValue
                      label="Year graduated"
                      value={item.year_graduated?.toString()}
                    />
                    {item.level === "GRADUATE_STUDIES" && (
                      <DetailValue
                        label="Graduate studies"
                        value={
                          item.graduate_degree_type === "MASTERS"
                            ? item.graduate_degree_completed
                              ? "Master's degree completed"
                              : `Master's studies · ${item.graduate_units_earned ?? 0} units earned`
                            : item.graduate_degree_type === "DOCTORATE"
                              ? item.graduate_degree_completed
                                ? "Doctorate completed"
                                : `Doctorate studies · ${item.graduate_units_earned ?? 0} units earned`
                              : "Not provided"
                        }
                      />
                    )}
                    {item.level !== "GRADUATE_STUDIES" &&
                      item.highest_level_units_earned && (
                        <DetailValue
                          label="Units earned"
                          value={item.highest_level_units_earned}
                        />
                      )}
                    {item.honors_received && (
                      <DetailValue
                        label="Honors"
                        value={item.honors_received}
                      />
                    )}
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-sm bg-panel-muted px-4 py-3 text-sm text-muted">
              No education records listed.
            </p>
          )}
        </section>

        <section className="rounded-sm border border-line bg-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">Work experience</h2>
              <p className="mt-1 text-sm text-muted">
                Employment history and responsibilities
              </p>
            </div>
            <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
              {Number(experienceYears ?? 0).toFixed(1)} years total
            </span>
          </div>
          <div className="mt-4 rounded-sm border border-primary/20 bg-primary-light/40 px-4 py-3">
            <p className="text-xs font-semibold text-primary-dark">
              Qualifying public teaching experience
            </p>
            <p className="mt-1 text-sm font-medium text-ink">
              {qualifyingExperienceLabel} · Level{" "}
              {experiencePoints.applicant_experience_increment_level}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {experiencePointsUnavailable
                ? "Experience score unavailable. Refresh the page to try again."
                : experiencePoints.experience_points !== null &&
                    experiencePoints.maximum_experience_points !== null &&
                    experiencePoints.minimum_experience_increment_level !== null
                  ? `${experiencePoints.experience_points} / ${experiencePoints.maximum_experience_points} points · position minimum Level ${experiencePoints.minimum_experience_increment_level}`
                  : experiencePoints.minimum_experience_increment_level === null
                    ? "The position minimum Experience level has not been set."
                    : "Experience points are not available yet."}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Counts Government Service entries with Teacher, Instructor, or
              Educator in the position title. Overlapping periods count once.
            </p>
          </div>
          {workExperienceUnavailable ? (
            <p className="mt-5 rounded-sm border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              Work experience details could not be loaded. Apply the latest
              Supabase migrations, then refresh this page.
            </p>
          ) : workExperience.length ? (
            <ul className="mt-5 space-y-3">
              {workExperience.map((item) => (
                <li
                  className="rounded-sm border border-line-subtle bg-panel-muted p-4"
                  key={item.experience_id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {item.position_title}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {item.agency_company}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-xs font-medium text-muted">
                      {formatDate(item.date_from, "MMM YYYY")} –{" "}
                      {item.date_to
                        ? formatDate(item.date_to, "MMM YYYY")
                        : "Present"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-muted">
                      {item.is_gov_service
                        ? "Government service"
                        : "Non-government"}
                    </span>
                    {item.appointment_status && (
                      <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-muted">
                        {item.appointment_status}
                      </span>
                    )}
                  </div>
                  {item.duties_description && (
                    <p className="mt-3 whitespace-pre-wrap border-t border-line-subtle pt-3 text-sm leading-6 text-muted">
                      {item.duties_description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-sm bg-panel-muted px-4 py-3 text-sm text-muted">
              No work experience records listed.
            </p>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-sm border border-line bg-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Supporting documents</h2>
            <p className="mt-1 text-sm text-muted">
              Files are labeled only with their document type and applicant
              number.
            </p>
          </div>
          <span className="text-sm text-muted">
            {documents.length} documents
          </span>
        </div>
        {documentsUnavailable ? (
          <p className="mt-4 rounded-sm border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            Supporting documents could not be loaded. Refresh the page to try
            again.
          </p>
        ) : documents.length ? (
          <ul className="mt-4 space-y-3">
            {documentGroups.map((group) => (
              <li
                className="rounded-sm border border-line-subtle bg-panel-muted p-4 sm:p-5"
                key={group.label}
              >
                <h3 className="border-b border-line-subtle pb-3 text-sm font-semibold text-ink">
                  {group.label}
                </h3>
                <ul className="mt-1 divide-y divide-line-subtle">
                  {group.documents.map((document) => (
                    <li
                      className="flex flex-wrap items-center justify-between gap-3 py-4 last:pb-0"
                      key={document.document_id}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-ink">
                          {document.document_type}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Uploaded{" "}
                          {formatDate(
                            document.uploaded_at,
                            "MMM D, YYYY · h:mm A",
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <WorkflowStatusTag status={document.document_status} />
                        <Button
                          disabled={isPending}
                          onClick={() => viewDocument(document)}
                          type="button"
                          variant="ghost"
                        >
                          View
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <EmptyState
              description="The applicant can upload supporting documents from their Documents page."
              title="No supporting documents"
            />
          </div>
        )}
      </section>

      <dialog
        aria-labelledby="document-preview-title"
        className="m-auto max-h-[92dvh] w-[min(96vw,72rem)] overflow-hidden rounded-sm border border-line bg-panel p-0 text-ink shadow-modal backdrop:bg-ink/60"
        onClose={() => setSelectedDocument(null)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setSelectedDocument(null);
        }}
        ref={dialogRef}
      >
        {selectedDocument && (
          <div className="flex max-h-[92dvh] flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-subtle px-5 py-4">
              <div>
                <h2
                  className="font-semibold text-ink"
                  id="document-preview-title"
                >
                  {selectedDocument.document_type}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Applicant {applicantNumber} · Uploaded{" "}
                  {formatDate(
                    selectedDocument.uploaded_at,
                    "MMM D, YYYY · h:mm A",
                  )}
                </p>
              </div>
              <Button
                aria-label="Close document preview"
                className="!border-line-strong !text-ink hover:!bg-panel-muted"
                onClick={() => setSelectedDocument(null)}
                type="button"
                variant="bordered"
              >
                Close
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-panel-muted p-3 sm:p-5">
              {previewUrl ? (
                <div className="grid min-h-64 min-w-0 place-items-center">
                  {previewContentType?.startsWith("image/") ? (
                    <Image
                      alt={`${selectedDocument.document_type} for applicant ${applicantNumber}`}
                      className="h-auto max-h-[min(65dvh,calc(100dvh-15rem))] w-auto max-w-full rounded-sm object-contain"
                      height={1600}
                      unoptimized
                      src={previewUrl}
                      width={1600}
                    />
                  ) : previewContentType === "application/pdf" ? (
                    <iframe
                      className="h-[min(65dvh,calc(100dvh-15rem))] min-h-64 w-full rounded-sm border border-line bg-panel"
                      referrerPolicy="no-referrer"
                      src={previewUrl}
                      title={`${selectedDocument.document_type} document preview`}
                    />
                  ) : (
                    <div className="max-w-md rounded-sm border border-line bg-panel p-5 text-center">
                      <p className="font-medium text-ink">
                        Preview not available for this file type
                      </p>
                      <p className="mt-2 text-sm text-muted">
                        Download the file to review it. Document verification is
                        handled by the Document Reviewer.
                      </p>
                    </div>
                  )}
                  {previewContentType?.startsWith("image/") && (
                    <p className="mt-2 text-xs text-muted">
                      Image scaled to fit the preview. Download to view at full
                      resolution.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid min-h-64 place-items-center rounded-sm border border-dashed border-line-strong bg-panel px-5 text-center">
                  <p className="text-sm text-muted">
                    {pendingAction === "preview"
                      ? "Loading secure document preview…"
                      : (feedback ?? "The preview is not available.")}
                  </p>
                </div>
              )}
              {previewUrl && (
                <a
                  className="mt-3 inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-light"
                  download
                  href={previewUrl}
                >
                  Download document
                </a>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-5 py-4">
              <div aria-live="polite" className="text-sm">
                {feedback && (
                  <p
                    className={
                      feedback === "Document review saved."
                        ? "text-primary"
                        : "text-danger"
                    }
                    role="status"
                  >
                    {feedback}
                  </p>
                )}
              </div>
              <span className="inline-flex min-h-11 items-center gap-2 text-sm text-muted">
                Document status{" "}
                <WorkflowStatusTag status={selectedDocument.document_status} />
              </span>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function DetailValue({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

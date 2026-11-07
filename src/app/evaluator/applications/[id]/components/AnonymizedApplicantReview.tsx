import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { PDS_QUESTIONNAIRE_ITEMS } from "@/constants/pds-questionnaire";
import { formatDate } from "@/utils/format-date";

type QuestionnaireAnswer = {
  question_code: string;
  answer: boolean;
};

type AnonymizedDocument = {
  document_id: string;
  document_type: string;
  document_status: string;
  uploaded_at: string;
};

export function AnonymizedApplicantReview({
  applicantNumber,
  applicationStatus,
  jobTitle,
  educationLevels,
  experienceYears,
  trainingHours,
  skills,
  questionnaire,
  documents,
}: {
  applicantNumber: string;
  applicationStatus: string;
  jobTitle: string;
  educationLevels: string[] | null;
  experienceYears: number | null;
  trainingHours: number | null;
  skills: string[] | null;
  questionnaire: QuestionnaireAnswer[];
  documents: AnonymizedDocument[];
}) {
  const questionLabels = new Map(
    PDS_QUESTIONNAIRE_ITEMS.map((item) => [item.code, item.question] as const),
  );

  return (
    <>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-muted">Applicant number</p>
          <p className="mt-2 text-lg font-semibold text-primary">{applicantNumber}</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-muted">Education level</p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {educationLevels?.length ? educationLevels.join(", ").replaceAll("_", " ") : "Not listed"}
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-muted">Work experience</p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {experienceYears ? `${experienceYears} years` : "None listed"}
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-muted">Training hours</p>
          <p className="mt-2 text-sm font-semibold text-ink">{trainingHours ?? 0}</p>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Skills</h2>
            <p className="mt-1 text-sm text-muted">Applicant credibility information</p>
          </div>
          <WorkflowStatusTag status={applicationStatus} />
        </div>
        {skills?.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <li className="rounded-full bg-primary-light px-3 py-1.5 text-sm text-primary" key={skill}>{skill}</li>
            ))}
          </ul>
        ) : <p className="mt-4 text-sm text-muted">No skills listed.</p>}
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold text-ink">Questionnaire answers</h2>
        <p className="mt-1 text-sm text-muted">PDS items 34–40</p>
        {questionnaire.length ? (
          <ol className="mt-4 divide-y divide-slate-100">
            {questionnaire.map((answer) => {
              const questionCode = answer.question_code as (typeof PDS_QUESTIONNAIRE_ITEMS)[number]["code"];
              return (
                <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between" key={questionCode}>
                  <p className="max-w-4xl text-sm leading-6 text-slate-700">
                    <span className="mr-2 font-semibold text-ink">{questionCode}.</span>
                    {questionLabels.get(questionCode) ?? "Question"}
                  </p>
                  <span className={`shrink-0 text-sm font-semibold ${answer.answer ? "text-amber-800" : "text-primary"}`}>
                    {answer.answer ? "Yes" : "No"}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-muted">No questionnaire answers are available.</p>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Supporting documents</h2>
            <p className="mt-1 text-sm text-muted">Files are labeled only with their document type and applicant number.</p>
          </div>
          <span className="text-sm text-muted">{documents.length} document types</span>
        </div>
        {documents.length ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {documents.map((document) => (
              <li className="flex flex-wrap items-center justify-between gap-3 py-4" key={document.document_id}>
                <div className="min-w-0">
                  <p className="font-medium text-ink">{document.document_type}</p>
                  <p className="mt-1 text-xs text-muted">Uploaded {formatDate(document.uploaded_at, "MMM D, YYYY · h:mm A")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <WorkflowStatusTag status={document.document_status} />
                  <Link className="text-sm font-semibold text-primary hover:text-primary-dark" href={`/evaluator/documents/${document.document_id}`}>
                    Review
                  </Link>
                </div>
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
    </>
  );
}

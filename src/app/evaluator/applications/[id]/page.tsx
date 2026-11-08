import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getEvaluatorContext } from "@/lib/auth/server";
import { ApplicationEvaluationPanel } from "../components/ApplicationEvaluationPanel";
import { buildReviewQueueItems } from "../../reviews/queue";
import { AnonymizedApplicantReview } from "./components/AnonymizedApplicantReview";

export default async function EvaluatorApplicationReviewPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jobId?: string | string[] }>;
}>) {
  const [{ id }, { jobId: requestedJobId }] = await Promise.all([
    params,
    searchParams,
  ]);
  const jobId =
    typeof requestedJobId === "string" &&
    /^[0-9a-f-]{36}$/i.test(requestedJobId)
      ? requestedJobId
      : undefined;
  const evaluator = await getEvaluatorContext();
  if (!evaluator) redirect("/login");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: application, error } = await evaluator.supabase
    .from("v_anonymized_applicants")
    .select(
      "application_id, applicant_number, application_status, job_id, education_levels, experience_years, training_hours, skills",
    )
    .eq("application_id", id)
    .maybeSingle();

  if (error) {
    return (
      <EmptyState
        description="Refresh the page to try loading anonymized applicant information again."
        title="Applicant review unavailable"
      />
    );
  }
  if (!application) notFound();

  const [
    jobResult,
    documentsResult,
    educationResult,
    experienceResult,
    evaluationResult,
    queueApplicantsResult,
  ] = await Promise.all([
    evaluator.supabase
      .from("job_postings")
      .select("title")
      .eq("id", application.job_id)
      .maybeSingle(),
    evaluator.supabase
      .from("v_anonymized_documents")
      .select("document_id, document_type, document_status, uploaded_at")
      .eq("application_id", id)
      .order("uploaded_at", { ascending: false }),
    evaluator.supabase
      .from("v_anonymized_education")
      .select(
        "education_id, level, school_name, degree_course, period_from, period_to, highest_level_units_earned, year_graduated, honors_received",
      )
      .eq("application_id", id)
      .order("sort_order"),
    evaluator.supabase
      .from("v_anonymized_work_experience")
      .select(
        "experience_id, date_from, date_to, position_title, agency_company, appointment_status, is_gov_service, duties_description",
      )
      .eq("application_id", id)
      .order("sort_order"),
    evaluator.supabase
      .from("application_evaluations")
      .select("result, remarks, evaluated_at")
      .eq("application_id", id)
      .eq("evaluator_id", evaluator.user.id)
      .order("evaluated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    jobId && jobId === application.job_id
      ? evaluator.supabase
          .from("v_anonymized_applicants")
          .select(
            "application_id, applicant_number, application_status, applied_at, job_id",
          )
          .eq("job_id", jobId)
          .order("applied_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const queueApplicationIds = (queueApplicantsResult.data ?? []).map(
    (item) => item.application_id,
  );
  const queueDocumentsResult =
    jobId && jobId === application.job_id && queueApplicationIds.length
      ? await evaluator.supabase
          .from("v_anonymized_documents")
          .select(
            "application_id, document_id, document_type, document_status, uploaded_at",
          )
          .order("uploaded_at", { ascending: false })
          .in("application_id", queueApplicationIds)
      : { data: [], error: null };

  const queueApplicants = (queueApplicantsResult.data ?? []).map((item) => ({
    ...item,
    job_id: item.job_id,
  }));
  const queueItems =
    queueApplicantsResult.error || queueDocumentsResult.error
      ? []
      : buildReviewQueueItems(
          queueApplicants,
          queueDocumentsResult.data ?? [],
          new Map(),
        );
  const applicantPositions = new Map(
    queueApplicants.map((item, index) => [item.application_id, index] as const),
  );
  const currentQueueIndex = queueItems.findIndex(
    (item) => item.application_id === id,
  );
  const currentApplicantIndex = applicantPositions.get(id) ?? -1;
  const previousPendingApplicants = queueItems.filter(
    (item) =>
      (applicantPositions.get(item.application_id) ?? -1) <
      currentApplicantIndex,
  );
  const previousApplicant =
    previousPendingApplicants[previousPendingApplicants.length - 1] ?? null;
  const nextApplicant =
    currentApplicantIndex >= 0
      ? (queueItems.find(
          (item) =>
            (applicantPositions.get(item.application_id) ?? -1) >
            currentApplicantIndex,
        ) ?? null)
      : (queueItems[0] ?? null);

  return (
    <>
      <PageHeader
        description={jobResult.data?.title ?? "Application review"}
        eyebrow="Anonymized applicant review"
        title={application.applicant_number}
      />
      {jobId === application.job_id && (
        <nav
          aria-label="Applicant review sequence"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel p-4"
        >
          <Link
            className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary-light"
            href={`/evaluator/reviews?jobId=${jobId}`}
          >
            Back to applicants
          </Link>
          {queueApplicantsResult.error || queueDocumentsResult.error ? (
            <p className="text-sm text-warning">
              Queue navigation is temporarily unavailable.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                {currentQueueIndex >= 0
                  ? `Applicant ${currentQueueIndex + 1} of ${queueItems.length}`
                  : `${queueItems.length} applicant${queueItems.length === 1 ? "" : "s"} still pending`}
              </p>
              <div className="flex items-center gap-2">
                {previousApplicant ? (
                  <Link
                    className="inline-flex min-h-10 items-center rounded-lg border border-line-strong px-3 text-sm font-semibold text-ink hover:bg-panel-muted"
                    href={`/evaluator/applications/${previousApplicant.application_id}?jobId=${jobId}`}
                  >
                    Previous
                  </Link>
                ) : null}
                {nextApplicant ? (
                  <Link
                    className="inline-flex min-h-10 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary hover:bg-primary-dark"
                    href={`/evaluator/applications/${nextApplicant.application_id}?jobId=${jobId}`}
                  >
                    Next applicant
                  </Link>
                ) : null}
              </div>
            </>
          )}
        </nav>
      )}
      <AnonymizedApplicantReview
        applicationId={id}
        applicantNumber={application.applicant_number}
        applicationStatus={application.application_status}
        documentsUnavailable={Boolean(documentsResult.error)}
        documents={documentsResult.data ?? []}
        educationUnavailable={Boolean(educationResult.error)}
        education={educationResult.data ?? []}
        experienceYears={application.experience_years}
        workExperienceUnavailable={Boolean(experienceResult.error)}
        workExperience={experienceResult.data ?? []}
        skills={application.skills}
        trainingHours={application.training_hours}
      />
      <div className="mt-5">
        <ApplicationEvaluationPanel
          applicationId={id}
          applicationStatus={application.application_status}
          previousEvaluation={evaluationResult.data ?? null}
        />
      </div>
      <Link
        className="mt-5 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-light hover:text-primary-dark"
        href={
          jobId === application.job_id
            ? `/evaluator/reviews?jobId=${jobId}`
            : "/evaluator/reviews"
        }
      >
        Back to {jobId === application.job_id ? "applicants" : "review queue"}
      </Link>
    </>
  );
}

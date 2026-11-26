import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ApplicationCriteriaPoints,
  ApplicationProvisionalTotal,
} from "@/components/application/ApplicationCriteriaPoints";
import type { ApplicationCriterionPointsRow } from "@/types/application-criterion-points";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getEvaluatorContext } from "@/lib/auth/server";
import {
  calculatePublicTeachingExperience,
  formatExperienceMonths,
} from "@/utils/calculate-public-teaching-experience";
import { buildApplicationCriterionPoints } from "@/utils/build-application-criterion-points";
import { formatPositionLabel } from "@/utils/format-position-track";
import { ApplicationEvaluationPanel } from "../components/ApplicationEvaluationPanel";
import { ApplicationAssessmentScheduleForm } from "../components/ApplicationAssessmentScheduleForm";
import { ApplicationCriterionScoresForm } from "../components/ApplicationCriterionScoresForm";
import {
  REVIEW_QUEUE_PAGE_SIZE,
  reviewQueueHref,
  reviewQueueStatus,
} from "../../reviews/queue";
import { AnonymizedApplicantReview } from "./components/AnonymizedApplicantReview";

export default async function EvaluatorApplicationReviewPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    jobId?: string | string[];
    page?: string | string[];
    status?: string | string[];
  }>;
}>) {
  const [
    { id },
    { jobId: requestedJobId, page: requestedPage, status: requestedStatus },
  ] = await Promise.all([params, searchParams]);
  const jobId =
    typeof requestedJobId === "string" &&
    /^[0-9a-f-]{36}$/i.test(requestedJobId)
      ? requestedJobId
      : undefined;
  const parsedPage =
    typeof requestedPage === "string" ? Number(requestedPage) : 1;
  const queuePage =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const selectedStatus = reviewQueueStatus(
    typeof requestedStatus === "string" ? requestedStatus : undefined,
  );
  const evaluator = await getEvaluatorContext();
  if (!evaluator) redirect("/");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: application, error } = await evaluator.supabase
    .from("v_anonymized_applicants")
    .select(
      "application_id, applicant_number, application_status, job_id, experience_years, training_hours, skills, position_title, position_track",
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

  const { data: schedule, error: scheduleError } = await evaluator.supabase
    .from("applications")
    .select("scheduled_assessment_at, position_id")
    .eq("id", id)
    .maybeSingle();

  const [
    jobResult,
    jobPositionsResult,
    requiredTypesResult,
    documentsResult,
    educationResult,
    scoringResult,
    experienceResult,
    evaluationResult,
    criterionScoresResult,
    queueApplicantsResult,
    allAssignedApplicationsResult,
  ] = await Promise.all([
    evaluator.supabase
      .from("job_postings")
      .select("title")
      .eq("id", application.job_id)
      .maybeSingle(),
    evaluator.supabase
      .from("job_posting_positions")
      .select("position_id, weight_profile_id, minimum_total_points")
      .eq("job_id", application.job_id),
    evaluator.supabase
      .from("document_types")
      .select("name")
      .eq("is_required", true),
    evaluator.supabase
      .from("v_anonymized_documents")
      .select("document_id, document_type, document_status, uploaded_at")
      .eq("application_id", id)
      .order("uploaded_at", { ascending: false }),
    evaluator.supabase
      .from("v_anonymized_education")
      .select(
        "education_id, level, school_name, degree_course, period_from, period_to, highest_level_units_earned, graduate_degree_type, graduate_degree_completed, graduate_units_earned, year_graduated, honors_received",
      )
      .eq("application_id", id)
      .order("sort_order"),
    evaluator.supabase
      .from("v_application_scoring")
      .select("criterion_key, applicant_level, minimum_level, maximum_points, points, matched_threshold")
      .eq("application_id", id),
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
      .order("evaluated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    evaluator.supabase
      .from("application_criterion_scores")
      .select(
        "criterion_id, points, criterion:position_criteria(criterion_key, title)",
      )
      .eq("application_id", id),
    jobId && jobId === application.job_id
      ? evaluator.supabase
          .from("v_evaluator_review_queue_with_scored")
          .select(
            "application_id, applicant_number, application_status, applied_at, job_id, job_title, position_title, position_track, review_kind",
          )
          .eq("job_id", jobId)
          .order("applied_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    jobId && jobId === application.job_id
      ? evaluator.supabase
          .from("applications")
          .select("id, applied_at")
          .eq("job_id", jobId)
          .order("applied_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const linkedPositionIds = (jobPositionsResult.data ?? []).map(
    (jobPosition) => jobPosition.position_id,
  );
  const resolvedPositionId =
    schedule?.position_id ??
    (linkedPositionIds.length === 1 ? linkedPositionIds[0] : null);
  const jobPosition = (jobPositionsResult.data ?? []).find(
    (item) => item.position_id === resolvedPositionId,
  );
  const criterionWeightsResult = jobPosition
    ? await evaluator.supabase
        .from("position_criterion_weights")
        .select("criterion_id, points")
        .eq("profile_id", jobPosition.weight_profile_id)
    : { data: [], error: null };
  const criterionIds = (criterionWeightsResult.data ?? []).map(
    (weight) => weight.criterion_id,
  );
  const criteriaResult = criterionIds.length
    ? await evaluator.supabase
        .from("position_criteria")
        .select("id, criterion_key, title, display_order")
        .in("id", criterionIds)
        .order("display_order")
    : { data: [], error: null };

  const latestDocumentStatusByType = new Map<string, string>();
  for (const document of documentsResult.data ?? []) {
    if (!latestDocumentStatusByType.has(document.document_type)) {
      latestDocumentStatusByType.set(
        document.document_type,
        document.document_status,
      );
    }
  }
  const requiredDocumentsVerified =
    !requiredTypesResult.error &&
    !documentsResult.error &&
    (requiredTypesResult.data ?? []).every(
      (documentType) =>
        latestDocumentStatusByType.get(documentType.name) === "VERIFIED",
    );
  const readyForAssessment =
    application.application_status === "ASSESSMENT_SCHEDULED" &&
    Boolean(schedule?.scheduled_assessment_at) &&
    requiredDocumentsVerified;
  const readyForEvaluation = ["ASSESSMENT_SCORED", "QUALIFIED"].includes(
    application.application_status,
  );
  const publicTeachingExperience = calculatePublicTeachingExperience(
    experienceResult.data ?? [],
  );
  const automaticScores = scoringResult.data ?? [];
  const educationPointsResult = automaticScores.find((row) => row.criterion_key === "EDUCATION");
  const trainingPointsResult = automaticScores.find((row) => row.criterion_key === "TRAINING");
  const experiencePointsResult = automaticScores.find((row) => row.criterion_key === "EXPERIENCE");
  const experiencePointsUnavailable = Boolean(experienceResult.error || scoringResult.error);
  const experiencePoints = experiencePointsResult?.points ?? null;

  const criteriaUnavailable = Boolean(
    jobPositionsResult.error ||
      !jobPosition ||
      criterionWeightsResult.error ||
      criteriaResult.error,
  );
  const criteriaUnavailableMessage =
    jobPositionsResult.error ||
    criterionWeightsResult.error ||
    criteriaResult.error
      ? "Criteria points are unavailable right now. Refresh the page to try again."
      : "Criteria points are unavailable because this application has no linked position scoring profile.";
  const criterionRows: ApplicationCriterionPointsRow[] =
    buildApplicationCriterionPoints({
      criteria: criteriaResult.data ?? [],
      weights: criterionWeightsResult.data ?? [],
      scores: criterionScoresResult.data ?? [],
      educationPoints: educationPointsResult ? { education_points: educationPointsResult.points } : null,
      educationUnavailable: Boolean(educationResult.error || scoringResult.error),
      trainingPoints: trainingPointsResult ? { training_hours: application.training_hours, training_points: trainingPointsResult.points } : null,
      trainingUnavailable: Boolean(scoringResult.error),
      experiencePoints: {
        points: experiencePoints,
      },
      experienceUnavailable: experiencePointsUnavailable,
      scoresUnavailable: Boolean(criterionScoresResult.error),
    });
  const automaticCriterionKeys = new Set(["EDUCATION", "TRAINING", "EXPERIENCE"]);
  const manualCriteria = (criteriaResult.data ?? [])
    .filter((criterion) => !automaticCriterionKeys.has(criterion.criterion_key))
    .map((criterion) => ({
      id: criterion.id,
      criterionKey: criterion.criterion_key,
      title: criterion.title,
      maxPoints: Number(criterionWeightsResult.data?.find((weight) => weight.criterion_id === criterion.id)?.points ?? 0),
    }));
  const existingScores = Object.fromEntries(
    (criterionScoresResult.data ?? []).map((score) => [score.criterion_id, Number(score.points)]),
  );
  const assessmentScoresReady =
    !criterionScoresResult.error &&
    manualCriteria.length > 0 && manualCriteria.every((criterion) => existingScores[criterion.id] != null);

  const queueItems = queueApplicantsResult.error
    ? []
    : (queueApplicantsResult.data ?? []).filter(
        (item) => !selectedStatus || item.application_status === selectedStatus,
      );
  const applicantPositions = new Map(
    (allAssignedApplicationsResult.data ?? []).map(
      (item, index) => [item.id, index] as const,
    ),
  );
  const queueItemPositions = new Map(
    queueItems.map((item, index) => [item.application_id, index] as const),
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
  const reviewPageFor = (applicationId: string) =>
    Math.floor(
      (queueItemPositions.get(applicationId) ?? 0) / REVIEW_QUEUE_PAGE_SIZE,
    ) + 1;

  return (
    <>
      <PageHeader
        description={`${jobResult.data?.title ?? "Application review"} · ${
          application.position_title
            ? formatPositionLabel(
                application.position_title,
                application.position_track ?? "",
              )
            : "Position not recorded"
        }`}
        eyebrow="Anonymized applicant review"
        title={application.applicant_number}
        backHref={
          jobId === application.job_id
            ? reviewQueueHref(jobId, queuePage, selectedStatus)
            : "/evaluator/reviews"
        }
        backLabel={
          jobId === application.job_id ? "Back to applicants" : "Review queue"
        }
      />
      <section
        aria-label="Application status"
        className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-primary/30 bg-primary-light p-4 sm:p-5"
      >
        <div>
          <p className="text-xs font-semibold text-primary">
            Application status
          </p>
        </div>
        <WorkflowStatusTag status={application.application_status} />
      </section>
      {jobId === application.job_id && (
        <nav
          aria-label="Applicant review sequence"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-panel p-4"
        >
          {queueApplicantsResult.error ||
          allAssignedApplicationsResult.error ? (
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
                    className="inline-flex min-h-11 items-center rounded-sm border border-line-strong px-3 text-sm font-semibold text-ink hover:bg-panel-muted"
                    href={`/evaluator/applications/${previousApplicant.application_id}?jobId=${jobId}&page=${reviewPageFor(previousApplicant.application_id)}${selectedStatus ? `&status=${selectedStatus}` : ""}`}
                  >
                    Previous
                  </Link>
                ) : null}
                {nextApplicant ? (
                  <Link
                    className="inline-flex min-h-11 items-center rounded-sm bg-primary px-3 text-sm font-semibold text-on-primary hover:bg-primary-dark"
                    href={`/evaluator/applications/${nextApplicant.application_id}?jobId=${jobId}&page=${reviewPageFor(nextApplicant.application_id)}${selectedStatus ? `&status=${selectedStatus}` : ""}`}
                  >
                    Next applicant
                  </Link>
                ) : null}
              </div>
            </>
          )}
        </nav>
      )}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,0.8fr)]">
        <section className="rounded-sm border border-line bg-panel p-5 sm:p-6">
          <ApplicationCriteriaPoints
            description="Current applicant points out of the maximum for each criterion."
            rows={criterionRows}
            unavailable={criteriaUnavailable}
            unavailableMessage={criteriaUnavailableMessage}
          />
        </section>
        <div className="rounded-sm border border-line bg-panel">
          <ApplicationProvisionalTotal
            note="This total includes points currently available; unscored or unavailable criteria are excluded."
            rows={criterionRows}
            title="Current total"
            unavailable={criteriaUnavailable}
          />
        </div>
      </div>
      <AnonymizedApplicantReview
        applicationId={id}
        applicantNumber={application.applicant_number}
        documentsUnavailable={Boolean(documentsResult.error)}
        documents={documentsResult.data ?? []}
        educationUnavailable={Boolean(educationResult.error)}
        education={educationResult.data ?? []}
        experienceIncrementLevel={publicTeachingExperience.incrementLevel}
        qualifyingExperienceLabel={formatExperienceMonths(
          publicTeachingExperience.qualifyingMonths,
        )}
        experienceYears={application.experience_years}
        workExperienceUnavailable={Boolean(experienceResult.error)}
        workExperience={experienceResult.data ?? []}
        skills={application.skills}
      />
      <div className="mt-5">
        <ApplicationAssessmentScheduleForm
          applicationId={id}
          applicationStatus={application.application_status}
          scheduleUnavailable={Boolean(scheduleError || !schedule)}
          scheduledAt={schedule?.scheduled_assessment_at ?? null}
        />
      </div>
      {requiredDocumentsVerified && Boolean(schedule?.scheduled_assessment_at) &&
      ["ASSESSMENT_SCHEDULED", "ASSESSMENT_SCORED"].includes(application.application_status) && (
        <div className="mt-5">
          <ApplicationCriterionScoresForm
            applicationId={id}
            applicationStatus={application.application_status}
            returnHref={`/evaluator/applications/${id}${jobId ? `?jobId=${jobId}` : ""}`}
            criteria={manualCriteria}
            existingScores={existingScores}
            scoresUnavailable={criteriaUnavailable || Boolean(criterionScoresResult.error)}
          />
        </div>
      )}
      {application.application_status === "NOT_QUALIFIED" && jobPosition?.minimum_total_points != null && (
        <p className="mt-5 rounded-sm border border-danger/30 bg-danger/5 p-4 text-sm text-danger" role="status">
          This application was automatically disqualified after all criteria were scored because the total is below the {jobPosition.minimum_total_points} point minimum.
        </p>
      )}
      {readyForEvaluation &&
      assessmentScoresReady ? (
        <div className="mt-5">
          <ApplicationEvaluationPanel
            applicationId={id}
            applicationStatus={application.application_status}
            previousEvaluation={evaluationResult.data ?? null}
          />
        </div>
      ) : (
        <p className="mt-5 rounded-sm border border-line bg-panel-muted p-4 text-sm text-muted">
          The evaluator decision will appear after every configured criterion has points and all required documents are verified.
        </p>
      )}
    </>
  );
}

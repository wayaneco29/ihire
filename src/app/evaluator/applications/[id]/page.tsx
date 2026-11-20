import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getEvaluatorContext } from "@/lib/auth/server";
import {
  calculatePublicTeachingExperience,
  formatExperienceMonths,
} from "@/utils/calculate-public-teaching-experience";
import { formatPositionLabel } from "@/utils/format-position-track";
import { formatPhilippineDateTime } from "@/utils/philippine-time";
import { ApplicationEvaluationPanel } from "../components/ApplicationEvaluationPanel";
import { ApplicationAssessmentScheduleForm } from "../components/ApplicationAssessmentScheduleForm";
import { REVIEW_QUEUE_PAGE_SIZE, reviewQueueHref, reviewQueueStatus } from "../../reviews/queue";
import { AnonymizedApplicantReview } from "./components/AnonymizedApplicantReview";

export default async function EvaluatorApplicationReviewPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jobId?: string | string[]; page?: string | string[]; status?: string | string[] }>;
}>) {
  const [{ id }, { jobId: requestedJobId, page: requestedPage, status: requestedStatus }] = await Promise.all([
    params,
    searchParams,
  ]);
  const jobId =
    typeof requestedJobId === "string" &&
    /^[0-9a-f-]{36}$/i.test(requestedJobId)
      ? requestedJobId
      : undefined;
  const parsedPage =
    typeof requestedPage === "string" ? Number(requestedPage) : 1;
  const queuePage =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const selectedStatus = reviewQueueStatus(typeof requestedStatus === "string" ? requestedStatus : undefined);
  const evaluator = await getEvaluatorContext();
  if (!evaluator) redirect("/");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: application, error } = await evaluator.supabase
    .from("v_anonymized_applicants")
    .select(
      "application_id, applicant_number, application_status, job_id, education_levels, experience_years, training_hours, skills, position_title, position_track",
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
    .select("scheduled_assessment_at")
    .eq("id", id)
    .maybeSingle();

  const [
    jobResult,
    requiredTypesResult,
    documentsResult,
    educationResult,
    educationPointsResult,
    trainingPointsResult,
    experienceStandardsResult,
    experienceResult,
    evaluationResult,
    queueApplicantsResult,
    allAssignedApplicationsResult,
  ] = await Promise.all([
    evaluator.supabase
      .from("job_postings")
      .select("title")
      .eq("id", application.job_id)
      .maybeSingle(),
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
      .from("v_anonymized_application_education_points")
      .select(
        "applicant_qualification_level, base_qualification_level, education_points",
      )
      .eq("application_id", id)
      .maybeSingle(),
    evaluator.supabase
      .from("v_anonymized_application_training_points")
      .select(
        "training_hours, applicant_training_increment_level, minimum_training_increment_level, training_points, maximum_training_points",
      )
      .eq("application_id", id)
      .maybeSingle(),
    evaluator.supabase
      .from("v_anonymized_application_experience_standards")
      .select(
        "position_id, minimum_experience_increment_level, maximum_experience_points",
      )
      .eq("application_id", id)
      .maybeSingle(),
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
  const readyForEvaluation =
    application.position_track === "TEACHING"
      ? ["ASSESSMENT_SCORED", "QUALIFIED", "NOT_QUALIFIED"].includes(
          application.application_status,
        )
      : readyForAssessment || Boolean(evaluationResult.data);
  const submittedAssessment =
    application.position_track === "TEACHING" &&
    ["ASSESSMENT_SCORED", "QUALIFIED", "NOT_QUALIFIED"].includes(
      application.application_status,
    )
      ? await evaluator.supabase
          .from("application_criterion_scores")
          .select("points, criterion:position_criteria(criterion_key, title)")
          .eq("application_id", id)
      : { data: [], error: null };
  const submittedAssessmentScores = (submittedAssessment.data ?? []).filter(
    (score) =>
      score.criterion?.criterion_key === "CLASSROOM_OBSERVATION" ||
      score.criterion?.criterion_key === "TEACHER_REFLECTION",
  );
  const assessmentScoresReady =
    !submittedAssessment.error && submittedAssessmentScores.length === 2;

  const publicTeachingExperience = calculatePublicTeachingExperience(
    experienceResult.data ?? [],
  );
  const experienceStandards = experienceStandardsResult.data;
  const experiencePointsResult =
    experienceStandards?.position_id &&
    experienceStandards.minimum_experience_increment_level !== null &&
    experienceStandards.maximum_experience_points !== null
      ? await evaluator.supabase.rpc("experience_equivalent_points", {
          p_position_id: experienceStandards.position_id,
          p_applicant_level: publicTeachingExperience.incrementLevel,
          p_maximum_points: experienceStandards.maximum_experience_points,
        })
      : { data: null, error: null };
  const experiencePointsUnavailable = Boolean(
    experienceResult.error ||
      experienceStandardsResult.error ||
      experiencePointsResult.error,
  );
  const experiencePoints = {
    applicant_experience_increment_level:
      publicTeachingExperience.incrementLevel,
    qualifying_experience_months: publicTeachingExperience.qualifyingMonths,
    minimum_experience_increment_level:
      experienceStandards?.minimum_experience_increment_level ?? null,
    maximum_experience_points:
      experienceStandards?.maximum_experience_points ?? null,
    experience_points: experiencePointsResult.data,
  };

  const queueItems = queueApplicantsResult.error
    ? []
    : (queueApplicantsResult.data ?? []).filter(
        (item) => !selectedStatus || item.application_status === selectedStatus,
      );
  const applicantPositions = new Map(
    (allAssignedApplicationsResult.data ?? []).map((item, index) => [
      item.id,
      index,
    ] as const),
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
      />
      <section
        aria-label="Application status"
        className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-primary/30 bg-primary-light p-4 sm:p-5"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Application status
          </p>
          {application.application_status === "ASSESSMENT_SCHEDULED" &&
            schedule?.scheduled_assessment_at && (
              <p className="mt-1 text-sm font-medium text-ink">
                Assessment:{" "}
                {formatPhilippineDateTime(schedule.scheduled_assessment_at)}
              </p>
            )}
        </div>
        <WorkflowStatusTag status={application.application_status} />
      </section>
      {jobId === application.job_id && (
        <nav
          aria-label="Applicant review sequence"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-panel p-4"
        >
          <Link
          className="inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-light"
            href={reviewQueueHref(jobId, queuePage, selectedStatus)}
          >
            Back to applicants
          </Link>
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
      <AnonymizedApplicantReview
        applicationId={id}
        applicantNumber={application.applicant_number}
        documentsUnavailable={Boolean(documentsResult.error)}
        documents={documentsResult.data ?? []}
        educationUnavailable={Boolean(educationResult.error)}
        education={educationResult.data ?? []}
        educationPoints={educationPointsResult.data}
        educationPointsUnavailable={Boolean(educationPointsResult.error)}
        trainingPoints={trainingPointsResult.data}
        trainingPointsUnavailable={Boolean(trainingPointsResult.error)}
        experiencePoints={experiencePoints}
        experiencePointsUnavailable={experiencePointsUnavailable}
        qualifyingExperienceLabel={formatExperienceMonths(
          publicTeachingExperience.qualifyingMonths,
        )}
        experienceYears={application.experience_years}
        workExperienceUnavailable={Boolean(experienceResult.error)}
        workExperience={experienceResult.data ?? []}
        skills={application.skills}
        trainingHours={application.training_hours}
      />
      <div className="mt-5">
        <ApplicationAssessmentScheduleForm
          applicationId={id}
          applicationStatus={application.application_status}
          scheduleUnavailable={Boolean(scheduleError || !schedule)}
          scheduledAt={schedule?.scheduled_assessment_at ?? null}
        />
      </div>
      {application.position_track === "TEACHING" &&
        ["ASSESSMENT_SCORED", "QUALIFIED", "NOT_QUALIFIED"].includes(
          application.application_status,
        ) && (
          <section className="mt-5 rounded-sm border border-line bg-panel p-5 sm:p-6">
            <h2 className="font-semibold text-ink">Submitted assessment points</h2>
            {submittedAssessment.error ? (
              <p className="mt-3 text-sm text-danger">Scores could not be loaded. Refresh before making a decision.</p>
            ) : (
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {submittedAssessmentScores.map((score) => (
                  <div key={score.criterion!.criterion_key}>
                    <dt className="text-sm text-muted">{score.criterion!.title}</dt>
                    <dd className="mt-1 text-lg font-semibold text-ink">{score.points} points</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}
      {readyForEvaluation &&
      (application.position_track !== "TEACHING" || assessmentScoresReady) ? (
        <div className="mt-5">
          <ApplicationEvaluationPanel
            applicationId={id}
            applicationStatus={application.application_status}
            previousEvaluation={evaluationResult.data ?? null}
          />
        </div>
      ) : (
        <p className="mt-5 rounded-sm border border-line bg-panel-muted p-4 text-sm text-muted">
          {application.position_track === "TEACHING"
            ? "The evaluator decision will appear after both assessment scores are submitted."
            : "The evaluation panel will appear after all required documents are verified and an assessment has been scheduled."}
        </p>
      )}
      <Link
        className="mt-5 inline-flex min-h-11 items-center rounded-sm px-2 text-sm font-semibold text-primary hover:bg-primary-light hover:text-primary-dark"
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

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getApplicantContext } from "@/lib/auth/server";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import {
  calculatePublicTeachingExperience,
  formatExperienceMonths,
} from "@/utils/calculate-public-teaching-experience";
import { calculateApplicantTrainingHours } from "@/utils/calculate-applicant-training-hours";
import { formatPositionTrack } from "@/utils/format-position-track";
import { formatPhilippineDateTime } from "@/utils/philippine-time";
import { isDocumentComplianceRejection } from "@/utils/application-resubmission";
import {
  ApplicationProvisionalTotal,
  ApplicationCriteriaPoints,
} from "@/components/application/ApplicationCriteriaPoints";
import type { ApplicationCriterionPointsRow } from "@/types/application-criterion-points";
import {
  ApplicationTimeline,
  type ApplicationEvent,
} from "./components/ApplicationTimeline";

export default async function ApplicantApplicationDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: application, error } = await applicant.supabase
    .from("applications")
    .select(
      "id, job_id, position_id, pds_version_id, status, status_reason, applied_at, scheduled_assessment_at",
    )
    .eq("id", id)
    .eq("applicant_id", applicant.applicant.id)
    .maybeSingle();

  if (error) {
    return (
      <EmptyState
        description="Refresh the page to try loading this application again."
        title="Application details unavailable"
      />
    );
  }
  if (!application) notFound();

  const [
    { data: job },
    { data: evaluations },
    { data: decision },
    { data: position, error: positionError },
  ] = await Promise.all([
    applicant.supabase
      .from("job_postings")
      .select("title, description, requirements, slots, deadline, status")
      .eq("id", application.job_id)
      .maybeSingle(),
    applicant.supabase
      .from("application_evaluations")
      .select("id, result, remarks, evaluated_at")
      .eq("application_id", application.id)
      .order("evaluated_at", { ascending: true }),
    applicant.supabase
      .from("hiring_decisions")
      .select("decision, decided_at")
      .eq("application_id", application.id)
      .maybeSingle(),
    application.position_id
      ? applicant.supabase
          .from("positions")
          .select(
            "title, base_qualification_level, base_training_increment_level, base_experience_increment_level, application_type(name)",
          )
          .eq("id", application.position_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (positionError) {
    return (
      <EmptyState
        description="Refresh the page to try loading this application again."
        title="Application details unavailable"
      />
    );
  }

  const canResubmit =
    isDocumentComplianceRejection(
      application.status,
      application.status_reason,
    ) &&
    job !== null &&
    job.status === "OPEN" &&
    (!job.deadline || Date.parse(job.deadline) > Date.now());

  const [
    { data: jobPositions, error: jobPositionError },
    { data: certificateType, error: certificateTypeError },
    learningResult,
    educationResult,
    workExperienceResult,
  ] = await Promise.all([
    applicant.supabase
      .from("job_posting_positions")
      .select("position_id, weight_profile_id")
      .eq("job_id", application.job_id),
    applicant.supabase
      .from("document_types")
      .select("id")
      .eq("name", "Training and Seminar Certificates")
      .maybeSingle(),
    applicant.supabase
      .from("pds_learning_development")
      .select("id, hours")
      .eq("pds_version_id", application.pds_version_id),
    applicant.supabase
      .from("pds_education")
      .select("qualification_level")
      .eq("pds_version_id", application.pds_version_id),
    applicant.supabase
      .from("pds_work_experience")
      .select("date_from, date_to, is_gov_service, position_title")
      .eq("pds_version_id", application.pds_version_id),
  ]);

  const linkedPositionIds = (jobPositions ?? []).map(
    (jobPosition) => jobPosition.position_id,
  );
  const resolvedPositionId =
    application.position_id ??
    (linkedPositionIds.length === 1 ? linkedPositionIds[0] : null);
  let resolvedPosition = position;
  let resolvedPositionUnavailable = false;
  if (application.position_id === null && resolvedPositionId) {
    const resolvedPositionResult = await applicant.supabase
      .from("positions")
      .select(
        "id, title, base_qualification_level, base_training_increment_level, base_experience_increment_level, application_type(name)",
      )
      .eq("id", resolvedPositionId)
      .maybeSingle();
    resolvedPosition = resolvedPositionResult.data;
    resolvedPositionUnavailable = Boolean(resolvedPositionResult.error);
  }
  const applicantQualificationLevel = (educationResult.data ?? []).reduce<
    number | null
  >(
    (highest, education) =>
      education.qualification_level !== null &&
      (highest === null || education.qualification_level > highest)
        ? education.qualification_level
        : highest,
    null,
  );
  const publicTeachingExperience = calculatePublicTeachingExperience(
    workExperienceResult.data ?? [],
  );
  let trainingHours: number | null = null;
  let trainingUnavailable =
    Boolean(certificateTypeError || !certificateType) ||
    Boolean(learningResult.error);
  if (!trainingUnavailable && certificateType) {
    const certificatesResult = await applicant.supabase
      .from("documents")
      .select(
        "id, training_hours, ocr_training_hours, pds_learning_development_id, replaces_document_id, uploaded_at, version",
      )
      .eq("applicant_id", applicant.applicant.id)
      .eq("document_type_id", certificateType.id)
      .order("uploaded_at", { ascending: false })
      .order("version", { ascending: false });
    if (certificatesResult.error) {
      trainingUnavailable = true;
    } else {
      const certificateIds = (certificatesResult.data ?? []).map(
        (certificate) => certificate.id,
      );
      const trainingReviewsResult = certificateIds.length
        ? await applicant.supabase
            .from("document_reviews")
            .select(
              "id, document_id, status, confirmed_training_hours, reviewed_at",
            )
            .in("document_id", certificateIds)
            .order("reviewed_at", { ascending: false })
            .order("id", { ascending: false })
        : { data: [], error: null };
      if (trainingReviewsResult.error) {
        trainingUnavailable = true;
      } else {
        trainingHours = calculateApplicantTrainingHours(
          learningResult.data ?? [],
          certificatesResult.data ?? [],
          trainingReviewsResult.data ?? [],
        );
      }
    }
  }

  const jobPosition = jobPositions?.find(
    (jobPosition) => jobPosition.position_id === resolvedPositionId,
  );
  let criteriaUnavailable = Boolean(jobPositionError || !jobPosition);
  const criteriaUnavailableMessage = jobPositionError
    ? "Criteria points are unavailable right now. Refresh the page to try again."
    : application.position_id === null && linkedPositionIds.length > 1
      ? "The position was not saved with this application. Please contact HR to verify it; you do not need to reapply."
      : jobPositions?.length
        ? "The saved position is no longer linked to this job. Contact HR to confirm the scoring profile."
        : "This job has no scoring profile configured yet. Contact HR for assistance.";
  let criteriaRows: ApplicationCriterionPointsRow[] = [];
  if (!criteriaUnavailable && jobPosition) {
    const weightsResult = await applicant.supabase
      .from("position_criterion_weights")
      .select("criterion_id, points")
      .eq("profile_id", jobPosition.weight_profile_id);
    if (weightsResult.error) {
      criteriaUnavailable = true;
    } else {
      const weights = weightsResult.data ?? [];
      const criterionIds = weights.map((weight) => weight.criterion_id);
      const [criteriaResult, scoresResult] = await Promise.all([
        criterionIds.length
          ? applicant.supabase
              .from("position_criteria")
              .select("id, criterion_key, title, display_order")
              .in("id", criterionIds)
              .order("display_order")
          : Promise.resolve({ data: [], error: null }),
        applicant.supabase
          .from("application_criterion_scores")
          .select("criterion_id, points")
          .eq("application_id", application.id),
      ]);
      if (criteriaResult.error || scoresResult.error) {
        criteriaUnavailable = true;
      } else {
        const weightsByCriterion = new Map(
          weights.map((weight) => [weight.criterion_id, weight.points]),
        );
        const scoresByCriterion = new Map(
          (scoresResult.data ?? []).map((score) => [
            score.criterion_id,
            score.points,
          ]),
        );
        const educationCriterion = (criteriaResult.data ?? []).find(
          (criterion) => criterion.criterion_key === "EDUCATION",
        );
        const educationMaximumPoints = educationCriterion
          ? weightsByCriterion.get(educationCriterion.id)
          : undefined;
        const educationPointsResult =
          resolvedPositionId &&
          applicantQualificationLevel !== null &&
          educationMaximumPoints !== undefined
            ? await applicant.supabase.rpc("education_equivalent_points", {
                p_position_id: resolvedPositionId,
                p_applicant_level: applicantQualificationLevel,
                p_maximum_points: educationMaximumPoints,
              })
            : { data: null, error: null };
        const educationScoringUnavailable = Boolean(
          educationResult.error ||
          resolvedPositionUnavailable ||
          educationPointsResult.error,
        );
        const trainingCriterion = (criteriaResult.data ?? []).find(
          (criterion) => criterion.criterion_key === "TRAINING",
        );
        const trainingMaximumPoints = trainingCriterion
          ? weightsByCriterion.get(trainingCriterion.id)
          : undefined;
        const trainingPointsResult =
          resolvedPositionId &&
          trainingHours !== null &&
          trainingMaximumPoints !== undefined &&
          resolvedPosition?.base_training_increment_level !== null &&
          resolvedPosition?.base_training_increment_level !== undefined
            ? await applicant.supabase.rpc("training_equivalent_points", {
                p_position_id: resolvedPositionId,
                p_training_hours: trainingHours,
                p_maximum_points: trainingMaximumPoints,
              })
            : { data: null, error: null };
        const trainingScoringUnavailable =
          trainingUnavailable || Boolean(trainingPointsResult.error);
        const experienceCriterion = (criteriaResult.data ?? []).find(
          (criterion) => criterion.criterion_key === "EXPERIENCE",
        );
        const experienceMaximumPoints = experienceCriterion
          ? weightsByCriterion.get(experienceCriterion.id)
          : undefined;
        const experiencePointsResult =
          resolvedPositionId &&
          experienceMaximumPoints !== undefined &&
          resolvedPosition?.base_experience_increment_level !== null &&
          resolvedPosition?.base_experience_increment_level !== undefined
            ? await applicant.supabase.rpc("experience_equivalent_points", {
                p_position_id: resolvedPositionId,
                p_applicant_level: publicTeachingExperience.incrementLevel,
                p_maximum_points: experienceMaximumPoints,
              })
            : { data: null, error: null };
        const experienceScoringUnavailable =
          Boolean(workExperienceResult.error) ||
          Boolean(experiencePointsResult.error);
        criteriaRows = (criteriaResult.data ?? []).flatMap(
          (criterion): ApplicationCriterionPointsRow[] => {
            const maximumPoints = weightsByCriterion.get(criterion.id);
            if (maximumPoints === undefined) return [];

            if (criterion.criterion_key === "EDUCATION") {
              return [
                {
                  id: criterion.id,
                  title: criterion.title,
                  maximumPoints,
                  earnedPoints: educationPointsResult.data,
                  earnedStatus: educationScoringUnavailable
                    ? "unavailable"
                    : educationPointsResult.data === null
                      ? "not_scored"
                      : "scored",
                  detail:
                    educationPointsResult.data !== null &&
                    resolvedPosition &&
                    resolvedPosition.base_qualification_level !== null &&
                    applicantQualificationLevel !== null
                      ? `Education difference: ${applicantQualificationLevel - resolvedPosition.base_qualification_level} increments; equivalent points use the configured Education weight.`
                      : "Complete the education details in the submitted PDS and make sure HR has set the position standard.",
                },
              ];
            }

            if (criterion.criterion_key === "TRAINING") {
              return [
                {
                  id: criterion.id,
                  title: criterion.title,
                  maximumPoints,
                  earnedPoints: trainingPointsResult.data,
                  earnedStatus: trainingScoringUnavailable
                    ? "unavailable"
                    : trainingPointsResult.data === null
                      ? "not_scored"
                      : "scored",
                  detail:
                    trainingPointsResult.data !== null &&
                    resolvedPosition?.base_training_increment_level !== null &&
                    resolvedPosition?.base_training_increment_level !==
                      undefined
                      ? `Calculated from ${trainingHours} submitted training hours against minimum increment level ${resolvedPosition.base_training_increment_level}.`
                      : "Set the position’s minimum Training increment level and provide training hours in the submitted PDS or certificates.",
                },
              ];
            }

            if (criterion.criterion_key === "EXPERIENCE") {
              return [
                {
                  id: criterion.id,
                  title: criterion.title,
                  maximumPoints,
                  earnedPoints: experiencePointsResult.data,
                  earnedStatus: experienceScoringUnavailable
                    ? "unavailable"
                    : experiencePointsResult.data === null
                      ? "not_scored"
                      : "scored",
                  detail:
                    experiencePointsResult.data !== null &&
                    resolvedPosition?.base_experience_increment_level !==
                      null &&
                    resolvedPosition?.base_experience_increment_level !==
                      undefined
                      ? `${formatExperienceMonths(publicTeachingExperience.qualifyingMonths)} qualifying public teaching experience (Level ${publicTeachingExperience.incrementLevel}; minimum Level ${resolvedPosition.base_experience_increment_level}).`
                      : "Only government-service work with a teacher-, instructor-, or educator-related title counts. Set the position’s minimum Experience increment level to calculate points.",
                },
              ];
            }

            const savedPoints =
              criterion.criterion_key === "CLASSROOM_OBSERVATION"
                ? scoresByCriterion.get(criterion.id)
                : undefined;
            return [
              {
                id: criterion.id,
                title: criterion.title,
                maximumPoints,
                earnedPoints: savedPoints ?? null,
                earnedStatus:
                  savedPoints === undefined ? "not_scored" : "scored",
              },
            ];
          },
        );
      }
    }
  }

  const events: ApplicationEvent[] = [
    {
      id: "submitted",
      title: "Application submitted",
      status: "SUBMITTED",
      date: application.applied_at,
      remarks: null,
    },
    ...(evaluations ?? []).map((evaluation) => ({
      id: evaluation.id,
      title: `Evaluator assessment: ${evaluation.result.replaceAll("_", " ").toLowerCase()}`,
      status: evaluation.result,
      date: evaluation.evaluated_at,
      remarks: evaluation.remarks,
    })),
    ...(application.scheduled_assessment_at
      ? [
          {
            id: `assessment-schedule-${application.id}`,
            title: "Assessment scheduled",
            status: "ASSESSMENT_SCHEDULED",
            date: application.scheduled_assessment_at,
            remarks: null,
          },
        ]
      : []),
    ...(decision
      ? [
          {
            id: `decision-${application.id}`,
            title:
              decision.decision === "HIRED"
                ? "Hiring decision recorded"
                : "Application decision recorded",
            status: decision.decision,
            date: decision.decided_at,
            remarks: null,
          },
        ]
      : []),
  ];

  events.sort((left, right) => {
    if (!left.date) return right.date ? 1 : 0;
    if (!right.date) return -1;
    return left.date.localeCompare(right.date);
  });

  if (events.at(-1)?.status !== application.status) {
    events.push({
      id: `current-${application.id}`,
      title: "Current application status",
      status: application.status,
      date: null,
      remarks: null,
    });
  }

  return (
    <div className="mx-auto">
      <Link
        className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        href="/applicant/applications"
      >
        Back to your applications
      </Link>
      <header className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {job?.title ?? "Application details"}
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted">
            Review history and score for this application.
          </p>
        </div>
        <WorkflowStatusTag status={application.status} />
      </header>

      {application.status === "ASSESSMENT_SCHEDULED" && (
        <section
          aria-atomic="true"
          aria-live="polite"
          className="mt-5 flex items-start gap-4 rounded-sm border border-warning/30 bg-warning/10 p-4 sm:p-5"
          role="status"
        >
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-panel text-warning"
          >
            <CalendarDaysIcon className="size-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">
              Your assessment is scheduled
            </h2>
            {application.scheduled_assessment_at ? (
              <p className="mt-1 text-sm leading-6 text-ink">
                <time dateTime={application.scheduled_assessment_at}>
                  {formatPhilippineDateTime(
                    application.scheduled_assessment_at,
                  )}
                </time>
              </p>
            ) : (
              <p className="mt-1 text-sm leading-6 text-ink">
                Contact HR to confirm the assessment date and time.
              </p>
            )}
          </div>
        </section>
      )}

      {application.status === "REJECTED" && application.status_reason && (
        <section
          aria-labelledby="application-closed-reason"
          className="mt-5 rounded-sm border border-warning/30 bg-warning/10 p-4 sm:p-5"
        >
          <h2
            className="text-sm font-semibold text-ink"
            id="application-closed-reason"
          >
            Application update
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink">
            {application.status_reason}
          </p>
          {canResubmit && (
            <Link
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              href={`/applicant/jobs/${application.job_id}`}
            >
              Resubmit application
            </Link>
          )}
        </section>
      )}

      <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,0.8fr)] lg:gap-10">
        <div className="rounded-md border border-line bg-panel p-6 shadow-card">
          <ApplicationCriteriaPoints
            rows={criteriaRows}
            unavailable={criteriaUnavailable}
            unavailableMessage={criteriaUnavailableMessage}
          />
        </div>
        <aside className="grid gap-6 rounded-md border border-line bg-panel shadow-card">
          <ApplicationProvisionalTotal
            rows={criteriaRows}
            unavailable={criteriaUnavailable}
          />
          <section aria-labelledby="position-heading" className="px-6">
            <h2
              className="text-xs font-medium text-muted"
              id="position-heading"
            >
              Position applying for
            </h2>
            <p className="mt-1 text-sm font-medium text-ink">
              {resolvedPosition
                ? `${resolvedPosition.title} · ${formatPositionTrack(resolvedPosition.application_type?.name ?? "")}`
                : resolvedPositionId
                  ? "Position unavailable"
                  : "Position not recorded"}
            </p>
            {application.position_id === null &&
              linkedPositionIds.length > 1 && (
                <p className="mt-2 text-sm text-muted" role="status">
                  This application is missing its saved position. Please contact
                  HR to verify the position on your application.
                </p>
              )}
          </section>
          <section
            aria-labelledby="status-timeline-heading"
            className="px-6 mb-6"
          >
            <div className="border-b border-line-subtle pb-4">
              <h2
                className="text-lg font-semibold tracking-tight text-ink"
                id="status-timeline-heading"
              >
                Status timeline
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Updates as your application moves through review.
              </p>
            </div>
            <ApplicationTimeline
              currentStatus={application.status}
              events={events}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

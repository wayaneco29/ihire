import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getApplicantContext } from "@/lib/auth/server";
import { calculateApplicantTrainingHours } from "@/utils/calculate-applicant-training-hours";
import { calculateTrainingPoints } from "@/utils/calculate-training-points";
import { formatPositionTrack } from "@/utils/format-position-track";
import {
  ApplicationCriteriaPoints,
  type ApplicationCriterionPointsRow,
} from "./components/ApplicationCriteriaPoints";
import {
  ApplicationTimeline,
  type ApplicationEvent,
} from "./components/ApplicationTimeline";

export default async function ApplicantApplicationDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/login");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: application, error } = await applicant.supabase
    .from("applications")
    .select("id, job_id, position_id, pds_version_id, status, applied_at")
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
      .select("title, description, requirements, slots, deadline")
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
          .select("title, track")
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

  const [
    { data: jobPositions, error: jobPositionError },
    { data: certificateType, error: certificateTypeError },
    learningResult,
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
  ]);

  const linkedPositionIds = (jobPositions ?? []).map(
    (jobPosition) => jobPosition.position_id,
  );
  const resolvedPositionId =
    application.position_id ??
    (linkedPositionIds.length === 1 ? linkedPositionIds[0] : null);
  const resolvedPosition =
    application.position_id !== null
      ? position
      : resolvedPositionId
        ? (
            await applicant.supabase
              .from("positions")
              .select("id, title, track")
              .eq("id", resolvedPositionId)
              .maybeSingle()
          ).data
        : null;

  let trainingHours: number | null = null;
  let trainingUnavailable =
    Boolean(certificateTypeError || !certificateType) ||
    Boolean(learningResult.error);
  if (!trainingUnavailable && certificateType) {
    const certificatesResult = await applicant.supabase
      .from("documents")
      .select(
        "training_hours, pds_learning_development_id, uploaded_at, version",
      )
      .eq("applicant_id", applicant.applicant.id)
      .eq("document_type_id", certificateType.id)
      .not("training_hours", "is", null)
      .order("uploaded_at", { ascending: false })
      .order("version", { ascending: false });
    if (certificatesResult.error) {
      trainingUnavailable = true;
    } else {
      trainingHours = calculateApplicantTrainingHours(
        learningResult.data ?? [],
        certificatesResult.data ?? [],
      );
    }
  }

  const jobPosition =
    jobPositions?.find(
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
        criteriaRows = (criteriaResult.data ?? []).flatMap(
          (criterion): ApplicationCriterionPointsRow[] => {
            const maximumPoints = weightsByCriterion.get(criterion.id);
            if (maximumPoints === undefined) return [];

            if (criterion.criterion_key === "TRAINING") {
              return [
                {
                  id: criterion.id,
                  title: criterion.title,
                  maximumPoints,
                  earnedPoints:
                    trainingHours === null || trainingUnavailable
                      ? null
                      : calculateTrainingPoints(trainingHours, maximumPoints),
                  earnedStatus: trainingUnavailable ? "unavailable" : "scored",
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
    <>
      <PageHeader
        description="Track the review history and details for this application."
        eyebrow="My applications"
        title={job?.title ?? "Application details"}
        actions={<WorkflowStatusTag status={application.status} />}
      />

      <div className="mt-7 grid gap-5">
        <section className="rounded-2xl border border-line bg-panel p-5 shadow-card sm:p-7">
          <h2 className="text-sm font-semibold text-ink">
            Position applying for
          </h2>
          <p className="mt-1 text-sm text-muted">
            {resolvedPosition
              ? `${resolvedPosition.title} · ${formatPositionTrack(resolvedPosition.track)}`
              : resolvedPositionId
                ? "Position unavailable"
                : "Position not recorded"}
          </p>
          {application.position_id === null && linkedPositionIds.length > 1 && (
            <p className="mt-3 text-sm text-muted" role="status">
              This application is missing its saved position. Please contact HR
              to verify the position on your application.
            </p>
          )}
        </section>
        <ApplicationCriteriaPoints
          rows={criteriaRows}
          unavailable={criteriaUnavailable}
          unavailableMessage={criteriaUnavailableMessage}
        />
        <section className="h-fit rounded-2xl border border-line bg-panel p-5 shadow-card sm:p-7">
          <div className="border-b border-line-subtle pb-4">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
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
      </div>
    </>
  );
}

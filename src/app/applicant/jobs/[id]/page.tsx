import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarDaysIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getApplicantContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
import { formatPositionLabel } from "@/utils/format-position-track";
import { calculatePublicTeachingExperience } from "@/utils/calculate-public-teaching-experience";
import { calculateApplicantTrainingHours } from "@/utils/calculate-applicant-training-hours";
import { isDocumentComplianceRejection } from "@/utils/application-resubmission";
import { ApplyButton } from "./components/ApplyButton";
import { JobScoringGuide } from "@/components/scoring/JobScoringGuide";
import type { ScoringRule, EducationLevel } from "@/types/scoring";
import { previewScore, readBands } from "@/utils/scoring";

const CURRENT_TIME_MS = Date.now();

export default async function ApplicantJobDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [{ data: job }, { data: application }] = await Promise.all([
    applicant.supabase
      .from("job_postings")
      .select(
        "id, title, description, requirements, slots, deadline, created_at",
      )
      .eq("id", id)
      .eq("status", "OPEN")
      .maybeSingle(),
    applicant.supabase
      .from("applications")
      .select("id, status, status_reason, applied_at, position_id")
      .eq("job_id", id)
      .eq("applicant_id", applicant.applicant.id)
      .maybeSingle(),
  ]);

  if (!job || (job.deadline && Date.parse(job.deadline) <= CURRENT_TIME_MS))
    notFound();

  const { data: jobPositions, error: jobPositionsError } =
    await applicant.supabase
      .from("job_posting_positions")
      .select("position_id, weight_profile_id")
      .eq("job_id", job.id);
  if (jobPositionsError) {
    return (
      <EmptyState
        description="Refresh the page to try loading the positions for this posting."
        title="Positions unavailable"
      />
    );
  }
  const linkedPositions = jobPositions ?? [];
  const positionIds = linkedPositions.map(
    (jobPosition) => jobPosition.position_id,
  );
  const positionsResult = positionIds.length
    ? await applicant.supabase
        .from("positions")
        .select(
          "id, title, base_qualification_level, base_training_increment_level, base_experience_increment_level, application_type(name)",
        )
        .in("id", positionIds)
        .order("title")
    : { data: [], error: null };
  if (positionsResult.error) {
    return (
      <EmptyState
        description="Refresh the page to try loading the positions for this posting."
        title="Positions unavailable"
      />
    );
  }
  const availablePositions = positionsResult.data ?? [];
  const availablePositionIds = new Set(
    availablePositions.map((position) => position.id),
  );
  const availableLinks = linkedPositions.filter((jobPosition) =>
    availablePositionIds.has(jobPosition.position_id),
  );
  const weightsResult = availableLinks.length
    ? await applicant.supabase
        .from("position_criterion_weights")
        .select("profile_id, criterion_id, points, minimum_level, bands")
        .in(
          "profile_id",
          availableLinks.map((jobPosition) => jobPosition.weight_profile_id),
        )
    : { data: [], error: null };
  if (weightsResult.error) {
    return (
      <EmptyState
        description="Refresh the page to try loading the criteria for this posting."
        title="Position criteria unavailable"
      />
    );
  }
  const criterionIds = [
    ...new Set((weightsResult.data ?? []).map((weight) => weight.criterion_id)),
  ];
  const criteriaResult = criterionIds.length
    ? await applicant.supabase
        .from("position_criteria")
        .select("id, criterion_key, title, display_order")
        .in("id", criterionIds)
        .order("display_order")
    : { data: [], error: null };
  if (criteriaResult.error) {
    return (
      <EmptyState
        description="Refresh the page to try loading the criteria for this posting."
        title="Position criteria unavailable"
      />
    );
  }

  const criteriaById = new Map(
    (criteriaResult.data ?? []).map((criterion) => [criterion.id, criterion]),
  );
  const weightsByProfile = new Map<
    string,
    Array<{
      id: string;
      key: string;
      title: string;
      points: number;
      displayOrder: number;
      rule: ScoringRule;
    }>
  >();
  for (const weight of weightsResult.data ?? []) {
    const criterion = criteriaById.get(weight.criterion_id);
    if (!criterion) continue;
    const profileWeights = weightsByProfile.get(weight.profile_id) ?? [];
    profileWeights.push({
      id: criterion.id,
      key: criterion.criterion_key,
      title: criterion.title,
      points: weight.points,
      displayOrder: criterion.display_order,
      rule: { criterion_id: criterion.id, criterion_key: criterion.criterion_key, title: criterion.title, points: weight.points, minimum_level: weight.minimum_level, bands: readBands(weight.bands) },
    });
    weightsByProfile.set(weight.profile_id, profileWeights);
  }
  const linkByPosition = new Map(
    availableLinks.map((jobPosition) => [jobPosition.position_id, jobPosition]),
  );
  const positions = availablePositions.map((position) => {
    const link = linkByPosition.get(position.id);
    const criteria = link
      ? (weightsByProfile.get(link.weight_profile_id) ?? []).sort(
          (first, second) => first.displayOrder - second.displayOrder,
        )
      : [];
    const scoringRules = criteria.map((criterion) => criterion.rule);
    return {
      ...position,
      criteria,
      scoringRules,
      base_qualification_level: scoringRules.find((rule) => rule.criterion_key === "EDUCATION")?.minimum_level ?? null,
      base_training_increment_level: scoringRules.find((rule) => rule.criterion_key === "TRAINING")?.minimum_level ?? null,
      base_experience_increment_level: scoringRules.find((rule) => rule.criterion_key === "EXPERIENCE")?.minimum_level ?? null,
    };
  });
  if (positions.some((position) => position.criteria.length === 0)) {
    return (
      <EmptyState
        description="Contact HR to configure the missing scoring profile before applications can be submitted."
        title="Position criteria unavailable"
      />
    );
  }

  const [
    { data: submittedPds, error: pdsError },
    { data: certificateType, error: certificateTypeError },
    documentStatusResult,
  ] = await Promise.all([
    applicant.supabase
      .from("pds_versions")
      .select("id")
      .eq("applicant_id", applicant.applicant.id)
      .eq("status", "SUBMITTED")
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle(),
    applicant.supabase
      .from("document_types")
      .select("id")
      .eq("name", "Training and Seminar Certificates")
      .maybeSingle(),
    applicant.supabase
      .from("v_applicant_document_status")
      .select("status, required_document_count, verified_required_count")
      .eq("applicant_id", applicant.applicant.id)
      .maybeSingle(),
  ]);

  if (
    pdsError ||
    certificateTypeError ||
    documentStatusResult.error
  ) {
    return (
      <EmptyState
        description="Refresh the page to try loading your document eligibility and training records."
        title="Application eligibility unavailable"
      />
    );
  }
  const documentStatus = documentStatusResult.data ?? {
    status: "INCOMPLETE",
    required_document_count: 0,
    verified_required_count: 0,
  };

  const [
    learningResult,
    certificatesResult,
    educationResult,
    workExperienceResult,
  ] = await Promise.all([
    submittedPds
      ? applicant.supabase
          .from("pds_learning_development")
          .select("id, hours")
          .eq("pds_version_id", submittedPds.id)
      : Promise.resolve({ data: [], error: null }),
    certificateType
      ? applicant.supabase.from("documents")
      .select(
        "id, training_hours, ocr_training_hours, pds_learning_development_id, replaces_document_id, uploaded_at, version",
      )
      .eq("applicant_id", applicant.applicant.id)
      .eq("document_type_id", certificateType.id)
      .order("uploaded_at", { ascending: false })
      .order("version", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    submittedPds
      ? applicant.supabase
          .from("pds_education")
          .select("qualification_level")
          .eq("pds_version_id", submittedPds.id)
      : Promise.resolve({ data: [], error: null }),
    submittedPds
      ? applicant.supabase
          .from("pds_work_experience")
          .select("date_from, date_to, is_gov_service, position_title")
          .eq("pds_version_id", submittedPds.id)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (
    learningResult.error ||
    certificatesResult.error ||
    educationResult.error ||
    workExperienceResult.error
  ) {
    return (
      <EmptyState
        description="Refresh the page to try loading your PDS and scoring information."
        title="Application points unavailable"
      />
    );
  }

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
    return (
      <EmptyState
        description="Refresh the page to try loading evaluator-confirmed training hours."
        title="Training points unavailable"
      />
    );
  }

  const trainingHours = calculateApplicantTrainingHours(
    learningResult.data ?? [],
    certificatesResult.data ?? [],
    trainingReviewsResult.data ?? [],
  );
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
  const positionsWithScoringPoints = positions.map((position) => {
    const educationRule = position.scoringRules.find((rule) => rule.criterion_key === "EDUCATION");
    const trainingRule = position.scoringRules.find((rule) => rule.criterion_key === "TRAINING");
    const experienceRule = position.scoringRules.find((rule) => rule.criterion_key === "EXPERIENCE");
    return {
      ...position,
      educationPoints: educationRule ? previewScore(educationRule, applicantQualificationLevel) : null,
      trainingPoints: trainingRule ? previewScore(trainingRule, Math.min(31, Math.floor(trainingHours / 8) + 1)) : null,
      experiencePoints: experienceRule ? previewScore(experienceRule, publicTeachingExperience.incrementLevel) : null,
      qualifyingExperienceMonths: publicTeachingExperience.qualifyingMonths,
      experienceIncrementLevel: publicTeachingExperience.incrementLevel,
    };
  });
  const { data: educationLevelsData } = await applicant.supabase
    .from("education_levels")
    .select("qualification_level, description")
    .order("qualification_level");
  const educationLevels = (educationLevelsData ?? []) as EducationLevel[];

  const selectedPosition = positions.find(
    (position) => position.id === application?.position_id,
  );
  const canResubmit = application
    ? isDocumentComplianceRejection(
        application.status,
        application.status_reason,
      )
    : false;
  const requiredDocumentsReady = ["APPROVED", "FOR_REVIEW"].includes(
    documentStatus.status,
  );
  const resubmissionPositions = application?.position_id
    ? positionsWithScoringPoints.filter(
        (position) => position.id === application.position_id,
      )
    : [];

  return (
    <>
      <PageHeader
        backHref="/applicant/jobs"
        backLabel="Back to jobs"
        description={
          canResubmit
            ? "Submit the requested document corrections, then resubmit for this open posting."
            : application
              ? "Review the current status and details for your application."
              : "Review the position details before submitting your application."
        }
        eyebrow="Open job posting"
        title={job.title}
      />
      <article className="mt-6 overflow-hidden rounded-2xl border border-line bg-panel shadow-card">
        <div className="flex flex-wrap items-center gap-3 px-5 pt-5 sm:px-7 sm:pt-7">
          <WorkflowStatusTag status="OPEN" />
          <span className="text-sm text-muted">
            Posted {formatDate(job.created_at)}
          </span>
        </div>

        <dl className="mx-5 mt-5 grid gap-3 rounded-xl bg-panel-muted p-4 sm:mx-7 sm:grid-cols-2 sm:gap-6 sm:p-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-light text-primary"
            >
              <UserGroupIcon className="size-5" />
            </span>
            <div>
              <dt className="text-xs font-medium text-muted">
                Available positions
              </dt>
              <dd className="mt-0.5 text-base font-semibold text-ink">
                {job.slots}
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-light text-primary"
            >
              <CalendarDaysIcon className="size-5" />
            </span>
            <div>
              <dt className="text-xs font-medium text-muted">
                Application deadline
              </dt>
              <dd className="mt-0.5 text-base font-semibold text-ink">
                {job.deadline ? formatDate(job.deadline) : "Not specified"}
              </dd>
            </div>
          </div>
        </dl>

        <div className="px-5 pb-6 sm:px-7 sm:pb-7">
          <section className="py-6">
            <h2 className="text-base font-semibold text-ink">
              Position details
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
              {job.description}
            </p>
          </section>

          {job.requirements && (
            <section className="border-t border-line-subtle py-6">
              <h2 className="text-base font-semibold text-ink">Requirements</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                {job.requirements}
              </p>
            </section>
          )}

          <JobScoringGuide positions={positions} educationLevels={educationLevels} />

          <section className="flex flex-col gap-5 border-t border-line-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
            {application && canResubmit ? (
              <div className="w-full space-y-4">
                <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-ink">
                      Resubmit your application
                    </h2>
                    <WorkflowStatusTag status={application.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {application.status_reason}
                  </p>
                  <Link
                    className="mt-3 inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-primary hover:text-primary-dark"
                    href={`/applicant/applications/${application.id}`}
                  >
                    View application details
                  </Link>
                </div>
                {!applicant.profile.has_submitted_pds ? (
                  <Link
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    href="/applicant/pds"
                  >
                    Complete your PDS first
                  </Link>
                ) : !requiredDocumentsReady ? (
                  <div className="max-w-md rounded-xl border border-warning/30 bg-warning/10 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">
                        Required documents
                      </p>
                      <WorkflowStatusTag status={documentStatus.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Submit the requested document corrections for review before
                      resubmitting your application.
                    </p>
                    <Link
                      className="mt-3 inline-flex min-h-11 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark"
                      href="/applicant/documents"
                    >
                      Go to documents
                    </Link>
                  </div>
                ) : resubmissionPositions.length ? (
                  <ApplyButton
                    initialPositionId={application.position_id}
                    jobId={job.id}
                    positions={resubmissionPositions}
                    submitLabel="Resubmit application"
                  />
                ) : (
                  <p className="max-w-sm text-sm text-muted">
                    The original position is no longer available. Contact HR
                    for assistance with your resubmission.
                  </p>
                )}
              </div>
            ) : application ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <p className="text-sm text-muted">
                  Applying for{" "}
                  <span className="font-semibold text-ink">
                    {selectedPosition
                      ? formatPositionLabel(
                          selectedPosition.title,
                          selectedPosition.application_type?.name ?? "",
                        )
                      : application.position_id
                        ? "Position unavailable"
                        : "Position not recorded"}
                  </span>
                </p>
                <WorkflowStatusTag status={application.status} />
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  href={`/applicant/applications/${application.id}`}
                >
                  View your application
                </Link>
              </div>
            ) : applicant.profile.has_submitted_pds ? (
              ["APPROVED", "FOR_REVIEW"].includes(documentStatus.status) ? (
                positions.length ? (
                  <ApplyButton
                    jobId={job.id}
                    positions={positionsWithScoringPoints}
                  />
                ) : (
                  <p className="max-w-sm text-sm text-muted">
                    No positions are available for this posting. Contact HR for
                    assistance.
                  </p>
                )
              ) : (
                <div className="max-w-md rounded-xl border border-warning/30 bg-warning/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">
                      Required documents
                    </p>
                    <WorkflowStatusTag status={documentStatus.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Upload every required document and submit it for review
                    before applying. The Document Reviewer can finish
                    verification after your application is filed.
                  </p>
                  <Link
                    className="mt-3 inline-flex min-h-11 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark"
                    href="/applicant/documents"
                  >
                    Go to documents
                  </Link>
                </div>
              )
            ) : (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                href="/applicant/pds"
              >
                Complete your PDS first
              </Link>
            )}
          </section>
        </div>
      </article>
    </>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getApplicantContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
import { formatPositionLabel } from "@/utils/format-position-track";
import { calculateApplicantTrainingHours } from "@/utils/calculate-applicant-training-hours";
import { ApplyButton } from "./components/ApplyButton";

const CURRENT_TIME_MS = Date.now();

export default async function ApplicantJobDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/login");
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
      .select("id, status, applied_at, position_id")
      .eq("job_id", id)
      .eq("applicant_id", applicant.applicant.id)
      .maybeSingle(),
  ]);

  if (!job || (job.deadline && Date.parse(job.deadline) <= CURRENT_TIME_MS))
    notFound();

  const { data: jobPositions, error: jobPositionsError } = await applicant.supabase
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
        .select("id, title, track")
        .in("id", positionIds)
        .eq("is_active", true)
        .order("track")
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
  const activePositions = positionsResult.data ?? [];
  const activePositionIds = new Set(
    activePositions.map((position) => position.id),
  );
  const activeLinks = linkedPositions.filter((jobPosition) =>
    activePositionIds.has(jobPosition.position_id),
  );
  const weightsResult = activeLinks.length
    ? await applicant.supabase
        .from("position_criterion_weights")
        .select("profile_id, criterion_id, points")
        .in(
          "profile_id",
          activeLinks.map((jobPosition) => jobPosition.weight_profile_id),
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
    (criteriaResult.data ?? []).map((criterion) => [
      criterion.id,
      criterion,
    ]),
  );
  const weightsByProfile = new Map<
    string,
    Array<{
      id: string;
      key: string;
      title: string;
      points: number;
      displayOrder: number;
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
    });
    weightsByProfile.set(weight.profile_id, profileWeights);
  }
  const linkByPosition = new Map(
    activeLinks.map((jobPosition) => [
      jobPosition.position_id,
      jobPosition,
    ]),
  );
  const positions = activePositions.map((position) => {
    const link = linkByPosition.get(position.id);
    const criteria = link
      ? (weightsByProfile.get(link.weight_profile_id) ?? []).sort(
          (first, second) => first.displayOrder - second.displayOrder,
        )
      : [];
    return { ...position, criteria };
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
  ]);

  if (pdsError || certificateTypeError || !certificateType) {
    return (
      <EmptyState
        description="Refresh the page to try loading your training records."
        title="Training points unavailable"
      />
    );
  }

  const [learningResult, certificatesResult] = await Promise.all([
    submittedPds
      ? applicant.supabase
          .from("pds_learning_development")
          .select("id, hours")
          .eq("pds_version_id", submittedPds.id)
      : Promise.resolve({ data: [], error: null }),
    applicant.supabase
      .from("documents")
      .select(
        "training_hours, pds_learning_development_id, uploaded_at, version",
      )
      .eq("applicant_id", applicant.applicant.id)
      .eq("document_type_id", certificateType.id)
      .not("training_hours", "is", null)
      .order("uploaded_at", { ascending: false })
      .order("version", { ascending: false }),
  ]);
  if (learningResult.error || certificatesResult.error) {
    return (
      <EmptyState
        description="Refresh the page to try loading your training records."
        title="Training points unavailable"
      />
    );
  }

  const trainingHours = calculateApplicantTrainingHours(
    learningResult.data ?? [],
    certificatesResult.data ?? [],
  );

  const selectedPosition = positions.find(
    (position) => position.id === application?.position_id,
  );

  return (
    <>
      <Link
        className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        href="/applicant/jobs"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Back to jobs
      </Link>
      <PageHeader
        description="Review the position details before submitting your application."
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
              <h2 className="text-base font-semibold text-ink">
                Requirements
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                {job.requirements}
              </p>
            </section>
          )}

          <section className="flex flex-col gap-5 border-t border-line-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-6 text-muted">
              Your latest submitted PDS will be attached to this application. HR
              and evaluators see your applicant number and assessment data.
            </p>
            {application ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <p className="text-sm text-muted">
                  Applying for{" "}
                  <span className="font-semibold text-ink">
                    {selectedPosition
                      ? formatPositionLabel(
                          selectedPosition.title,
                          selectedPosition.track,
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
              positions.length ? (
                <ApplyButton
                  jobId={job.id}
                  positions={positions}
                  trainingHours={trainingHours}
                />
              ) : (
                <p className="max-w-sm text-sm text-muted">
                  No active positions are available for this posting. Contact HR
                  for assistance.
                </p>
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

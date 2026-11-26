import Link from "next/link";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { APPLICATION_STATUSES } from "@/constants/statuses";
import { getHrContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
import { getPostingDisplayStatus } from "@/utils/job-posting-status";
import { PostingStatusPill } from "../components/PostingStatusPill";
import { PostingApplicants } from "./components/PostingApplicants";
import { CloseIntakeButton } from "./components/CloseIntakeButton";

function daysUntilDeadline(deadline: string, now: number) {
  const deadlineDate = new Date(deadline);
  if (!Number.isFinite(deadlineDate.getTime())) return null;

  const today = new Date(now);
  const deadlineDay = Date.UTC(
    deadlineDate.getFullYear(),
    deadlineDate.getMonth(),
    deadlineDate.getDate(),
  );
  const todayDay = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.round((deadlineDay - todayDay) / 86_400_000);
}

export default async function HrPostingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const hr = await getHrContext();
  if (!hr) redirect("/");

  const { data: posting, error: postingError } = await hr.supabase
    .from("job_postings")
    .select(
      "id, title, description, slots, status, deadline, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (postingError || !posting) notFound();

  const applicantColumns =
    "application_id, applicant_number, application_status, applied_at, position_title, position_track";
  const [firstApplicantPage, hiredCountResult] = await Promise.all([
    hr.supabase
      .from("v_anonymized_applicants")
      .select(applicantColumns, { count: "exact" })
      .eq("job_id", posting.id)
      .order("applied_at", { ascending: false })
      .range(0, 999),
    hr.supabase
      .from("v_anonymized_applicants")
      .select("application_id", { count: "exact", head: true })
      .eq("job_id", posting.id)
      .eq("application_status", "HIRED"),
  ]);

  const applicants = [...(firstApplicantPage.data ?? [])];
  let applicantsError = firstApplicantPage.error;
  const remainingOffsets = Array.from(
    {
      length: Math.ceil(
        Math.max(
          0,
          (firstApplicantPage.count ?? applicants.length) - applicants.length,
        ) / 1000,
      ),
    },
    (_, index) => (index + 1) * 1000,
  );
  if (!applicantsError && remainingOffsets.length) {
    const remainingPages = await Promise.all(
      remainingOffsets.map((offset) =>
        hr.supabase
          .from("v_anonymized_applicants")
          .select(applicantColumns)
          .eq("job_id", posting.id)
          .order("applied_at", { ascending: false })
          .range(offset, offset + 999),
      ),
    );
    applicantsError =
      remainingPages.find((result) => result.error)?.error ?? null;
    applicants.push(...remainingPages.flatMap((result) => result.data ?? []));
  }

  const applicantIds = applicants.map((applicant) => applicant.application_id);
  const applicantNameBatches = await Promise.all(
    Array.from({ length: Math.ceil(applicantIds.length / 100) }, (_, index) =>
      hr.supabase
        .from("v_staff_application_reviews")
        .select("application_id, applicant_name")
        .in("application_id", applicantIds.slice(index * 100, (index + 1) * 100)),
    ),
  );
  if (!applicantsError) {
    applicantsError = applicantNameBatches.find((batch) => batch.error)?.error ?? null;
  }

  const scoreApplicantIdBatches = Array.from(
    { length: Math.ceil(applicantIds.length / 100) },
    (_, index) => applicantIds.slice(index * 100, (index + 1) * 100),
  );
  const assessmentScoreBatches = await Promise.all(
    scoreApplicantIdBatches.map((batch) =>
      hr.supabase
        .from("application_criterion_scores")
        .select(
          "application_id, points, criterion:position_criteria(criterion_key)",
        )
        .in("application_id", batch),
    ),
  );
  const [applicationPositionsResult, postingPositionsResult] =
    await Promise.all([
      applicantIds.length
        ? hr.supabase
            .from("applications")
            .select("id, position_id")
            .in("id", applicantIds)
        : Promise.resolve({ data: [], error: null }),
      hr.supabase
        .from("job_posting_positions")
        .select("position_id, weight_profile_id")
        .eq("job_id", posting.id),
    ]);
  const weightProfileIds = [
    ...new Set(
      (postingPositionsResult.data ?? []).map((row) => row.weight_profile_id),
    ),
  ];
  const criterionWeightsResult = weightProfileIds.length
    ? await hr.supabase
        .from("position_criterion_weights")
        .select(
          "profile_id, points, criterion:position_criteria(criterion_key)",
        )
        .in("profile_id", weightProfileIds)
    : { data: [], error: null };
  const assessmentScores = assessmentScoreBatches.flatMap(
    (batch) => batch.data ?? [],
  );
  const assessmentScoresError =
    assessmentScoreBatches.find((batch) => batch.error)?.error ?? null;
  const scoringBatches = await Promise.all(
    scoreApplicantIdBatches.map((batch) =>
      hr.supabase
        .from("v_application_scoring")
        .select("application_id, criterion_key, points")
        .in("application_id", batch),
    ),
  );
  const rankingDataUnavailable = Boolean(
    assessmentScoresError ||
    applicationPositionsResult.error ||
    postingPositionsResult.error ||
    criterionWeightsResult.error ||
    scoringBatches.some((batch) => batch.error),
  );
  const pointsByApplication = new Map<string, Map<string, number>>();
  for (const score of assessmentScores) {
    const key = score.criterion?.criterion_key;
    if (!key || score.points == null) continue;
    const points =
      pointsByApplication.get(score.application_id) ??
      new Map<string, number>();
    points.set(key, Number(score.points));
    pointsByApplication.set(score.application_id, points);
  }
  function addCalculatedPoints(
    applicationId: string,
    key: string,
    value: number | null,
  ) {
    if (value === null) return;
    const points =
      pointsByApplication.get(applicationId) ?? new Map<string, number>();
    if (!points.has(key)) points.set(key, Number(value));
    pointsByApplication.set(applicationId, points);
  }
  for (const batch of scoringBatches) {
    for (const row of batch.data ?? [])
      addCalculatedPoints(row.application_id, row.criterion_key, row.points);
  }
  const positionByApplication = new Map(
    (applicationPositionsResult.data ?? []).map((row) => [
      row.id,
      row.position_id,
    ]),
  );
  const profileByPosition = new Map(
    (postingPositionsResult.data ?? []).map((row) => [
      row.position_id,
      row.weight_profile_id,
    ]),
  );
  const criteriaByProfile = new Map<string, Map<string, number>>();
  for (const weight of criterionWeightsResult.data ?? []) {
    const criterion = weight.criterion;
    const key = criterion?.criterion_key;
    if (!criterion || !key) continue;
    const profileCriteria =
      criteriaByProfile.get(weight.profile_id) ?? new Map();
    profileCriteria.set(key, Number(weight.points));
    criteriaByProfile.set(weight.profile_id, profileCriteria);
  }
  const totalPointsByApplication = new Map(
    [...pointsByApplication].map(
      ([applicationId, points]): [string, number] => [
        applicationId,
        [...points.values()].reduce((sum, value) => sum + value, 0),
      ],
    ),
  );
  const rankedApplicantIds = [...applicants]
    .filter((applicant) =>
      totalPointsByApplication.has(applicant.application_id),
    )
    .sort((a, b) => {
      const pointDifference =
        totalPointsByApplication.get(b.application_id)! -
        totalPointsByApplication.get(a.application_id)!;
      return (
        pointDifference ||
        a.applicant_number.localeCompare(b.applicant_number, undefined, {
          numeric: true,
        })
      );
    })
    .map((applicant) => applicant.application_id);
  const rankByApplicantId = new Map(
    rankedApplicantIds.map((applicationId, index): [string, number] => [
      applicationId,
      index + 1,
    ]),
  );
  const applicantNameById = new Map(
    applicantNameBatches.flatMap((batch) => batch.data ?? [])
      .map((row) => [row.application_id, row.applicant_name] as const),
  );
  const applicantItems = applicants.map((applicant) => {
    const positionId = positionByApplication.get(applicant.application_id);
    const profileId = positionId ? profileByPosition.get(positionId) : null;
    const configuredCriteria = profileId
      ? criteriaByProfile.get(profileId)
      : null;
    const applicantPoints =
      pointsByApplication.get(applicant.application_id) ??
      new Map<string, number>();
    const assessmentMaximumPoints = configuredCriteria
      ? [...configuredCriteria.values()].reduce(
          (sum, maximumPoints) => sum + maximumPoints,
          0,
        )
      : null;
    const assessmentIsComplete = Boolean(
      configuredCriteria?.size &&
        [...configuredCriteria.keys()].every((key) => applicantPoints.has(key)),
    );

    return {
      ...applicant,
      applicant_name:
        applicantNameById.get(applicant.application_id) ?? "Name unavailable",
      assessment_points:
        totalPointsByApplication.get(applicant.application_id) ?? null,
      assessment_rank: rankByApplicantId.get(applicant.application_id) ?? null,
      assessment_maximum_points: assessmentMaximumPoints,
      assessment_is_complete: assessmentIsComplete,
    };
  });
  const validApplicationStatuses = new Set<string>([
    "ALL",
    ...APPLICATION_STATUSES,
  ]);
  const initialStatusFilter =
    typeof query.status === "string" &&
    validApplicationStatuses.has(query.status)
      ? query.status
      : "QUALIFIED";
  const hiredCount = hiredCountResult.count ?? 0;
  const deadlineTimestamp = posting.deadline
    ? Date.parse(posting.deadline)
    : null;
  const hasValidDeadline =
    deadlineTimestamp !== null && Number.isFinite(deadlineTimestamp);
  // This is request-time data for the current page render.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const displayStatus = getPostingDisplayStatus(
    {
      status: posting.status,
      deadline: posting.deadline,
      hired: hiredCount,
      slots: posting.slots,
    },
    now,
  );
  const daysRemaining = hasValidDeadline
    ? daysUntilDeadline(posting.deadline!, now)
    : null;
  const deadlineLabel = hasValidDeadline
    ? formatDate(posting.deadline, "MMMM DD, YYYY · hh:mm A")
    : null;
  return (
    <div className="mx-auto">
      <PageHeader
        eyebrow="HR workspace · Job posting"
        title={posting.title}
        description={posting.description ?? undefined}
        backHref="/hr/postings"
        backLabel="All job postings"
        actions={
          displayStatus === "OPEN" ? (
            <div className="flex flex-wrap items-center gap-2">
              <CloseIntakeButton jobId={posting.id} />
              <Link
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-primary! bg-panel px-4 text-sm! font-semibold text-primary! transition-colors hover:bg-panel-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                href={`/hr/postings/${posting.id}/edit`}
              >
                <PencilSquareIcon aria-hidden="true" className="size-4" />
                Edit posting
              </Link>
            </div>
          ) : null
        }
      />

      <section
        aria-label="Posting status and hiring progress"
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <div className="rounded-xl border border-line bg-panel px-5 py-4">
          <p className="text-sm text-muted">Posting status</p>
          <div className="mt-3">
            <PostingStatusPill compact status={displayStatus} />
          </div>
        </div>
        <div className="rounded-xl border border-line bg-panel px-5 py-4">
          <p className="text-sm text-muted">Slots filled</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
            {hiredCount} <span className="text-base font-normal text-muted">of {posting.slots}</span>
          </p>
        </div>
        <div className="rounded-xl border border-line bg-panel px-5 py-4">
          <p className="text-sm text-muted">Application deadline</p>
          <p className="mt-1 text-base font-semibold text-ink">
            {deadlineLabel ?? "No deadline"}
          </p>
          {displayStatus === "OPEN" && daysRemaining !== null && (
            <p
              className={`mt-1 text-sm font-semibold ${
                daysRemaining <= 7 ? "text-warning" : "text-muted"
              }`}
            >
              {daysRemaining < 0
                ? "Deadline passed"
                : daysRemaining === 0
                  ? "Due today"
                  : `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`}
            </p>
          )}
        </div>
      </section>

      {applicantsError ? (
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to load this posting's applicants."
            title="Applicants unavailable"
          />
        </div>
      ) : (
        <PostingApplicants
          applicants={applicantItems}
          assessmentScoresUnavailable={rankingDataUnavailable}
          initialStatusFilter={initialStatusFilter}
        />
      )}
    </div>
  );
}

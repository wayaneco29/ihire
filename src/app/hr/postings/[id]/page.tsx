import Link from "next/link";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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

  const { data: hiringReadinessRows, error: hiringReadinessError } =
    await hr.supabase.rpc("get_posting_hiring_readiness", {
      p_job_id: posting.id,
    });
  const hiringReadiness = hiringReadinessError
    ? null
    : (hiringReadinessRows?.[0] ?? null);

  const applicantColumns =
    "application_id, applicant_number, application_status, applied_at, education_levels, experience_years, training_hours, skills, position_title, position_track";
  const [firstApplicantPage, hiredCountResult] = await Promise.all([
    hr.supabase
      .from("v_anonymized_applicants")
      .select(applicantColumns, { count: "exact" })
      .eq("job_id", posting.id)
      .eq("application_status", "QUALIFIED")
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
          .eq("application_status", "QUALIFIED")
          .order("applied_at", { ascending: false })
          .range(offset, offset + 999),
      ),
    );
    applicantsError =
      remainingPages.find((result) => result.error)?.error ?? null;
    applicants.push(...remainingPages.flatMap((result) => result.data ?? []));
  }

  const applicantIds = applicants.map((applicant) => applicant.application_id);
  const scoreApplicantIdBatches = Array.from(
    { length: Math.ceil(applicantIds.length / 100) },
    (_, index) => applicantIds.slice(index * 100, (index + 1) * 100),
  );
  const assessmentScoreBatches = await Promise.all(
    scoreApplicantIdBatches.map((batch) =>
      hr.supabase
        .from("application_criterion_scores")
        .select(
          "application_id, points, criterion:position_criteria(criterion_key, title)",
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
          "profile_id, points, criterion:position_criteria(criterion_key, title)",
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
  const titleByCriterion = new Map<string, string>();
  for (const score of assessmentScores) {
    const key = score.criterion?.criterion_key;
    if (!key) continue;
    const points =
      pointsByApplication.get(score.application_id) ??
      new Map<string, number>();
    points.set(key, Number(score.points));
    pointsByApplication.set(score.application_id, points);
    if (score.criterion?.title)
      titleByCriterion.set(key, score.criterion.title);
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
  const criteriaByProfile = new Map<
    string,
    Map<string, { title: string; maximumPoints: number }>
  >();
  for (const weight of criterionWeightsResult.data ?? []) {
    const criterion = weight.criterion;
    const key = criterion?.criterion_key;
    if (!criterion || !key) continue;
    const profileCriteria =
      criteriaByProfile.get(weight.profile_id) ?? new Map();
    profileCriteria.set(key, {
      title: criterion.title,
      maximumPoints: Number(weight.points),
    });
    criteriaByProfile.set(weight.profile_id, profileCriteria);
    titleByCriterion.set(key, criterion.title);
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
  const applicantItems = applicants.map((applicant) => ({
    ...applicant,
    assessment_points:
      totalPointsByApplication.get(applicant.application_id) ?? null,
    assessment_rank: rankByApplicantId.get(applicant.application_id) ?? null,
    criterion_scores: (() => {
      const positionId = positionByApplication.get(applicant.application_id);
      const profileId = positionId ? profileByPosition.get(positionId) : null;
      const configuredCriteria = profileId
        ? criteriaByProfile.get(profileId)
        : null;
      const applicantPoints =
        pointsByApplication.get(applicant.application_id) ??
        new Map<string, number>();
      const keys = new Set([
        ...applicantPoints.keys(),
        ...(configuredCriteria?.keys() ?? []),
      ]);
      return [...keys]
        .map((key) => {
          const configured = configuredCriteria?.get(key);
          return {
            key,
            title:
              configured?.title ??
              titleByCriterion.get(key) ??
              key
                .toLowerCase()
                .replaceAll("_", " ")
                .replace(/\b\w/g, (letter) => letter.toUpperCase()),
            points: applicantPoints.get(key) ?? null,
            maximumPoints: configured?.maximumPoints ?? null,
          };
        })
        .sort((a, b) => a.title.localeCompare(b.title));
    })(),
  }));
  const requestedApplicationId =
    typeof query.applicationId === "string" &&
    /^[0-9a-f-]{36}$/i.test(query.applicationId)
      ? query.applicationId
      : null;
  const initialApplicationId = applicantItems.some(
    (applicant) => applicant.application_id === requestedApplicationId,
  )
    ? requestedApplicationId
    : null;
  const hiredCount =
    hiredCountResult.count ?? hiringReadiness?.hired_count ?? 0;
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
        title={posting.title}
        description={posting.description ?? undefined}
        backHref="/hr/postings"
        backLabel="Job postings"
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
        className="mt-6 flex flex-col gap-4 rounded-xl border border-line bg-panel px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:py-5"
      >
        <PostingStatusPill compact status={displayStatus} />
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-ink">
            {hiredCount} of {posting.slots}
          </span>
          <span className="text-muted">slots filled</span>
        </div>
        <p className="text-sm text-muted ml-auto">
          Deadline{" "}
          <span className="font-semibold text-ink">
            {deadlineLabel ?? "No deadline"}
          </span>
          {displayStatus === "OPEN" && daysRemaining !== null && (
            <span
              className={`ml-1 font-semibold ${
                daysRemaining <= 7 ? "text-warning" : "text-muted-strong"
              }`}
            >
              {daysRemaining < 0
                ? "Deadline passed"
                : daysRemaining === 0
                  ? "Due today"
                  : `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`}
            </span>
          )}
        </p>
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
          hiredCount={hiredCount}
          hiringReadiness={hiringReadiness}
          initialApplicationId={initialApplicationId}
          slots={posting.slots}
        />
      )}
    </div>
  );
}

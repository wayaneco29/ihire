import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHrContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
import { calculatePublicTeachingExperience } from "@/utils/calculate-public-teaching-experience";
import { PostingApplicants } from "./components/PostingApplicants";

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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hr = await getHrContext();
  if (!hr) redirect("/login");

  const { data: posting, error: postingError } = await hr.supabase
    .from("job_postings")
    .select(
      "id, title, description, requirements, slots, status, deadline, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (postingError || !posting) notFound();

  const applicantColumns =
    "application_id, applicant_number, application_status, applied_at, education_levels, experience_years, training_hours, skills, position_title, position_track";
  const firstApplicantPage = await hr.supabase
    .from("v_anonymized_applicants")
    .select(applicantColumns, { count: "exact" })
    .eq("job_id", posting.id)
    .in("application_status", ["QUALIFIED", "HIRED", "NOT_SELECTED"])
    .order("applied_at", { ascending: false })
    .range(0, 999);

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
          .in("application_status", ["QUALIFIED", "HIRED", "NOT_SELECTED"])
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
        .select("application_id, points, criterion:position_criteria(criterion_key, title)")
        .in("application_id", batch),
    ),
  );
  const [applicationPositionsResult, postingPositionsResult] = await Promise.all([
    applicantIds.length
      ? hr.supabase.from("applications").select("id, position_id").in("id", applicantIds)
      : Promise.resolve({ data: [], error: null }),
    hr.supabase.from("job_posting_positions")
      .select("position_id, weight_profile_id")
      .eq("job_id", posting.id),
  ]);
  const weightProfileIds = [...new Set((postingPositionsResult.data ?? []).map((row) => row.weight_profile_id))];
  const criterionWeightsResult = weightProfileIds.length
    ? await hr.supabase.from("position_criterion_weights")
        .select("profile_id, points, criterion:position_criteria(criterion_key, title)")
        .in("profile_id", weightProfileIds)
    : { data: [], error: null };
  const assessmentScores = assessmentScoreBatches.flatMap(
    (batch) => batch.data ?? [],
  );
  const assessmentScoresError =
    assessmentScoreBatches.find((batch) => batch.error)?.error ?? null;
  const [educationBatches, trainingBatches, experienceStandardsBatches, workExperienceBatches] =
    await Promise.all([
      Promise.all(scoreApplicantIdBatches.map((batch) =>
        hr.supabase.from("v_anonymized_application_education_points")
          .select("application_id, education_points").in("application_id", batch),
      )),
      Promise.all(scoreApplicantIdBatches.map((batch) =>
        hr.supabase.from("v_anonymized_application_training_points")
          .select("application_id, training_points").in("application_id", batch),
      )),
      Promise.all(scoreApplicantIdBatches.map((batch) =>
        hr.supabase.from("v_anonymized_application_experience_standards")
          .select("application_id, minimum_experience_increment_level, maximum_experience_points")
          .in("application_id", batch),
      )),
      Promise.all(scoreApplicantIdBatches.map((batch) =>
        hr.supabase.from("v_anonymized_work_experience")
          .select("application_id, date_from, date_to, is_gov_service, position_title", { count: "exact" })
          .in("application_id", batch).range(0, 999),
      )),
    ]);
  const remainingWorkExperiencePages = await Promise.all(
    workExperienceBatches.flatMap((firstPage, batchIndex) =>
      Array.from(
        { length: Math.max(0, Math.ceil((firstPage.count ?? 0) / 1000) - 1) },
        (_, index) =>
          hr.supabase.from("v_anonymized_work_experience")
            .select("application_id, date_from, date_to, is_gov_service, position_title")
            .in("application_id", scoreApplicantIdBatches[batchIndex])
            .range((index + 1) * 1000, (index + 2) * 1000 - 1),
      ),
    ),
  );
  workExperienceBatches.push(...remainingWorkExperiencePages);
  const rankingDataUnavailable = Boolean(
    assessmentScoresError ||
    applicationPositionsResult.error ||
    postingPositionsResult.error ||
    criterionWeightsResult.error ||
    [...educationBatches, ...trainingBatches, ...experienceStandardsBatches, ...workExperienceBatches]
      .some((batch) => batch.error),
  );
  const pointsByApplication = new Map<string, Map<string, number>>();
  const titleByCriterion = new Map<string, string>();
  for (const score of assessmentScores) {
    const key = score.criterion?.criterion_key;
    if (!key) continue;
    const points = pointsByApplication.get(score.application_id) ?? new Map<string, number>();
    points.set(key, Number(score.points));
    pointsByApplication.set(score.application_id, points);
    if (score.criterion?.title) titleByCriterion.set(key, score.criterion.title);
  }
  function addCalculatedPoints(applicationId: string, key: string, value: number | null) {
    if (value === null) return;
    const points = pointsByApplication.get(applicationId) ?? new Map<string, number>();
    if (!points.has(key)) points.set(key, Number(value));
    pointsByApplication.set(applicationId, points);
  }
  for (const batch of educationBatches) for (const row of batch.data ?? []) {
    addCalculatedPoints(row.application_id, "EDUCATION", row.education_points);
  }
  for (const batch of trainingBatches) for (const row of batch.data ?? []) {
    addCalculatedPoints(row.application_id, "TRAINING", row.training_points);
  }
  const positionByApplication = new Map(
    (applicationPositionsResult.data ?? []).map((row) => [row.id, row.position_id]),
  );
  const profileByPosition = new Map(
    (postingPositionsResult.data ?? []).map((row) => [row.position_id, row.weight_profile_id]),
  );
  const maximumPointsByProfileAndCriterion = new Map<string, number>();
  const criteriaByProfile = new Map<string, Map<string, { title: string; maximumPoints: number }>>();
  for (const weight of criterionWeightsResult.data ?? []) {
    const criterion = weight.criterion;
    const key = criterion?.criterion_key;
    if (!criterion || !key) continue;
    maximumPointsByProfileAndCriterion.set(`${weight.profile_id}:${key}`, Number(weight.points));
    const profileCriteria = criteriaByProfile.get(weight.profile_id) ?? new Map();
    profileCriteria.set(key, {
      title: criterion.title,
      maximumPoints: Number(weight.points),
    });
    criteriaByProfile.set(weight.profile_id, profileCriteria);
    titleByCriterion.set(key, criterion.title);
  }
  const workByApplication = new Map<string, NonNullable<(typeof workExperienceBatches)[number]["data"]>>();
  for (const batch of workExperienceBatches) for (const row of batch.data ?? []) {
    const records = workByApplication.get(row.application_id) ?? [];
    records.push(row);
    workByApplication.set(row.application_id, records);
  }
  for (const batch of experienceStandardsBatches) for (const row of batch.data ?? []) {
    if (row.minimum_experience_increment_level === null || row.maximum_experience_points === null) continue;
    const level = calculatePublicTeachingExperience(workByApplication.get(row.application_id) ?? []).incrementLevel;
    const difference = level - row.minimum_experience_increment_level;
    const factor = difference >= 10 ? 1 : difference >= 8 ? 0.8 : difference >= 6 ? 0.6
      : difference >= 4 ? 0.4 : difference >= 2 ? 0.2 : 0;
    addCalculatedPoints(row.application_id, "EXPERIENCE", Math.round(row.maximum_experience_points * factor * 100) / 100);
  }
  const totalPointsByApplication = new Map(
    [...pointsByApplication].map(([applicationId, points]): [string, number] => [
      applicationId,
      [...points.values()].reduce((sum, value) => sum + value, 0),
    ]),
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
    rankedApplicantIds.map(
      (applicationId, index): [string, number] => [applicationId, index + 1],
    ),
  );
  const applicantItems = applicants.map((applicant) => ({
    ...applicant,
    assessment_points: totalPointsByApplication.get(applicant.application_id) ?? null,
    assessment_rank: rankByApplicantId.get(applicant.application_id) ?? null,
    criterion_scores: (() => {
      const positionId = positionByApplication.get(applicant.application_id);
      const profileId = positionId ? profileByPosition.get(positionId) : null;
      const configuredCriteria = profileId ? criteriaByProfile.get(profileId) : null;
      const applicantPoints = pointsByApplication.get(applicant.application_id) ?? new Map<string, number>();
      const keys = new Set([
        ...applicantPoints.keys(),
        ...(configuredCriteria?.keys() ?? []),
      ]);
      return [...keys].map((key) => {
        const configured = configuredCriteria?.get(key);
        return {
          key,
          title: configured?.title ?? titleByCriterion.get(key) ?? key.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
          points: applicantPoints.get(key) ?? null,
          maximumPoints: configured?.maximumPoints ?? (profileId ? maximumPointsByProfileAndCriterion.get(`${profileId}:${key}`) ?? null : null),
        };
      }).sort((a, b) => a.title.localeCompare(b.title));
    })()
  }));
  const hiredCount = applicantItems.filter(
    (applicant) => applicant.application_status === "HIRED",
  ).length;
  const deadlineTimestamp = posting.deadline
    ? Date.parse(posting.deadline)
    : null;
  const hasValidDeadline =
    deadlineTimestamp !== null && Number.isFinite(deadlineTimestamp);
  // This is request-time data for the current page render.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const isOpen =
    posting.status === "OPEN" &&
    (!posting.deadline || (hasValidDeadline && deadlineTimestamp > now)) &&
    hiredCount < posting.slots;
  const displayStatus =
    posting.status === "DRAFT" ? "DRAFT" : isOpen ? "OPEN" : "CLOSED";
  const daysRemaining = hasValidDeadline
    ? daysUntilDeadline(posting.deadline!, now)
    : null;
  const deadlineLabel = hasValidDeadline
    ? formatDate(posting.deadline, "MMM D, YYYY · h:mm A")
    : null;
  const hiredPercent =
    posting.slots > 0
      ? Math.min(100, Math.round((hiredCount / posting.slots) * 100))
      : 0;

  return (
    <div className="mx-auto">
      <PageHeader
        title={posting.title}
        description={posting.description ?? undefined}
        actions={
          <Link
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[8px] border-[1.5px] border-primary px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href={`/hr/postings/${posting.id}/edit`}
          >
            Edit posting
          </Link>
        }
      />
      <Link
        className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        href="/hr/postings"
      >
        <span aria-hidden="true">←</span> Job postings
      </Link>

      <section
        aria-label="Posting status and hiring progress"
        className="mt-5 flex flex-col gap-3 rounded-sm border border-line bg-panel px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:px-5"
      >
        <span
          className={`inline-flex min-h-6 w-fit items-center rounded-full px-2.5 text-[11px] font-semibold ${
            displayStatus === "OPEN"
              ? "bg-success/15 text-success"
              : "border border-line bg-panel-muted text-muted-strong"
          }`}
        >
          {displayStatus === "DRAFT"
            ? "Draft"
            : displayStatus === "OPEN"
              ? "Open"
              : "Closed"}
        </span>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-ink">
            {hiredCount} of {posting.slots}
          </span>
          <span className="text-muted">slots filled</span>
          <div
            aria-label={`${hiredCount} of ${posting.slots} slots filled`}
            aria-valuemax={Math.max(posting.slots, 1)}
            aria-valuemin={0}
            aria-valuenow={Math.min(hiredCount, Math.max(posting.slots, 1))}
            className="ml-1 h-1.5 w-24 overflow-hidden rounded-full bg-line sm:w-28"
            role="progressbar"
          >
            <span
              className="block h-full rounded-full bg-success"
              style={{ width: `${hiredPercent}%` }}
            />
          </div>
        </div>
        <p className="text-sm text-muted">
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

      {posting.requirements && (
        <details className="mt-3 rounded-lg border border-line bg-panel px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold text-ink">
            View posting requirements
          </summary>
          <p className="mt-3 whitespace-pre-wrap leading-6 text-muted">
            {posting.requirements}
          </p>
        </details>
      )}

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
          slots={posting.slots}
        />
      )}
    </div>
  );
}

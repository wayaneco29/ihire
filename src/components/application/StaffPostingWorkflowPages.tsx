import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Database } from "@/types/database";
import { getAllSupabaseRows } from "@/utils/supabase-pagination";
import {
  StaffDecisionHistoryTable,
  StaffJobPostingTable,
  StaffRankedApplicantTable,
} from "./StaffPostingWorkflowTables";

type StaffSupabase = SupabaseClient<Database>;
type StaffBasePath = "/sds" | "/asds";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

function isAwaitingDecision(status: string) {
  return status === "QUALIFIED";
}

function isUnderReview(status: string) {
  return [
    "SUBMITTED",
    "UNDER_EVALUATION",
    "ASSESSMENT_SCHEDULED",
    "ASSESSMENT_SCORED",
  ].includes(status);
}

export async function StaffJobPostingsPage({
  supabase,
  basePath,
  workspace,
}: Readonly<{
  supabase: StaffSupabase;
  basePath: StaffBasePath;
  workspace: "SDS" | "ASDS";
}>) {
  const [postingsResult, applicationsResult] = await Promise.all([
    getAllSupabaseRows((from, to) =>
      supabase
        .from("job_postings")
        .select("id, title, status, slots, deadline, created_at", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    getAllSupabaseRows((from, to) =>
      supabase
        .from("v_staff_application_reviews")
        .select("application_id, job_id, application_status", {
          count: "exact",
        })
        .order("application_id", { ascending: true })
        .range(from, to),
    ),
  ]);

  if (postingsResult.error || applicationsResult.error) {
    return (
      <>
        <PageHeader
          eyebrow={`${workspace} workspace`}
          title="Job postings"
          description="Choose a posting to review its applicants and record hiring decisions."
        />
        <EmptyState
          title="Job postings unavailable"
          description="Refresh the page to try loading postings and applicant counts again."
        />
      </>
    );
  }

  const postings = postingsResult.data ?? [];
  const postingIds = postings.map((posting) => posting.id);
  const positionLinksResult = postingIds.length
    ? await supabase
        .from("job_posting_positions")
        .select("job_id, position_id")
        .in("job_id", postingIds)
    : { data: [], error: null };
  const positionIds = [
    ...new Set(
      (positionLinksResult.data ?? []).map((link) => link.position_id),
    ),
  ];
  const positionsResult = positionIds.length
    ? await supabase.from("positions").select("id, title").in("id", positionIds)
    : { data: [], error: null };

  if (positionLinksResult.error || positionsResult.error) {
    return (
      <>
        <PageHeader
          eyebrow={`${workspace} workspace`}
          title="Job postings"
          description="Choose a posting to review its applicants and record hiring decisions."
        />
        <EmptyState
          title="Posting details unavailable"
          description="Refresh the page to try loading the positions for each posting again."
        />
      </>
    );
  }

  const positionNames = new Map(
    (positionsResult.data ?? []).map((position) => [
      position.id,
      position.title,
    ]),
  );
  const namesByPosting = new Map<string, string[]>();
  for (const link of positionLinksResult.data ?? []) {
    const name = positionNames.get(link.position_id);
    if (!name) continue;
    const names = namesByPosting.get(link.job_id) ?? [];
    names.push(name);
    namesByPosting.set(link.job_id, names);
  }

  const statsByPosting = new Map<
    string,
    {
      total: number;
      awaitingDecision: number;
      underReview: number;
      hired: number;
    }
  >();
  for (const application of applicationsResult.data ?? []) {
    const stats = statsByPosting.get(application.job_id) ?? {
      total: 0,
      awaitingDecision: 0,
      underReview: 0,
      hired: 0,
    };
    stats.total += 1;
    if (isAwaitingDecision(application.application_status))
      stats.awaitingDecision += 1;
    if (isUnderReview(application.application_status)) stats.underReview += 1;
    if (application.application_status === "HIRED") stats.hired += 1;
    statsByPosting.set(application.job_id, stats);
  }

  const jobPostings = postings.map((posting) => ({
    ...posting,
    positionNames: [...new Set(namesByPosting.get(posting.id) ?? [])].sort(),
    ...(statsByPosting.get(posting.id) ?? {
      total: 0,
      awaitingDecision: 0,
      underReview: 0,
      hired: 0,
    }),
  }));

  return (
    <div className="mx-auto">
      <PageHeader
        eyebrow={`${workspace} workspace`}
        title="Job postings"
        description="Choose a posting to review its applicants and record hiring decisions."
      />
      <StaffJobPostingTable basePath={basePath} postings={jobPostings} />
    </div>
  );
}

export async function StaffJobPostingApplicantsPage({
  postingId,
  supabase,
  basePath,
  workspace,
}: Readonly<{
  postingId: string;
  supabase: StaffSupabase;
  basePath: StaffBasePath;
  workspace: "SDS" | "ASDS";
}>) {
  if (!UUID_PATTERN.test(postingId)) notFound();

  const postingResult = await supabase
    .from("job_postings")
    .select("id, title, status, slots, deadline")
    .eq("id", postingId)
    .maybeSingle();
  const applicationsResult = await getAllSupabaseRows((from, to) =>
    supabase
      .from("v_staff_application_reviews")
      .select(
        "application_id, applicant_name, applicant_number, application_status, applied_at, job_id, job_title, position_title",
        { count: "exact" },
      )
      .eq("job_id", postingId)
      .order("applied_at", { ascending: false })
      .order("application_id", { ascending: true })
      .range(from, to),
  );

  if (!postingResult.data || postingResult.error) notFound();
  if (applicationsResult.error) {
    return (
      <>
        <PageHeader
          eyebrow={`${workspace} workspace · Job posting`}
          title={postingResult.data.title}
          description="Review applicant scores and PDS records for this posting."
          backHref={`${basePath}/postings`}
          backLabel="All job postings"
        />
        <EmptyState
          title="Applicants unavailable"
          description="Refresh the page to try loading applicants for this posting again."
        />
      </>
    );
  }

  const applications = applicationsResult.data ?? [];
  const applicationIds = applications.map(
    (application) => application.application_id,
  );
  const scoreResult = applicationIds.length
    ? await getAllSupabaseRows((from, to) =>
        supabase
          .from("v_staff_application_scores")
          .select(
            "application_id, maximum_points, minimum_total_points, is_complete, total_points",
            { count: "exact" },
          )
          .in("application_id", applicationIds)
          .order("application_id", { ascending: true })
          .range(from, to),
      )
    : { data: [], error: null };

  const scoreByApplication = new Map<
    string,
    {
      totalPoints: number;
      maximumPoints: number;
      minimumPoints: number | null;
      isComplete: boolean;
    }
  >();
  for (const row of scoreResult.data ?? []) {
    const score = scoreByApplication.get(row.application_id) ?? {
      totalPoints: row.total_points,
      maximumPoints: 0,
      minimumPoints: row.minimum_total_points,
      isComplete: row.is_complete,
    };
    score.maximumPoints += row.maximum_points;
    score.totalPoints = row.total_points;
    score.minimumPoints = row.minimum_total_points;
    score.isComplete = row.is_complete;
    scoreByApplication.set(row.application_id, score);
  }

  const applicants = applications.map((application) => {
    const score = scoreByApplication.get(application.application_id);
    const hasRankableScore = Boolean(
      score?.isComplete && score.maximumPoints > 0,
    );
    return {
      ...application,
      totalPoints: hasRankableScore ? score!.totalPoints : null,
      maximumPoints: hasRankableScore ? score!.maximumPoints : null,
      normalizedScore: hasRankableScore
        ? Math.round((score!.totalPoints / score!.maximumPoints) * 1_000_000) /
          10_000
        : null,
      minimumPoints: score?.minimumPoints ?? null,
      isComplete: hasRankableScore,
      rank: null as number | null,
    };
  });

  const orderedApplicants = [...applicants].sort((first, second) => {
    if (first.normalizedScore === null && second.normalizedScore !== null)
      return 1;
    if (first.normalizedScore !== null && second.normalizedScore === null)
      return -1;
    if (first.normalizedScore !== null && second.normalizedScore !== null) {
      if (first.normalizedScore !== second.normalizedScore) {
        return second.normalizedScore - first.normalizedScore;
      }
    }
    return first.applied_at.localeCompare(second.applied_at);
  });

  const rankedApplicants = orderedApplicants.map((applicant) => ({
    ...applicant,
    rank:
      applicant.normalizedScore === null
        ? null
        : orderedApplicants.findIndex(
            (candidate) =>
              candidate.normalizedScore === applicant.normalizedScore,
          ) + 1,
  }));

  const positionLabels = [
    ...new Set(
      applications
        .map((application) => application.position_title)
        .filter((title): title is string => Boolean(title)),
    ),
  ];
  const description = positionLabels.length
    ? `Applicants for ${positionLabels.join(", ")}. Review scores and PDS records, then ${workspace === "SDS" ? "record a hiring decision with remarks" : "view applicant records"}.`
    : `Review scores and PDS records, then ${workspace === "SDS" ? "record a hiring decision with remarks" : "view applicant records"}.`;

  return (
    <div className="mx-auto">
      <PageHeader
        eyebrow={`${workspace} workspace · Job posting`}
        title={postingResult.data.title}
        description={description}
        backHref={`${basePath}/postings`}
        backLabel="All job postings"
      />
      <StaffRankedApplicantTable
        applicants={rankedApplicants}
        basePath={basePath}
        canHire={workspace === "SDS"}
        posting={postingResult.data}
        scoresUnavailable={Boolean(scoreResult.error)}
      />
    </div>
  );
}

export async function StaffDecisionHistoryPage({
  supabase,
  basePath,
  workspace,
}: Readonly<{
  supabase: StaffSupabase;
  basePath: StaffBasePath;
  workspace: "SDS" | "ASDS";
}>) {
  const { data, error } = await getAllSupabaseRows((from, to) =>
    supabase
      .from("v_staff_sds_decision_history")
      .select(
        "decision_id, application_id, job_id, applicant_name, applicant_number, job_title, position_title, decision, decided_at, decision_remarks, decided_by_email",
        { count: "exact" },
      )
      .order("decided_at", { ascending: false })
      .order("decision_id", { ascending: false })
      .range(from, to),
  );

  if (error) {
    return (
      <>
        <PageHeader
          eyebrow={`${workspace} workspace`}
          title="Decision history"
          description="Review hiring decisions recorded by the School Division Superintendent."
        />
        <EmptyState
          title="Decision history unavailable"
          description="Refresh the page to try loading the decision log again."
        />
      </>
    );
  }

  return (
    <div className="mx-auto">
      <PageHeader
        eyebrow={`${workspace} workspace`}
        title="Decision history"
        description="Review hiring decisions recorded by the School Division Superintendent."
      />
      <StaffDecisionHistoryTable basePath={basePath} decisions={data ?? []} />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHrContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
import { getPostingDisplayStatus } from "@/utils/job-posting-status";
import { getPostingApplicantStatuses } from "./data";
import { PostingsManager } from "./components/PostingsManager";

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

export default async function HrPostingsPage() {
  const hr = await getHrContext();
  if (!hr) redirect("/");
  const { data: postings, error } = await hr.supabase
    .from("job_postings")
    .select("id, title, description, slots, status, deadline, created_at")
    .order("created_at", { ascending: false });
  if (error)
    return (
      <>
        <PageHeader
          description="Create positions and track evaluator outcomes for each posting."
          title="Job postings"
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to try again."
            title="Postings unavailable"
          />
        </div>
      </>
    );

  const ids = (postings ?? []).map((posting) => posting.id);
  const applicationsResult = await getPostingApplicantStatuses(
    hr.supabase,
    ids,
  );
  if (applicationsResult.error) {
    return (
      <>
        <PageHeader
          title="Job postings"
          description="Create positions and track evaluator outcomes for each posting."
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to load applicant totals again."
            title="Applicant totals unavailable"
          />
        </div>
      </>
    );
  }
  const applications = applicationsResult.data ?? [];
  const stats = new Map<
    string,
    { total: number; qualified: number; hired: number }
  >();
  for (const application of applications ?? []) {
    const row = stats.get(application.job_id) ?? {
      total: 0,
      qualified: 0,
      hired: 0,
    };
    row.total += 1;
    if (application.application_status === "QUALIFIED") row.qualified += 1;
    if (application.application_status === "HIRED") row.hired += 1;
    stats.set(application.job_id, row);
  }

  // This is request-time data for the current page render.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const postingItems = (postings ?? []).map((posting) => {
    const postingStats = stats.get(posting.id) ?? {
      total: 0,
      qualified: 0,
      hired: 0,
    };
    const deadlineTimestamp = posting.deadline
      ? Date.parse(posting.deadline)
      : null;
    const hasValidDeadline =
      deadlineTimestamp !== null && Number.isFinite(deadlineTimestamp);
    const displayStatus = getPostingDisplayStatus(
      {
        status: posting.status,
        deadline: posting.deadline,
        hired: postingStats.hired,
        slots: posting.slots,
      },
      now,
    );

    return {
      ...posting,
      ...postingStats,
      status: displayStatus,
      deadlineLabel: posting.deadline ? formatDate(posting.deadline) : null,
      daysRemaining:
        posting.deadline !== null && hasValidDeadline
          ? daysUntilDeadline(posting.deadline, now)
          : null,
    };
  });

  return (
    <div className="mx-auto">
      <PageHeader
        title="Job postings"
        description="Create positions and track evaluator outcomes for each posting."
        actions={
          <Link
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-[8px] bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href="/hr/postings/new"
          >
            Create posting
          </Link>
        }
      />
      {postingItems.length ? (
        <PostingsManager postings={postingItems} />
      ) : (
        <div className="mt-7">
          <EmptyState
            description="Your postings will appear here, with applicant and qualification counts."
            title="No postings yet"
          />
        </div>
      )}
    </div>
  );
}

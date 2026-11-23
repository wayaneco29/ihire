import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { getHrContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
import { getPostingDisplayStatus } from "@/utils/job-posting-status";
import { getPostingApplicantStatuses } from "../postings/data";
import { HrDashboardView } from "./components/HrDashboardView";

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

async function HrDashboardContent() {
  await connection();

  const hr = await getHrContext();
  if (!hr) redirect("/");

  const { data: postings, error: postingsError } = await hr.supabase
    .from("job_postings")
    .select("id, title, slots, status, deadline")
    .order("created_at", { ascending: false });
  const jobIds = (postings ?? []).map((posting) => posting.id);
  const applicationsResult = await getPostingApplicantStatuses(
    hr.supabase,
    jobIds,
  );

  if (postingsError || applicationsResult.error) {
    return (
      <div className="mt-7">
        <EmptyState
          description="Refresh the page to try loading your hiring summary again."
          title="Dashboard unavailable"
        />
      </div>
    );
  }

  const applications = applicationsResult.data ?? [];
  const applicationStats = new Map<
    string,
    { applicants: number; hired: number }
  >();

  for (const application of applications) {
    const stats = applicationStats.get(application.job_id) ?? {
      applicants: 0,
      hired: 0,
    };
    stats.applicants += 1;
    if (application.application_status === "HIRED") stats.hired += 1;
    applicationStats.set(application.job_id, stats);
  }

  // This is request-time data, after connection() opts out of prerendering.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const postingProgress = [...(postings ?? [])]
    .sort((a, b) => {
      const leftDeadline = a.deadline ? Date.parse(a.deadline) : Infinity;
      const rightDeadline = b.deadline ? Date.parse(b.deadline) : Infinity;
      const leftSortValue = Number.isFinite(leftDeadline)
        ? leftDeadline
        : Infinity;
      const rightSortValue = Number.isFinite(rightDeadline)
        ? rightDeadline
        : Infinity;
      return leftSortValue - rightSortValue;
    })
    .map((posting) => {
      const stats = applicationStats.get(posting.id) ?? {
        applicants: 0,
        hired: 0,
      };
      const deadlineTimestamp = posting.deadline
        ? Date.parse(posting.deadline)
        : null;
      const hasValidDeadline =
        deadlineTimestamp !== null && Number.isFinite(deadlineTimestamp);
      const status = getPostingDisplayStatus(
        {
          status: posting.status,
          deadline: posting.deadline,
          hired: stats.hired,
          slots: posting.slots,
        },
        now,
      );

      return {
        id: posting.id,
        title: posting.title,
        status,
        deadlineDate: hasValidDeadline ? formatDate(posting.deadline) : null,
        deadlinePassed:
          deadlineTimestamp !== null &&
          Number.isFinite(deadlineTimestamp) &&
          deadlineTimestamp <= now,
        daysRemaining:
          posting.deadline !== null && hasValidDeadline
            ? daysUntilDeadline(posting.deadline, now)
            : null,
        applicants: stats.applicants,
      };
    });

  const pendingCount = applications.filter(
    (application) => application.application_status === "QUALIFIED",
  ).length;
  const hiredCount = applications.filter(
    (application) => application.application_status === "HIRED",
  ).length;

  return (
    <HrDashboardView
      hiredCount={hiredCount}
      pendingCount={pendingCount}
      postings={postingProgress}
      totalApplicants={applications.length}
    />
  );
}

export default function HrDashboardPage() {
  return (
    <>
      <PageHeader
        title="Hiring dashboard"
        description="See applicant progress and manage your job postings."
        actions={
          <Link
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-[8px] bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href="/hr/postings/new"
          >
            Create posting
          </Link>
        }
      />
      <Suspense
        fallback={
          <SkeletonLoader
            label="Loading hiring dashboard"
            rows={5}
            variant="dashboard"
          />
        }
      >
        <HrDashboardContent />
      </Suspense>
    </>
  );
}

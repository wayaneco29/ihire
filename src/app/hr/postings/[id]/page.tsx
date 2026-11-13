import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHrContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
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
          .order("applied_at", { ascending: false })
          .range(offset, offset + 999),
      ),
    );
    applicantsError =
      remainingPages.find((result) => result.error)?.error ?? null;
    applicants.push(...remainingPages.flatMap((result) => result.data ?? []));
  }

  const applicantItems = applicants;
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
        <PostingApplicants applicants={applicantItems} slots={posting.slots} />
      )}
    </div>
  );
}

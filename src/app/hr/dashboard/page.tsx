import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getHrContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";

async function HrDashboardContent() {
  await connection();

  const hr = await getHrContext();
  if (!hr) redirect("/login");

  const { data: postings, error: postingsError } = await hr.supabase
    .from("job_postings")
    .select("id, title, slots, status, deadline, created_at")
    .order("created_at", { ascending: false });
  const jobIds = (postings ?? []).map((posting) => posting.id);
  const applicationsResult = jobIds.length
    ? await hr.supabase
        .from("v_anonymized_applicants")
        .select("job_id, application_status")
        .in("job_id", jobIds)
    : { data: [], error: null };

  if (postingsError || applicationsResult.error) {
    return (
      <>
        <PageHeader eyebrow="HR workspace" title="Hiring dashboard" />
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to try loading your hiring summary again."
            title="Dashboard unavailable"
          />
        </div>
      </>
    );
  }

  const applications = applicationsResult.data ?? [];
  const pendingCount = applications.filter((application) =>
    ["SUBMITTED", "UNDER_EVALUATION", "ASSESSMENT_SCHEDULED"].includes(application.application_status),
  ).length;
  const hiredCount = applications.filter(
    (application) => application.application_status === "HIRED",
  ).length;
  const now = Date.now();
  const openPostings = (postings ?? []).filter(
    (posting) =>
      posting.status === "OPEN" &&
      (!posting.deadline || Date.parse(posting.deadline) > now) &&
      applications.filter(
        (application) =>
          application.job_id === posting.id &&
          application.application_status === "HIRED",
      ).length < posting.slots,
  ).length;
  const metrics = [
    { label: "Total postings", value: postings?.length ?? 0 },
    { label: "Open postings", value: openPostings },
    { label: "Total applicants", value: applications.length },
    { label: "Pending evaluation", value: pendingCount },
    { label: "Hired", value: hiredCount },
  ];

  return (
    <>
      <PageHeader
        actions={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
            href="/hr/postings/new"
          >
            Create posting
          </Link>
        }
        description="See applicant progress and manage your job postings."
        eyebrow="HR workspace"
        title="Hiring dashboard"
      />
      <section
        aria-label="Hiring totals"
        className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        {metrics.map((metric) => (
          <article
            className="rounded-sm border border-line bg-panel p-5"
            key={metric.label}
          >
            <p className="text-sm font-medium text-muted">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              {metric.value}
            </p>
          </article>
        ))}
      </section>
      <section className="mt-9">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Posting progress</h2>
            <p className="mt-1 text-sm text-muted">
              Qualified count is shown against all submitted applications.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center rounded-sm px-2 text-sm font-semibold text-primary hover:bg-primary-light hover:text-primary-dark"
            href="/hr/postings"
          >
            All postings
          </Link>
        </div>
        {!postings?.length ? (
          <EmptyState
            action={
              <Link
                className="inline-flex min-h-11 items-center rounded-sm px-3 font-semibold text-primary hover:bg-primary-light"
                href="/hr/postings/new"
              >
                Create your first posting
              </Link>
            }
            description="Create a posting to begin receiving applications."
            title="No job postings yet"
          />
        ) : (
          <ul className="grid gap-3">
            {postings.slice(0, 5).map((posting) => {
              const jobApplications = applications.filter(
                (application) => application.job_id === posting.id,
              );
              const qualified = jobApplications.filter(
                (application) => application.application_status === "QUALIFIED",
              ).length;
              return (
                <li key={posting.id}>
                  <Link
                    className="flex flex-col gap-3 rounded-sm border border-line bg-panel p-5 transition hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
                    href={`/hr/postings/${posting.id}`}
                  >
                    <div>
                      <h3 className="font-semibold text-ink">
                        {posting.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {jobApplications.length} applicants · {qualified}{" "}
                        qualified · {posting.slots} slots
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <WorkflowStatusTag status={posting.status} />
                      <span className="text-sm text-muted">
                        {posting.deadline
                          ? `Deadline ${formatDate(posting.deadline)}`
                          : "No deadline"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

export default function HrDashboardPage() {
  return (
    <Suspense
      fallback={
        <div
          aria-live="polite"
          className="py-8 text-sm text-muted"
          role="status"
        >
          Loading hiring dashboard…
        </div>
      }
    >
      <HrDashboardContent />
    </Suspense>
  );
}

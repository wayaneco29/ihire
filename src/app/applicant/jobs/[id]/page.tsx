import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getApplicantContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
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
      .select("id, status, applied_at")
      .eq("job_id", id)
      .eq("applicant_id", applicant.applicant.id)
      .maybeSingle(),
  ]);

  if (!job || (job.deadline && Date.parse(job.deadline) <= CURRENT_TIME_MS))
    notFound();

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
                <WorkflowStatusTag status={application.status} />
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  href={`/applicant/applications/${application.id}`}
                >
                  View your application
                </Link>
              </div>
            ) : applicant.profile.has_submitted_pds ? (
              <ApplyButton jobId={job.id} />
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

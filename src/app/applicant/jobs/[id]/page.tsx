import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
      <PageHeader
        description="Review the position details before submitting your application."
        eyebrow="Open job posting"
        title={job.title}
      />
      <article className="mt-7 rounded-2xl border border-line bg-panel p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <WorkflowStatusTag status="OPEN" />
          <span className="text-sm text-muted">
            Posted {formatDate(job.created_at)}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 rounded-md bg-panel-muted p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted">
              Available positions
            </dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{job.slots}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">
              Application deadline
            </dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {job.deadline ? formatDate(job.deadline) : "Not specified"}
            </dd>
          </div>
        </dl>

        <section className="mt-7">
          <h2 className="text-base font-semibold text-ink">Position details</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink">
            {job.description}
          </p>
        </section>

        {job.requirements && (
          <section className="mt-7 border-t border-line-subtle pt-6">
            <h2 className="text-base font-semibold text-ink">Requirements</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink">
              {job.requirements}
            </p>
          </section>
        )}

        <section className="mt-8 flex flex-col gap-4 border-t border-line-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-6 text-muted">
            Your latest submitted PDS will be attached to this application. HR
            and evaluators see your applicant number and assessment data.
          </p>
          {application ? (
            <div className="flex flex-wrap items-center gap-3">
              <WorkflowStatusTag status={application.status} />
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary px-4 text-sm font-semibold text-primary transition hover:bg-primary-light"
                href={`/applicant/applications/${application.id}`}
              >
                View your application
              </Link>
            </div>
          ) : applicant.profile.has_submitted_pds ? (
            <ApplyButton jobId={job.id} />
          ) : (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark"
              href="/applicant/pds"
            >
              Complete your PDS first
            </Link>
          )}
        </section>
      </article>
      <Link
        className="mt-5 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-light hover:text-primary-dark"
        href="/applicant/jobs"
      >
        Back to jobs
      </Link>
    </>
  );
}

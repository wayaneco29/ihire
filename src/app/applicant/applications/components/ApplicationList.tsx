import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";

export type ApplicantApplication = {
  id: string;
  status: string;
  applied_at: string;
  jobTitle: string;
};

export function ApplicationList({ applications }: { applications: ApplicantApplication[] }) {
  if (!applications.length) {
    return (
      <div className="mt-7">
        <EmptyState
          action={
            <Link className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark" href="/applicant/jobs">
              Browse open jobs
            </Link>
          }
          description="Your applications will appear here after you apply to a posting."
          title="No applications yet"
        />
      </div>
    );
  }

  return (
    <ul className="mt-7 grid gap-4 lg:grid-cols-2">
      {applications.map((application) => (
        <li className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" key={application.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">{application.jobTitle}</h2>
              <p className="mt-2 text-sm text-muted">Applied {formatDate(application.applied_at)}</p>
            </div>
            <WorkflowStatusTag status={application.status} />
          </div>
          <Link
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg border border-primary px-4 text-sm font-semibold text-primary transition hover:bg-primary-light"
            href={`/applicant/applications/${application.id}`}
          >
            View application
          </Link>
        </li>
      ))}
    </ul>
  );
}

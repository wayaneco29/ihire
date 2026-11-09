import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { getApplicantContext } from "@/lib/auth/server";
import { ApplicationList } from "./components/ApplicationList";

export default async function ApplicantApplicationsPage() {
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/login");

  const applicationsResponse = await applicant.supabase
    .from("applications")
    .select("id, job_id, status, applied_at")
    .eq("applicant_id", applicant.applicant.id)
    .order("applied_at", { ascending: false });
  const applications = applicationsResponse.data ?? [];
  const error = applicationsResponse.error;

  const jobIds = [
    ...new Set(applications.map((application) => application.job_id)),
  ];
  const jobsResponse = jobIds.length
    ? await applicant.supabase
        .from("job_postings")
        .select("id, title")
        .in("id", jobIds)
    : { data: [] as Array<{ id: string; title: string }> };
  const jobs = jobsResponse.data ?? [];
  const titles = new Map(jobs.map((job) => [job.id, job.title]));
  const list = (applications ?? []).map((application) => ({
    id: application.id,
    status: application.status,
    applied_at: application.applied_at,
    jobTitle: titles.get(application.job_id) ?? "Job posting",
  }));

  return (
    <>
      <PageHeader
        actions={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
            href="/applicant/jobs"
          >
            Browse jobs
          </Link>
        }
        description="Follow each application from submission through its latest review."
        eyebrow="Applicant workspace"
        title="Your applications"
      />
      {error ? (
        <div
          className="mt-7 rounded-sm border border-danger/20 bg-danger/10 p-5 text-sm text-danger"
          role="alert"
        >
          Your applications could not be loaded right now. Please refresh and
          try again.
        </div>
      ) : (
        <ApplicationList applications={list} />
      )}
    </>
  );
}

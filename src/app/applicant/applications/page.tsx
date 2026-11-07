import { redirect } from "next/navigation";
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

  const jobIds = [...new Set(applications.map((application) => application.job_id))];
  const jobsResponse = jobIds.length
    ? await applicant.supabase.from("job_postings").select("id, title").in("id", jobIds)
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
        description="Review the current status of each job application."
        eyebrow="Applicant workspace"
        title="My applications"
      />
      {error ? (
        <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
          Your applications could not be loaded right now. Please refresh and try again.
        </div>
      ) : <ApplicationList applications={list} />}
    </>
  );
}

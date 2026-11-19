import { connection } from "next/server";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getApplicantContext } from "@/lib/auth/server";
import { JobListClient } from "./components/JobListClient";

export default async function ApplicantJobsPage() {
  await connection();

  const applicant = await getApplicantContext();
  if (!applicant) redirect("/");

  const [postingsResult, applicationsResult] = await Promise.all([
    applicant.supabase
      .from("job_postings")
      .select("id, title, description, requirements, slots, deadline")
      .eq("status", "OPEN")
      .order("created_at", { ascending: false }),
    applicant.supabase
      .from("applications")
      .select("job_id")
      .eq("applicant_id", applicant.applicant.id),
  ]);

  // This is request-time data, after connection() opts out of prerendering.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const appliedJobIds = new Set(
    (applicationsResult.data ?? []).map((application) => application.job_id),
  );
  const jobs = (postingsResult.data ?? [])
    .filter(
      (posting) => !posting.deadline || Date.parse(posting.deadline) > nowMs,
    )
    .map((posting) => ({ ...posting, applied: appliedJobIds.has(posting.id) }));

  return (
    <>
      <PageHeader
        description="Explore open positions from the Division of Southern Leyte."
        eyebrow="Applicant workspace"
        title="Browse jobs"
      />
      {postingsResult.error ? (
        <div
          className="mt-7 rounded-sm border border-danger/20 bg-danger/10 p-5 text-sm text-danger"
          role="alert"
        >
          Job postings could not be loaded right now. Please refresh and try
          again.
        </div>
      ) : applicationsResult.error ? (
        <div
          className="mt-7 rounded-sm border border-danger/20 bg-danger/10 p-5 text-sm text-danger"
          role="alert"
        >
          Your application status could not be checked, so jobs cannot be shown
          safely right now. Please refresh and try again.
        </div>
      ) : jobs.length ? (
        <JobListClient jobs={jobs} nowMs={nowMs} />
      ) : (
        <div className="mt-7">
          <EmptyState
            description="Check back later for new opportunities."
            title="No open postings right now"
          />
        </div>
      )}
    </>
  );
}

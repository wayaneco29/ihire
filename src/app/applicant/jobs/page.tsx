import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getApplicantContext } from "@/lib/auth/server";
import { JobListClient } from "./components/JobListClient";

const CURRENT_TIME_MS = Date.now();

export default async function ApplicantJobsPage() {
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/login");

  const [{ data: postings, error }, { data: applications }] = await Promise.all([
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

  const appliedJobIds = new Set((applications ?? []).map((application) => application.job_id));
  const jobs = (postings ?? [])
    .filter((posting) => !posting.deadline || new Date(posting.deadline).getTime() > CURRENT_TIME_MS)
    .map((posting) => ({ ...posting, applied: appliedJobIds.has(posting.id) }));

  return (
    <>
      <PageHeader
        description="Explore open positions from the Division of Southern Leyte."
        eyebrow="Applicant workspace"
        title="Browse jobs"
      />
      {error ? (
        <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
          Job postings could not be loaded right now. Please refresh and try again.
        </div>
      ) : jobs.length ? (
        <JobListClient jobs={jobs} nowMs={CURRENT_TIME_MS} />
      ) : (
        <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="font-semibold text-ink">No open postings right now</h2>
          <p className="mt-2 text-sm text-muted">Check back later for new opportunities.</p>
        </div>
      )}
    </>
  );
}

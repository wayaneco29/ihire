import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { getApplicantContext } from "@/lib/auth/server";
import { formatPositionLabel } from "@/utils/format-position-track";
import { ApplicationList } from "./components/ApplicationList";

export default async function ApplicantApplicationsPage() {
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/");

  const applicationsResponse = await applicant.supabase
    .from("applications")
    .select(
      "id, job_id, position_id, status, applied_at, scheduled_assessment_at",
    )
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
  const positionIds = [
    ...new Set(
      applications
        .map((application) => application.position_id)
        .filter((positionId): positionId is string => positionId !== null),
    ),
  ];
  const positionsResponse = positionIds.length
    ? await applicant.supabase
        .from("positions")
        .select("id, title, application_type(name)")
        .in("id", positionIds)
    : { data: [], error: null };
  const positionTitles = new Map(
    (positionsResponse.data ?? []).map((position) => [
      position.id,
      formatPositionLabel(
        position.title,
        position.application_type?.name ?? "",
      ),
    ]),
  );
  const list = (applications ?? []).map((application) => ({
    id: application.id,
    status: application.status,
    applied_at: application.applied_at,
    scheduled_assessment_at: application.scheduled_assessment_at,
    jobTitle: titles.get(application.job_id) ?? "Job posting",
    positionLabel: application.position_id
      ? (positionTitles.get(application.position_id) ?? "Position unavailable")
      : "Position not recorded",
  }));
  const inReviewCount = list.filter((application) =>
    ["SUBMITTED", "UNDER_EVALUATION", "ASSESSMENT_SCHEDULED", "ASSESSMENT_SCORED"].includes(
      application.status,
    ),
  ).length;
  const hiredCount = list.filter(
    (application) => application.status === "HIRED",
  ).length;
  const qualifiedCount = list.filter(
    (application) => application.status === "QUALIFIED",
  ).length;
  const summary = list.length
    ? `${list.length} submitted. ${inReviewCount} in review, ${hiredCount} hired, ${qualifiedCount ? `${qualifiedCount} qualified` : "none qualified yet"}.`
    : "No applications submitted yet.";

  return (
    <div className="mx-auto">
      <PageHeader
        actions={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
            href="/applicant/jobs"
          >
            Browse jobs
          </Link>
        }
        description={summary}
        title="Your applications"
      />
      {error || positionsResponse.error ? (
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
    </div>
  );
}

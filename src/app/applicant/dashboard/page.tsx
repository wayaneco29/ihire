import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getApplicantContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
import { formatPositionLabel } from "@/utils/format-position-track";
import { DashboardSections } from "./components/DashboardSections";

export default async function ApplicantDashboardPage() {
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/login");

  const [
    pdsResult,
    applicationsResult,
    documentsResult,
    typesResult,
    notificationsResult,
    unreadNotificationsResult,
  ] = await Promise.all([
    applicant.supabase
      .from("pds_versions")
      .select("id, status, version_no, submitted_at, updated_at")
      .eq("applicant_id", applicant.applicant.id)
      .order("version_no", { ascending: false })
      .limit(3),
    applicant.supabase
      .from("applications")
      .select("id, job_id, position_id, status, applied_at")
      .eq("applicant_id", applicant.applicant.id)
      .order("applied_at", { ascending: false }),
    applicant.supabase
      .from("documents")
      .select("id, document_type_id, status, uploaded_at, version")
      .eq("applicant_id", applicant.applicant.id)
      .order("uploaded_at", { ascending: false })
      .limit(100),
    applicant.supabase.from("document_types").select("id, name"),
    applicant.supabase
      .from("notifications")
      .select("id, title, body, created_at, is_read")
      .eq("user_id", applicant.user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    applicant.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", applicant.user.id)
      .eq("is_read", false),
  ]);

  const applications = applicationsResult.data ?? [];
  const jobIds = [
    ...new Set(applications.map((application) => application.job_id)),
  ];
  const jobsResult = jobIds.length
    ? await applicant.supabase
        .from("job_postings")
        .select("id, title")
        .in("id", jobIds)
    : { data: [], error: null };
  const jobTitles = new Map(
    (jobsResult.data ?? []).map((job) => [job.id, job.title] as const),
  );
  const positionIds = [
    ...new Set(
      applications
        .map((application) => application.position_id)
        .filter((positionId): positionId is string => positionId !== null),
    ),
  ];
  const positionsResult = positionIds.length
    ? await applicant.supabase
        .from("positions")
        .select("id, title, application_type(name)")
        .in("id", positionIds)
    : { data: [], error: null };
  const positionTitles = new Map(
    (positionsResult.data ?? []).map(
      (position) =>
        [
          position.id,
          formatPositionLabel(
            position.title,
            position.application_type?.name ?? "",
          ),
        ] as const,
    ),
  );
  const dashboardApplications = applications.map((application) => ({
    ...application,
    jobTitle: jobTitles.get(application.job_id) ?? "Job posting",
    positionLabel: application.position_id
      ? positionTitles.get(application.position_id) ?? "Position unavailable"
      : "Position not recorded",
  }));

  const documentTypes = new Map(
    (typesResult.data ?? []).map((type) => [type.id, type.name] as const),
  );
  const latestDocuments = new Map<
    string,
    {
      id: string;
      status: string;
      uploaded_at: string;
      version: number;
      typeName: string;
    }
  >();
  for (const document of documentsResult.data ?? []) {
    if (!latestDocuments.has(document.document_type_id)) {
      latestDocuments.set(document.document_type_id, {
        id: document.id,
        status: document.status,
        uploaded_at: document.uploaded_at,
        version: document.version,
        typeName: documentTypes.get(document.document_type_id) ?? "Document",
      });
    }
  }

  const versions = pdsResult.data ?? [];
  const draft = versions.find((version) => version.status === "DRAFT");
  const submitted = versions.find((version) => version.status === "SUBMITTED");
  const pdsStatus = pdsResult.error
    ? "UNAVAILABLE"
    : draft
      ? "DRAFT"
      : submitted
        ? "SUBMITTED"
        : "NOT_STARTED";
  const unreadCount = unreadNotificationsResult.count ?? 0;
  const latestApplication = dashboardApplications[0] ?? null;
  const secondaryApplications = dashboardApplications.slice(1);
  const applicationResult =
    latestApplication &&
    ["HIRED", "QUALIFIED", "NOT_QUALIFIED", "REJECTED"].includes(
      latestApplication.status,
    );
  const applicationHeadline = !latestApplication
    ? "Your next opportunity starts here."
    : latestApplication.status === "HIRED"
      ? `You’re hired for ${latestApplication.jobTitle}.`
      : latestApplication.status === "QUALIFIED"
        ? `You’re qualified for ${latestApplication.jobTitle}.`
        : latestApplication.status === "NOT_QUALIFIED"
          ? `Your application for ${latestApplication.jobTitle} was not qualified.`
          : latestApplication.status === "REJECTED"
            ? `Your application for ${latestApplication.jobTitle} was not selected.`
                : latestApplication.status === "ASSESSMENT_SCHEDULED"
                  ? `Your assessment for ${latestApplication.jobTitle} is scheduled.`
                  : `Your application for ${latestApplication.jobTitle} is in progress.`;
  const secondaryApplication = secondaryApplications[0];
  const secondaryStatusLabel = secondaryApplication
    ? ({
        HIRED: "Hired",
        QUALIFIED: "Qualified",
        NOT_QUALIFIED: "Not qualified",
        REJECTED: "Not selected",
        ASSESSMENT_SCHEDULED: "Assessment scheduled",
        UNDER_EVALUATION: "Under evaluation",
        SUBMITTED: "Submitted",
      }[secondaryApplication.status] ?? "In progress")
    : null;
  const applicationSummary =
    secondaryApplication && secondaryApplications.length === 1
      ? `Your other application, ${secondaryApplication.jobTitle}, is ${secondaryStatusLabel}.`
      : secondaryApplications.length > 1
        ? `You have ${secondaryApplications.length} other applications to track.`
        : latestApplication
          ? `Applied ${formatDate(latestApplication.applied_at)}.`
          : "Browse open positions and take the next step in your career.";

  return (
    <>
      <PageHeader
        description="Track your applications, Personal Data Sheet, documents, and notifications."
        title="Applicant dashboard"
      />

      <section
        aria-label="Application result"
        className="rounded-sm bg-[#10432f] px-5 py-6 text-white shadow-sm sm:px-7 sm:py-8"
      >
        <p className="text-xs font-medium text-emerald-100">
          {applicationResult ? "Application result" : "Your applications"}
        </p>
        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              {applicationHeadline}
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-50/90">
              {applicationSummary}
            </p>
          </div>
          <Link
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-[#10432f] transition hover:bg-emerald-50"
            href={
              latestApplication ? "/applicant/applications" : "/applicant/jobs"
            }
          >
            {latestApplication ? "View my applications" : "Browse jobs"}
          </Link>
        </div>
      </section>

      <section
        aria-label="Personal data sheet status"
        className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line-subtle bg-panel px-4 py-3"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-sm font-medium text-ink">Personal data sheet</p>
          <WorkflowStatusTag status={pdsStatus} />
          <p className="text-xs text-muted">
            {pdsResult.error
              ? "Status unavailable"
              : draft
                ? `Draft version ${draft.version_no} · Last saved ${formatDate(draft.updated_at)}`
                : submitted
                  ? `Version ${submitted.version_no} · Submitted ${formatDate(submitted.submitted_at)}`
                  : "Complete your applicant profile"}
          </p>
        </div>
        <Link
          className="inline-flex min-h-9 items-center rounded-sm px-2 text-sm font-semibold text-primary hover:bg-primary-light"
          href={
            pdsResult.error
              ? "/applicant/dashboard"
              : draft
                ? "/applicant/pds"
                : submitted
                  ? "/applicant/profile"
                  : "/applicant/pds"
          }
        >
          {pdsResult.error
            ? "Refresh"
            : draft
              ? "Continue PDS"
              : submitted
                ? "View profile"
                : "Start PDS"}
        </Link>
      </section>

      <DashboardSections
        applications={dashboardApplications}
        documents={[...latestDocuments.values()]}
        notifications={notificationsResult.data ?? []}
        unreadCount={unreadCount}
      />
    </>
  );
}

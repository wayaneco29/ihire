import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getApplicantContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
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
  ] =
    await Promise.all([
      applicant.supabase
        .from("pds_versions")
        .select("id, status, version_no, submitted_at, updated_at")
        .eq("applicant_id", applicant.applicant.id)
        .order("version_no", { ascending: false })
        .limit(3),
      applicant.supabase
        .from("applications")
        .select("id, job_id, status, applied_at")
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
  const jobIds = [...new Set(applications.map((application) => application.job_id))];
  const jobsResult = jobIds.length
    ? await applicant.supabase.from("job_postings").select("id, title").in("id", jobIds)
    : { data: [], error: null };
  const jobTitles = new Map((jobsResult.data ?? []).map((job) => [job.id, job.title] as const));
  const dashboardApplications = applications.map((application) => ({
    ...application,
    jobTitle: jobTitles.get(application.job_id) ?? "Job posting",
  }));

  const documentTypes = new Map((typesResult.data ?? []).map((type) => [type.id, type.name] as const));
  const latestDocuments = new Map<
    string,
    { id: string; status: string; uploaded_at: string; version: number; typeName: string }
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

  return (
    <>
      <PageHeader
        description="Track your PDS, applications, documents, and account updates."
        eyebrow="Applicant workspace"
        title="Dashboard"
      />

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-line bg-panel p-5">
          <p className="text-sm text-muted">Personal Data Sheet</p>
          <div className="mt-3"><WorkflowStatusTag status={pdsStatus} /></div>
          <p className="mt-3 text-xs leading-5 text-muted">
            {pdsResult.error
              ? "Refresh the dashboard to check your saved PDS status."
              : draft
                ? `Draft version ${draft.version_no} · last saved ${formatDate(draft.updated_at)}`
                : submitted
                  ? `Version ${submitted.version_no} submitted ${formatDate(submitted.submitted_at)}`
                  : "Start your PDS to complete your applicant profile."}
          </p>
          <Link className="mt-4 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-light hover:text-primary-dark" href={pdsResult.error ? "/applicant/dashboard" : draft ? "/applicant/pds" : "/applicant/profile"}>
            {pdsResult.error ? "Refresh status" : draft ? "Continue PDS" : submitted ? "View profile" : "Start PDS"}
          </Link>
        </article>

        <MetricCard label="Applications" value={applications.length} detail="Submitted to job postings" />
        <MetricCard label="Documents uploaded" value={latestDocuments.size} detail="Latest version per document type" />
        <MetricCard label="Unread notifications" value={unreadCount} detail="All unread updates" />
      </div>

      <DashboardSections
        applications={dashboardApplications}
        documents={[...latestDocuments.values()]}
        notifications={notificationsResult.data ?? []}
      />
    </>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <article className="rounded-2xl border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </article>
  );
}

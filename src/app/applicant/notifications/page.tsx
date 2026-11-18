import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getApplicantContext } from "@/lib/auth/server";
import { NotificationList } from "./components/NotificationList";

export default async function ApplicantNotificationsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ page?: string | string[] }> }>) {
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/login");

  const { page: rawPage } = await searchParams;
  const requestedPage = Number(
    Array.isArray(rawPage) ? (rawPage[0] ?? "1") : (rawPage ?? "1"),
  );
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 50;
  const [
    notificationsResult,
    countResult,
    applicationCountResult,
    documentCountResult,
    resubmissionsResult,
    latestDocumentsResult,
  ] = await Promise.all([
    applicant.supabase
      .from("notifications")
      .select("id, user_id, type, title, body, link, is_read, created_at")
      .eq("user_id", applicant.user.id)
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1),
    applicant.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", applicant.user.id),
    applicant.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", applicant.user.id)
      .eq("type", "APPLICATION_STATUS"),
    applicant.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", applicant.user.id)
      .eq("type", "DOCUMENT_STATUS"),
    applicant.supabase
      .from("v_applicant_document_resubmissions")
      .select("document_type_id"),
    applicant.supabase
      .from("documents")
      .select("document_type_id, version, status")
      .eq("applicant_id", applicant.applicant.id)
      .order("version", { ascending: false }),
  ]);
  const totalCount = countResult.count ?? 0;
  const latestDocumentStatusByType = new Map<string, string>();
  for (const document of latestDocumentsResult.data ?? []) {
    if (!latestDocumentStatusByType.has(document.document_type_id)) {
      latestDocumentStatusByType.set(
        document.document_type_id,
        document.status,
      );
    }
  }
  const resubmissionTypeIds = new Set(
    (resubmissionsResult.data ?? [])
      .filter(
        (request) =>
          latestDocumentStatusByType.get(request.document_type_id) !==
          "VERIFIED",
      )
      .map((request) => request.document_type_id),
  );
  for (const [documentTypeId, status] of latestDocumentStatusByType) {
    if (status === "FOR_RESUBMISSION") {
      resubmissionTypeIds.add(documentTypeId);
    }
  }
  const countsUnavailable = Boolean(
    countResult.error ||
    applicationCountResult.error ||
    documentCountResult.error ||
    resubmissionsResult.error ||
    latestDocumentsResult.error,
  );

  return (
    <div className="mx-auto">
      <PageHeader
        description="Updates about your PDS, documents, and applications."
        title="Notifications"
      />
      {notificationsResult.error || countsUnavailable ? (
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to try loading your notifications again."
            title="Notifications temporarily unavailable"
          />
        </div>
      ) : (
        <>
          <NotificationList
            key={(notificationsResult.data ?? [])
              .map(
                (notification) => `${notification.id}:${notification.is_read}`,
              )
              .join("|")}
            notifications={notificationsResult.data ?? []}
            counts={{
              all: totalCount,
              applications: applicationCountResult.count ?? 0,
              documents: documentCountResult.count ?? 0,
              documentsNeedingResubmission: resubmissionTypeIds.size,
            }}
          />
          {totalCount > pageSize && (
            <nav
              aria-label="Notification pages"
              className="mt-8 flex justify-center gap-3"
            >
              {page > 1 && (
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold text-primary hover:bg-panel-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  href={`/applicant/notifications?page=${page - 1}`}
                >
                  Newer notifications
                </Link>
              )}
              {page * pageSize < totalCount && (
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold text-primary hover:bg-panel-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  href={`/applicant/notifications?page=${page + 1}`}
                >
                  Show older notifications
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

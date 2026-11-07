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
  const requestedPage = Number(Array.isArray(rawPage) ? rawPage[0] ?? "1" : rawPage ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 50;
  const [notificationsResult, countResult] = await Promise.all([
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
  ]);
  const totalCount = countResult.count ?? 0;

  return (
    <>
      <PageHeader
        description="Updates about your PDS, documents, and applications."
        eyebrow="Applicant workspace"
        title="Notifications"
      />
      {notificationsResult.error || countResult.error ? (
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to try loading your notifications again."
            title="Notifications temporarily unavailable"
          />
        </div>
      ) : (
        <>
          <NotificationList notifications={notificationsResult.data ?? []} totalCount={totalCount} />
          {totalCount > pageSize && (
            <nav aria-label="Notification pages" className="mt-5 flex justify-between">
              {page > 1 ? (
                <Link className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50" href={`/applicant/notifications?page=${page - 1}`}>
                  Newer notifications
                </Link>
              ) : <span />}
              {page * pageSize < totalCount && (
                <Link className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50" href={`/applicant/notifications?page=${page + 1}`}>
                  Older notifications
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}

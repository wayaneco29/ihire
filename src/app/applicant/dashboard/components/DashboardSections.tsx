import Link from "next/link";
import { ApplicationProgress } from "@/components/ui/ApplicationProgress";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";
import { formatNotificationText } from "@/utils/format-notification-text";

type ApplicationItem = {
  id: string;
  status: string;
  applied_at: string;
  jobTitle: string;
  positionLabel: string;
};

type DocumentItem = {
  id: string;
  status: string;
  uploaded_at: string;
  version: number;
  typeName: string;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  is_read: boolean;
};

export function DashboardSections({
  applications,
  documents,
  notifications,
  unreadCount,
}: {
  applications: ApplicationItem[];
  documents: DocumentItem[];
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const pendingDocuments = documents.filter((document) =>
    ["PENDING", "FOR_REVIEW", "FOR_RESUBMISSION"].includes(document.status),
  ).length;
  const verifiedDocuments = documents.filter(
    (document) => document.status === "VERIFIED",
  ).length;

  return (
    <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1.15fr_1fr]">
      <section className="rounded-sm border border-line-subtle bg-panel p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-ink">
            Where your applications stand
          </h2>
          <Link
            className="inline-flex min-h-11 shrink-0 items-center rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-light"
            href="/applicant/applications"
          >
            View all
          </Link>
        </div>
        {applications.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              action={
                <Link
                  className="inline-flex min-h-11 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark"
                  href="/applicant/jobs"
                >
                  Browse open jobs
                </Link>
              }
              description="Your application progress will appear here after you apply."
              title="No applications yet"
            />
          </div>
        ) : (
          <ul className="mt-1 divide-y divide-line-subtle">
            {applications.slice(0, 3).map((application) => (
              <li className="py-3" key={application.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      className="text-sm font-semibold text-ink hover:text-primary"
                      href={`/applicant/applications/${application.id}`}
                    >
                      {application.jobTitle}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      Applying for {application.positionLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Applied {formatDate(application.applied_at)}
                    </p>
                  </div>
                  <WorkflowStatusTag status={application.status} />
                </div>
                <ApplicationProgress status={application.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border border-line-subtle bg-panel p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Documents</h2>
            <p className="mt-1 text-xs text-muted">
              {pendingDocuments} waiting for review, {verifiedDocuments}{" "}
              verified.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 shrink-0 items-center rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-light"
            href="/applicant/documents"
          >
            View documents
          </Link>
        </div>
        {documents.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              description="Upload required records so they are ready for review."
              title="No documents uploaded"
            />
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-line-subtle">
            {documents.slice(0, 5).map((document) => (
              <li
                className="flex items-center justify-between gap-3 py-2.5"
                key={document.id}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink">
                    {document.typeName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Version {document.version} ·{" "}
                    {formatDate(document.uploaded_at, "MMM D")}
                  </p>
                </div>
                <WorkflowStatusTag status={document.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border border-line-subtle bg-panel p-4 sm:p-5 xl:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-ink">Latest updates</h2>
          <Link
            className="inline-flex min-h-11 shrink-0 items-center rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-light"
            href="/applicant/notifications"
          >
            {unreadCount > 0 ? `Read all ${unreadCount} unread` : "View all"}
          </Link>
        </div>
        {notifications.length === 0 ? (
          <p className="mt-2 text-sm text-muted">You’re all caught up.</p>
        ) : (
          <ul className="mt-1 divide-y divide-line-subtle">
            {notifications.slice(0, 3).map((notification) => (
              <li
                className="flex flex-wrap items-start justify-between gap-3 py-4"
                key={notification.id}
              >
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                      notification.is_read ? "bg-line-strong" : "bg-primary"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink">
                      {formatNotificationText(notification.title)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatNotificationText(notification.body)}
                    </p>
                  </div>
                </div>
                <time
                  className="shrink-0 pt-0.5 text-xs text-muted"
                  dateTime={notification.created_at}
                >
                  {formatDate(notification.created_at, "MMM D, h:mm A")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";

type ApplicationItem = {
  id: string;
  status: string;
  applied_at: string;
  jobTitle: string;
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
}: {
  applications: ApplicationItem[];
  documents: DocumentItem[];
  notifications: NotificationItem[];
}) {
  const applicationStatuses = [
    "SUBMITTED",
    "UNDER_EVALUATION",
    "QUALIFIED",
    "NOT_QUALIFIED",
    "HIRED",
    "REJECTED",
  ];

  return (
    <div className="mt-7 grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">My applications</h2>
            <p className="mt-1 text-sm text-muted">
              Current status of each application.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-light hover:text-primary-dark"
            href="/applicant/applications"
          >
            View all
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {applicationStatuses.map((status) => (
            <div className="rounded-md bg-panel-muted px-3 py-3" key={status}>
              <p className="text-xs text-muted">
                {status.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {
                  applications.filter(
                    (application) => application.status === status,
                  ).length
                }
              </p>
            </div>
          ))}
        </div>
        {applications.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              description="When you apply to an open posting, its progress will appear here."
              title="No applications yet"
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line-subtle">
            {applications.slice(0, 4).map((application) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                key={application.id}
              >
                <div className="min-w-0">
                  <Link
                    className="flex min-h-11 items-center truncate rounded-lg text-sm font-medium text-ink hover:text-primary"
                    href={`/applicant/applications/${application.id}`}
                  >
                    {application.jobTitle}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    Applied {formatDate(application.applied_at)}
                  </p>
                </div>
                <WorkflowStatusTag status={application.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Documents</h2>
            <p className="mt-1 text-sm text-muted">
              Latest status for your uploaded files.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-light hover:text-primary-dark"
            href="/applicant/documents"
          >
            Manage
          </Link>
        </div>
        {documents.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              description="Upload the required documents so evaluators can review them."
              title="No documents uploaded"
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line-subtle">
            {documents.slice(0, 5).map((document) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                key={document.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {document.typeName}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Version {document.version} ·{" "}
                    {formatDate(document.uploaded_at)}
                  </p>
                </div>
                <WorkflowStatusTag status={document.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6 xl:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Recent notifications</h2>
            <p className="mt-1 text-sm text-muted">
              Updates about your account and applications.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-light hover:text-primary-dark"
            href="/applicant/notifications"
          >
            View all
          </Link>
        </div>
        {notifications.length === 0 ? (
          <p className="mt-5 rounded-md bg-panel-muted p-4 text-sm text-muted">
            You’re all caught up.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line-subtle">
            {notifications.map((notification) => (
              <li className="flex gap-3 py-3" key={notification.id}>
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.is_read ? "bg-line" : "bg-primary"}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    {notification.body}
                  </p>
                  <time
                    className="mt-1 block text-xs text-muted"
                    dateTime={notification.created_at}
                  >
                    {formatDate(
                      notification.created_at,
                      "MMM D, YYYY · h:mm A",
                    )}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

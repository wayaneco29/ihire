import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";

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

const APPLICATION_STAGES = [
  "Submitted",
  "Under evaluation",
  "Assessment scheduled",
  "Qualified",
  "Hired",
];

function getApplicationStage(status: string) {
  switch (status) {
    case "UNDER_EVALUATION":
      return 1;
    case "ASSESSMENT_SCHEDULED":
      return 2;
    case "QUALIFIED":
      return 3;
    case "HIRED":
      return 4;
    case "NOT_QUALIFIED":
    case "REJECTED":
      return 3;
    default:
      return 0;
  }
}

function ApplicationProgress({ status }: { status: string }) {
  const activeStage = getApplicationStage(status);
  const isUnsuccessful = ["NOT_QUALIFIED", "REJECTED"].includes(status);
  const stages = APPLICATION_STAGES.map((stage, index) =>
    isUnsuccessful && index === activeStage
      ? status === "REJECTED"
        ? "Not selected"
        : "Not qualified"
      : stage,
  );

  return (
    <div
      aria-label={`Application progress: ${status.toLowerCase().replaceAll("_", " ")}`}
      className="mt-3"
      role="group"
    >
      <div className="grid grid-cols-5 gap-1">
        {stages.map((stage, index) => {
          const isCurrent = index === activeStage;
          const isComplete = index < activeStage || status === "HIRED";
          return (
            <span
              aria-hidden="true"
              className={`h-1.5 rounded-full ${
                isUnsuccessful && isCurrent
                  ? "bg-danger"
                  : isCurrent || isComplete
                    ? "bg-primary"
                    : "bg-line"
              }`}
              key={stage}
            />
          );
        })}
      </div>
      <div className="mt-1.5 grid grid-cols-5 gap-1">
        {stages.map((stage, index) => (
          <span
            className={`text-[10px] leading-4 ${
              index === activeStage ? "font-medium text-ink" : "text-muted"
            }`}
            key={stage}
          >
            {stage}
          </span>
        ))}
      </div>
    </div>
  );
}

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
            className="inline-flex min-h-9 shrink-0 items-center rounded-sm px-2 text-xs font-semibold text-primary hover:bg-primary-light"
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
                  className="inline-flex min-h-10 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark"
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
                      className="truncate text-sm font-semibold text-ink hover:text-primary"
                      href={`/applicant/applications/${application.id}`}
                    >
                      {application.jobTitle}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-muted">
                      Applying for {application.positionLabel}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
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
            <p className="mt-1 text-[11px] text-muted">
              {pendingDocuments} waiting for review, {verifiedDocuments}{" "}
              verified.
            </p>
          </div>
          <Link
            className="inline-flex min-h-9 shrink-0 items-center rounded-sm px-2 text-xs font-semibold text-primary hover:bg-primary-light"
            href="/applicant/documents"
          >
            Manage
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
                  <p className="truncate text-xs font-medium text-ink">
                    {document.typeName}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
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
            className="inline-flex min-h-9 shrink-0 items-center rounded-sm px-2 text-xs font-semibold text-primary hover:bg-primary-light"
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
                className="flex items-start justify-between gap-4 py-2.5"
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
                    <p className="truncate text-xs font-semibold text-ink">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {notification.body}
                    </p>
                  </div>
                </div>
                <time
                  className="shrink-0 pt-0.5 text-[10px] text-muted"
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

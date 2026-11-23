"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import dayjs from "dayjs";
import { Button } from "@/components/ui/Button";
import { useNotifications } from "@/context/NotificationContext";
import { formatDate } from "@/utils/format-date";
import {
  formatNotificationText,
  getNotificationStatusMessage,
} from "@/utils/format-notification-text";
import type { Tables } from "@/types/database";

type NotificationFilter = "all" | "applications" | "documents";

type NotificationCounts = {
  all: number;
  applications: number;
  documents: number;
  documentsNeedingResubmission: number;
};

export function NotificationList({
  notifications: initialNotifications,
  counts,
}: {
  notifications: Tables<"notifications">[];
  counts: NotificationCounts;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const router = useRouter();
  const { markAsRead, refreshNotifications } = useNotifications();

  async function markRead(id: string): Promise<boolean> {
    setBusyId(id);
    setError(null);
    const success = await markAsRead(id);
    setBusyId(null);
    if (!success) {
      setError(
        "This notification could not be marked as read. Please try again.",
      );
      return false;
    }
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, is_read: true }
          : notification,
      ),
    );
    await refreshNotifications();
    return true;
  }

  const filterOptions: {
    id: NotificationFilter;
    label: string;
    count: number;
  }[] = [
    { id: "all", label: "All", count: counts.all },
    {
      id: "applications",
      label: "Applications",
      count: counts.applications,
    },
    { id: "documents", label: "Documents", count: counts.documents },
  ];
  const filteredNotifications = notifications.filter((notification) => {
    if (activeFilter === "applications") {
      return notification.type === "APPLICATION_STATUS";
    }
    if (activeFilter === "documents") {
      return notification.type === "DOCUMENT_STATUS";
    }
    return true;
  });
  const notificationGroups = filteredNotifications.reduce<
    { date: string; items: Tables<"notifications">[] }[]
  >((groups, notification) => {
    const date = formatDate(notification.created_at, "YYYY-MM-DD");
    const existingGroup = groups.at(-1);
    if (existingGroup?.date === date) {
      existingGroup.items.push(notification);
    } else {
      groups.push({ date, items: [notification] });
    }
    return groups;
  }, []);
  const today = dayjs().format("YYYY-MM-DD");
  const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
  const groupDateLabel = (date: string) => {
    if (date === today) return "Today";
    if (date === yesterday) return "Yesterday";
    return formatDate(date, "dddd, MMM D");
  };

  if (counts.all === 0) {
    return (
      <div className="mt-5 rounded-sm border border-dashed border-line-strong bg-panel p-6 text-center">
        <h2 className="font-semibold text-ink">You’re all caught up</h2>
        <p className="mt-2 text-sm text-muted">
          New updates about your applications will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {counts.documentsNeedingResubmission > 0 && (
        <section
          aria-label="Documents needing resubmission"
          className="mt-6 flex flex-col gap-3 rounded-sm border border-warning/20 border-l-4 border-l-warning bg-warning/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div>
            <h2 className="text-sm font-semibold text-warning">
              {counts.documentsNeedingResubmission}{" "}
              {counts.documentsNeedingResubmission === 1
                ? "document needs"
                : "documents need"}{" "}
              resubmission
            </h2>
            <p className="mt-0.5 text-sm text-ink">
              Upload a new copy so review can continue.
            </p>
          </div>
          <Link
            className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-warning underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning"
            href="/applicant/documents"
          >
            Go to documents
          </Link>
        </section>
      )}
      <nav aria-label="Filter notifications" className="mt-5">
        <ul className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <li key={option.id}>
              <Button
                aria-pressed={activeFilter === option.id}
                className={`inline-flex min-h-9! items-center gap-1.5 rounded-full border px-4 text-sm! font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  activeFilter === option.id
                    ? "border-primary bg-primary text-on-primary"
                    : "border-line bg-panel text-muted hover:bg-panel-muted"
                }`}
                onClick={() => setActiveFilter(option.id)}
                type="button"
                variant="unstyled"
              >
                <span>{option.label}</span>
                <span>{option.count}</span>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
      {notificationGroups.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No {activeFilter === "applications" ? "application" : "document"}{" "}
          notifications on this page.
        </p>
      ) : (
        <div className="mt-6">
          {notificationGroups.map((group) => (
            <section
              aria-label={groupDateLabel(group.date)}
              key={group.date}
              className="not-last:mb-4 rounded-sm border border-line-subtle bg-panel p-4 shadow-card"
            >
              <h2 className="border-b border-line-subtle pb-2 text-xs font-semibold text-muted">
                {groupDateLabel(group.date)}
              </h2>
              <ul>
                {group.items.map((notification) => {
                  const internalLink =
                    notification.link?.startsWith("/") &&
                    !notification.link.startsWith("//")
                      ? notification.link
                      : null;
                  const statusMessage = getNotificationStatusMessage(
                    notification.type,
                    notification.body,
                  );
                  const content = statusMessage ? (
                    <p
                      className={`text-sm leading-5 ${notification.type === "APPLICATION_STATUS" ? "font-semibold text-ink" : "text-muted"}`}
                    >
                      {statusMessage.prefix}{" "}
                      <strong
                        className={
                          statusMessage.status === "Needs resubmission"
                            ? "font-semibold text-warning"
                            : "font-semibold text-primary"
                        }
                      >
                        {statusMessage.status}
                      </strong>
                    </p>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {formatNotificationText(notification.title)}
                      </p>
                      <p className="mt-0.5 text-sm leading-5 text-muted">
                        {formatNotificationText(notification.body)}
                      </p>
                    </div>
                  );

                  return (
                    <li
                      className="flex items-start gap-3 py-3"
                      key={notification.id}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          notification.is_read
                            ? "bg-line-strong"
                            : notification.type === "APPLICATION_STATUS"
                              ? "bg-primary"
                              : notification.body.includes("FOR_RESUBMISSION")
                                ? "bg-warning"
                                : "bg-line"
                        }`}
                      />
                      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {internalLink ? (
                            <Link
                              className="block rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              href={internalLink}
                              onClick={(event) => {
                                if (!notification.is_read) {
                                  event.preventDefault();
                                  void markRead(notification.id).then(
                                    (success) => {
                                      if (success) router.push(internalLink);
                                    },
                                  );
                                }
                              }}
                            >
                              {content}
                            </Link>
                          ) : (
                            content
                          )}
                          {!notification.is_read && (
                            <Button
                              className="mt-1! text-sm! hover:bg-transparent!"
                              disabled={busyId === notification.id}
                              onClick={() => void markRead(notification.id)}
                              type="button"
                              variant="ghost"
                            >
                              {busyId === notification.id
                                ? "Saving…"
                                : "Mark read"}
                            </Button>
                          )}
                        </div>
                        <time
                          className="shrink-0 pt-0.5 text-xs text-muted"
                          dateTime={notification.created_at}
                        >
                          {formatDate(notification.created_at, "h:mm A")}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

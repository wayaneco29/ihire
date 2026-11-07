"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { formatDate } from "@/utils/format-date";
import type { Tables } from "@/types/database";

export function NotificationList({
  notifications: initialNotifications,
  totalCount,
}: {
  notifications: Tables<"notifications">[];
  totalCount: number;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { markAsRead, refreshNotifications } = useNotifications();

  async function markRead(id: string): Promise<boolean> {
    setBusyId(id);
    setError(null);
    const success = await markAsRead(id);
    setBusyId(null);
    if (!success) {
      setError("This notification could not be marked as read. Please try again.");
      return false;
    }
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, is_read: true } : notification,
      ),
    );
    await refreshNotifications();
    return true;
  }

  if (notifications.length === 0) {
    return (
      <div className="mt-7 rounded-2xl border border-dashed border-line-strong bg-panel p-8 text-center">
        <h2 className="font-semibold text-ink">You’re all caught up</h2>
        <p className="mt-2 text-sm text-muted">New updates about your applications will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <p className="mt-6 text-sm text-muted">{totalCount} notifications</p>
      {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
      <ul className="mt-3 divide-y divide-line-subtle rounded-2xl border border-line bg-panel px-4 sm:px-6">
        {notifications.map((notification) => {
          const internalLink = notification.link?.startsWith("/") && !notification.link.startsWith("//")
            ? notification.link
            : null;
          return (
            <li className="flex items-start gap-3 py-5" key={notification.id}>
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.is_read ? "bg-line" : "bg-primary"}`} />
              <div className="min-w-0 flex-1">
                {internalLink ? (
                  <Link
                    className="inline-flex min-h-11 items-center rounded-lg font-medium text-ink hover:text-primary"
                    href={internalLink}
                    onClick={(event) => {
                      if (!notification.is_read) {
                        event.preventDefault();
                        void markRead(notification.id).then((success) => {
                          if (success) router.push(internalLink);
                        });
                      }
                    }}
                  >
                    {notification.title}
                  </Link>
                ) : <h2 className="font-medium text-ink">{notification.title}</h2>}
                <p className="mt-1 text-sm leading-6 text-muted">{notification.body}</p>
                <time className="mt-2 block text-xs text-muted" dateTime={notification.created_at}>
                  {formatDate(notification.created_at, "MMM D, YYYY · h:mm A")}
                </time>
              </div>
              {!notification.is_read && (
                <button
                  className="min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold text-primary hover:bg-primary-light disabled:opacity-60"
                  disabled={busyId === notification.id}
                  onClick={() => void markRead(notification.id)}
                  type="button"
                >
                  {busyId === notification.id ? "Saving…" : "Mark read"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

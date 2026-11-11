"use client";

import { useState } from "react";
import { BellOutlined } from "@ant-design/icons";
import { Badge, Empty, Popover } from "antd";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import { formatNotificationText } from "@/utils/format-notification-text";

export function NotificationBell() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markingAllAsRead,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function openNotifications(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && notifications.length === 0) await refreshNotifications();
  }

  async function openNotification(id: string, link: string | null) {
    const notification = notifications.find((item) => item.id === id);
    if (notification && !notification.is_read) {
      const success = await markAsRead(id);
      if (!success) {
        setActionError(
          "This notification could not be marked as read. Please try again.",
        );
        return;
      }
    }
    setActionError(null);
    setOpen(false);
    if (link?.startsWith("/") && !link.startsWith("//")) router.push(link);
  }

  async function markAllNotificationsAsRead() {
    setActionError(null);
    const success = await markAllAsRead();
    if (!success) {
      setActionError(
        "Notifications could not all be marked as read. Please try again.",
      );
      return;
    }
    router.refresh();
  }

  const content = (
    <div className="notification-popover-content">
      <div className="flex items-center justify-between border-b border-line-subtle px-4 py-3">
        <p className="text-sm font-semibold text-ink">Notifications</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{unreadCount} unread</span>
          {unreadCount > 0 && (
            <button
              className="text-xs font-semibold text-primary hover:text-primary-dark disabled:opacity-60"
              disabled={markingAllAsRead}
              onClick={() => void markAllNotificationsAsRead()}
              type="button"
            >
              {markingAllAsRead ? "Marking…" : "Mark all as read"}
            </button>
          )}
        </div>
      </div>
      {actionError && (
        <p className="px-4 pt-3 text-xs text-danger" role="alert">
          {actionError}
        </p>
      )}
      <div className="notification-list-scroll">
        {loading ? (
          <div aria-busy="true" className="min-h-24" role="status">
            <span className="sr-only">Loading notifications</span>
            <ul aria-hidden="true" className="divide-y divide-line-subtle">
              {Array.from({ length: 3 }, (_, index) => (
                <li className="space-y-2 px-4 py-4" key={index}>
                  <div className="h-4 w-3/5 animate-pulse rounded bg-panel-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-panel-muted" />
                  <div className="h-3 w-2/5 animate-pulse rounded bg-panel-muted" />
                </li>
              ))}
            </ul>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-5">
            <Empty
              description="You’re all caught up."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <ul className="divide-y divide-line-subtle">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  className={`min-h-11 w-full px-4 py-3 text-left transition hover:bg-panel-muted ${notification.is_read ? "" : "bg-primary-light/40"}`}
                  onClick={() =>
                    void openNotification(notification.id, notification.link)
                  }
                  type="button"
                >
                  <span className="flex items-start gap-2">
                    {!notification.is_read && (
                      <>
                        <span
                          aria-hidden="true"
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                        />
                        <span className="sr-only">Unread</span>
                      </>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">
                        {formatNotificationText(notification.title)}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {formatNotificationText(notification.body)}
                      </span>
                      <time
                        className="mt-2 block text-xs text-muted"
                        dateTime={notification.created_at}
                      >
                        {new Date(notification.created_at).toLocaleString()}
                      </time>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      onOpenChange={(nextOpen) => void openNotifications(nextOpen)}
      open={open}
      placement="bottomRight"
      trigger="click"
    >
      <button
        aria-expanded={open}
        aria-label={`Notifications, ${unreadCount} unread`}
        className="grid size-11 place-items-center rounded-sm group cursor-pointer text-muted transition hover:bg-panel-muted"
        type="button"
      >
        <Badge
          count={unreadCount}
          className="group-hover:text-primary!"
          size="small"
          overflowCount={99}
        >
          <BellOutlined className="text-md" />
        </Badge>
      </button>
    </Popover>
  );
}

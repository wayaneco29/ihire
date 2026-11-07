"use client";

import { useState } from "react";
import { BellOutlined } from "@ant-design/icons";
import { Badge, Empty, Popover, Spin } from "antd";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead, refreshNotifications } =
    useNotifications();
  const [open, setOpen] = useState(false);

  async function openNotifications(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && notifications.length === 0) await refreshNotifications();
  }

  async function openNotification(id: string, link: string | null) {
    await markAsRead(id);
    setOpen(false);
    if (link?.startsWith("/") && !link.startsWith("//")) router.push(link);
  }

  const content = (
    <div className="w-[min(340px,calc(100vw-2rem))]">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-ink">Notifications</p>
        <span className="text-xs text-muted">
          {unreadCount} unread
        </span>
      </div>
      <div className="max-h-[min(65vh,420px)] overflow-y-auto">
        {loading ? (
          <div aria-label="Loading notifications" className="grid min-h-24 place-items-center" role="status">
            <Spin aria-hidden="true" size="small" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-5">
            <Empty
              description="You’re all caught up."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${notification.is_read ? "" : "bg-primary-light/40"}`}
                  onClick={() =>
                    void openNotification(notification.id, notification.link)
                  }
                  type="button"
                >
                  <span className="flex items-start gap-2">
                    {!notification.is_read && (
                      <>
                        <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                        <span className="sr-only">Unread</span>
                      </>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">
                        {notification.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {notification.body}
                      </span>
                      <time
                        className="mt-2 block text-[11px] text-muted"
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
        className="grid size-10 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100"
        type="button"
      >
        <Badge count={unreadCount} size="small" overflowCount={99}>
          <BellOutlined className="text-lg" />
        </Badge>
      </button>
    </Popover>
  );
}

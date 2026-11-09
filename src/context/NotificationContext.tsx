"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type NotificationContextValue = {
  notifications: Tables<"notifications">[];
  unreadCount: number;
  loading: boolean;
  markingAllAsRead: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export function NotificationProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { user } = useAuth();
  const client = useMemo(() => createClient(), []);
  const requestIdRef = useRef(0);
  const [notifications, setNotifications] = useState<Tables<"notifications">[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  const refreshNotifications = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    let data: Tables<"notifications">[] | null = null;
    let unreadCountResult: number | null = null;
    try {
      const [listResult, countResult] = await Promise.all([
        client
          .from("notifications")
          .select("id, user_id, type, title, body, link, is_read, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        client
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
      ]);
      if (listResult.error) {
        console.error("Failed to load notifications", listResult.error);
      }
      if (countResult.error) {
        console.error(
          "Failed to count unread notifications",
          countResult.error,
        );
      }
      data = listResult.error ? null : listResult.data;
      unreadCountResult = countResult.error ? null : countResult.count;
    } catch (error) {
      console.error("Failed to refresh notifications", error);
      data = null;
    }

    if (requestId !== requestIdRef.current) return;
    setNotifications(data ?? []);
    setUnreadCount(
      unreadCountResult ??
        (data ?? []).filter((notification) => !notification.is_read).length,
    );
    setLoading(false);
  }, [client, user]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void refreshNotifications();
    }, 0);
    return () => {
      clearTimeout(timeout);
      requestIdRef.current += 1;
    };
  }, [refreshNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!user) return false;
      try {
        const response = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark-read", id }),
        });
        if (!response.ok) {
          console.error(
            "Failed to mark notification as read",
            await response.text(),
          );
          return false;
        }
      } catch (error) {
        console.error("Failed to mark notification as read", error);
        return false;
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      return true;
    },
    [user],
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return false;
    setMarkingAllAsRead(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-all-read" }),
      });
      if (!response.ok) {
        console.error(
          "Failed to mark all notifications as read",
          await response.text(),
        );
        return false;
      }

      setNotifications((current) =>
        current.map((notification) => ({ ...notification, is_read: true })),
      );
      setUnreadCount(0);
      return true;
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
      return false;
    } finally {
      setMarkingAllAsRead(false);
    }
  }, [user]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      markingAllAsRead,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [
      notifications,
      unreadCount,
      loading,
      markingAllAsRead,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  }
  return context;
}

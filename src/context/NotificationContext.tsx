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
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<boolean>;
};

const NotificationContext =
  createContext<NotificationContextValue | null>(null);

export function NotificationProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { user } = useAuth();
  const client = useMemo(() => createClient(), []);
  const requestIdRef = useRef(0);
  const [notifications, setNotifications] = useState<Tables<"notifications">[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

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
      data = listResult.error ? null : listResult.data;
      unreadCountResult = countResult.error ? null : countResult.count;
    } catch {
      data = null;
    }

    if (requestId !== requestIdRef.current) return;
    setNotifications(data ?? []);
    setUnreadCount(
      unreadCountResult ?? (data ?? []).filter((notification) => !notification.is_read).length,
    );
    setLoading(false);
  }, [client, user]);

  useEffect(() => {
    void refreshNotifications();
    return () => {
      requestIdRef.current += 1;
    };
  }, [refreshNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!user) return false;
      const wasUnread = notifications.some(
        (notification) => notification.id === id && !notification.is_read,
      );
      try {
        const { error } = await client
          .from("notifications")
          .update({ is_read: true })
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) return false;
      } catch {
        return false;
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification,
        ),
      );
      if (wasUnread) setUnreadCount((current) => Math.max(0, current - 1));
      return true;
    },
    [client, notifications, user],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refreshNotifications,
      markAsRead,
    }),
    [notifications, unreadCount, loading, refreshNotifications, markAsRead],
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
    throw new Error("useNotifications must be used inside NotificationProvider");
  }
  return context;
}

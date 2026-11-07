"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Tables<"profiles"> | null;
  role: UserRole | null;
  hasSubmittedPds: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<{ error: AuthError | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function asUserRole(value: unknown): UserRole | null {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole)
    ? (value as UserRole)
    : null;
}

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const client = useMemo(() => createClient(), []);
  const sessionRef = useRef<Session | null>(null);
  const requestIdRef = useRef(0);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [hasSubmittedPds, setHasSubmittedPds] = useState(false);
  const [loading, setLoading] = useState(true);

  const syncSession = useCallback(
    async (nextSession: Session | null) => {
      const requestId = ++requestIdRef.current;
      sessionRef.current = nextSession;
      setSession(nextSession);

      const user = nextSession?.user;
      if (!user) {
        setProfile(null);
        setRole(null);
        setHasSubmittedPds(false);
        setLoading(false);
        return;
      }

      const metadataRole = asUserRole(user.app_metadata?.role);
      setProfile(null);
      setRole(metadataRole);
      setHasSubmittedPds(false);
      setLoading(true);

      let profileData: Tables<"profiles"> | null = null;
      const profileAbortController = new AbortController();
      const profileTimeout = setTimeout(() => profileAbortController.abort(), 10_000);
      try {
        const { data } = await client
          .from("profiles")
          .select("id, role, email, has_submitted_pds, created_at")
          .eq("id", user.id)
          .abortSignal(profileAbortController.signal)
          .maybeSingle();
        profileData = data;
      } catch {
        // Keep the trusted Auth role available if the profile lookup is offline.
      } finally {
        clearTimeout(profileTimeout);
      }

      if (requestId !== requestIdRef.current) return;

      const currentProfile =
        profileData ??
        (metadataRole
          ? {
              id: user.id,
              role: metadataRole,
              email: user.email ?? "",
              has_submitted_pds: false,
              created_at: user.created_at,
            }
          : null);

      setProfile(currentProfile);
      setRole(currentProfile?.role ?? metadataRole);
      setHasSubmittedPds(currentProfile?.has_submitted_pds ?? false);
      setLoading(false);
    },
    [client],
  );

  useEffect(() => {
    let authEventSeen = false;
    let active = true;
    const pendingSessionUpdates = new Set<ReturnType<typeof setTimeout>>();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      authEventSeen = true;
      const timeout = setTimeout(() => {
        pendingSessionUpdates.delete(timeout);
        if (!active) return;
        void syncSession(nextSession);
      }, 0);
      pendingSessionUpdates.add(timeout);
    });

    const initialSessionTimeout = setTimeout(() => {
      if (!authEventSeen) void syncSession(null);
    }, 10_000);

    void client.auth.getSession().then(({ data, error }) => {
      clearTimeout(initialSessionTimeout);
      if (!active || authEventSeen) return;
      void syncSession(error ? null : data.session);
    }).catch(() => {
      clearTimeout(initialSessionTimeout);
      if (active && !authEventSeen) void syncSession(null);
    });

    return () => {
      active = false;
      clearTimeout(initialSessionTimeout);
      pendingSessionUpdates.forEach(clearTimeout);
      requestIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, [client, syncSession]);

  const refreshProfile = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (currentSession) await syncSession(currentSession);
  }, [syncSession]);

  const signOut = useCallback(async () => {
    const { error } = await client.auth.signOut();
    return { error };
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role,
      hasSubmittedPds,
      loading,
      refreshProfile,
      signOut,
    }),
    [session, profile, role, hasSubmittedPds, loading, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

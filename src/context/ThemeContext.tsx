"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ResolvedTheme, ThemePreference } from "@/constants/colors";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const STORAGE_KEY = "southern-leyte-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);
const themeListeners = new Set<() => void>();

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function getPreferenceSnapshot(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isThemePreference(stored)) return stored;
  } catch {}
  return "system";
}

function getResolvedThemeSnapshot(): ResolvedTheme {
  const preference = getPreferenceSnapshot();
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const notify = () => themeListeners.forEach((subscriber) => subscriber());
  media.addEventListener("change", notify);
  window.addEventListener("storage", notify);
  return () => {
    themeListeners.delete(listener);
    media.removeEventListener("change", notify);
    window.removeEventListener("storage", notify);
  };
}

function updatePreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {}
  themeListeners.forEach((listener) => listener());
}

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const preference = useSyncExternalStore(
    subscribeToTheme,
    getPreferenceSnapshot,
    () => "system" as const,
  );
  const resolvedTheme = useSyncExternalStore(
    subscribeToTheme,
    getResolvedThemeSnapshot,
    () => "light" as const,
  );

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setPreference = useCallback(
    (nextPreference: ThemePreference) => updatePreference(nextPreference),
    [],
  );

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}

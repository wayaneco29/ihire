"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type PageHeaderContent = {
  id: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

type AppShellContextValue = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  pageHeader: PageHeaderContent | null;
  setPageHeader: Dispatch<SetStateAction<PageHeaderContent | null>>;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);
const PageHeaderSetterContext =
  createContext<AppShellContextValue["setPageHeader"] | null>(null);

export function AppShellProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pageHeader, setPageHeader] = useState<PageHeaderContent | null>(null);
  const value = useMemo(
    () => ({ mobileNavOpen, setMobileNavOpen, pageHeader, setPageHeader }),
    [mobileNavOpen, pageHeader],
  );

  return (
    <PageHeaderSetterContext.Provider value={setPageHeader}>
      <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
    </PageHeaderSetterContext.Provider>
  );
}

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used inside AppShellProvider");
  }
  return context;
}

export function useSetPageHeader() {
  const setPageHeader = useContext(PageHeaderSetterContext);
  if (!setPageHeader) {
    throw new Error("useSetPageHeader must be used inside AppShellProvider");
  }
  return setPageHeader;
}

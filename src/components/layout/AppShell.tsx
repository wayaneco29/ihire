import type { ReactNode } from "react";
import { Header } from "./Header";
import { MobileDrawer } from "./MobileDrawer";
import { Sidebar } from "./Sidebar";
import { AccountSecurityProvider } from "./AccountSecurityProvider";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AccountSecurityProvider>
      <div className="min-h-screen bg-canvas lg:flex">
        <div className="fixed inset-y-0 left-0 z-30 hidden w-sidebar border-r border-line lg:block">
          <Sidebar />
        </div>
        <div className="min-w-0 flex-1 lg:pl-sidebar">
          <Header />
          <MobileDrawer />
          <main className="mx-auto w-full max-w-workspace px-4 py-6 sm:px-6 sm:py-8 lg:px-10" id="main-content">
            {children}
          </main>
        </div>
      </div>
    </AccountSecurityProvider>
  );
}

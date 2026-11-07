import type { ReactNode } from "react";
import { Header } from "./Header";
import { MobileDrawer } from "./MobileDrawer";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-surface lg:flex">
      <div className="fixed inset-y-0 left-0 z-30 hidden w-[272px] border-r border-slate-200/80 lg:block">
        <Sidebar />
      </div>
      <div className="min-w-0 flex-1 lg:pl-[272px]">
        <Header />
        <MobileDrawer />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}

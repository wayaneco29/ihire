"use client";

import { MenuOutlined } from "@ant-design/icons";
import { useAppShell } from "@/context/AppShellContext";
import { useAuth } from "@/context/AuthContext";
import { BrandMark } from "./BrandMark";
import { NotificationBell } from "./NotificationBell";

export function Header() {
  const { setMobileNavOpen } = useAppShell();
  const { role, user } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Open navigation menu"
          className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          type="button"
        >
          <MenuOutlined />
        </button>
        <div className="lg:hidden">
          <BrandMark compact />
        </div>
        <p className="text-sm font-semibold text-ink sm:hidden">
          Southern Leyte
        </p>
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-semibold text-ink">
            Division of Southern Leyte
          </p>
          <p className="mt-0.5 text-xs text-muted">Recruitment workspace</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {role && (
          <span className="hidden rounded-full border border-primary/15 bg-primary-light px-3 py-1.5 text-xs font-medium text-primary sm:inline-flex">
            {role}
          </span>
        )}
        {user && <NotificationBell />}
      </div>
    </header>
  );
}

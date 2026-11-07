"use client";

import { MenuOutlined } from "@ant-design/icons";
import { useAppShell } from "@/context/AppShellContext";
import { useAuth } from "@/context/AuthContext";
import { BrandMark } from "./BrandMark";
import { NotificationBell } from "./NotificationBell";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function Header() {
  const { setMobileNavOpen } = useAppShell();
  const { role, user } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-header items-center justify-between border-b border-line bg-panel/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-panel focus:px-4 focus:py-3 focus:text-ink focus:shadow-dropdown" href="#main-content">
        Skip to content
      </a>
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Open navigation menu"
          className="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-panel-muted lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          type="button"
        >
          <MenuOutlined />
        </button>
        <div className="lg:hidden">
          <BrandMark compact />
        </div>
        <p className="max-w-24 whitespace-nowrap text-xs font-semibold text-ink sm:hidden">
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
          <span className="hidden min-h-11 items-center rounded-full border border-primary/15 bg-primary-light px-3 text-xs font-medium text-primary sm:inline-flex">
            {role}
          </span>
        )}
        <ThemeSwitcher />
        {user && <NotificationBell />}
      </div>
    </header>
  );
}

"use client";

import { MenuOutlined } from "@ant-design/icons";
import { Button } from "@/components/ui/Button";
import { useAppShell } from "@/context/AppShellContext";
import { useAuth } from "@/context/AuthContext";
import { BrandMark } from "./BrandMark";
import { NotificationBell } from "./NotificationBell";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function Header() {
  const { pageHeader, setMobileNavOpen } = useAppShell();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-panel/95 px-4 py-2 backdrop-blur print:hidden sm:px-6 lg:px-8">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-panel focus:px-4 focus:py-3 focus:text-ink focus:shadow-dropdown"
        href="#main-content"
      >
        Skip to content
      </a>
      <div className="flex min-h-header flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button
            aria-label="Open navigation menu"
            className="grid size-11 shrink-0 place-items-center rounded-sm text-muted transition hover:bg-panel-muted lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            type="button"
            variant="unstyled"
          >
            <MenuOutlined />
          </Button>
          <div className="lg:hidden">
            <BrandMark compact />
          </div>
          {pageHeader ? (
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight text-ink sm:text-lg">
                {pageHeader.title}
              </h1>
              {pageHeader.description && (
                <p className="truncate text-xs text-muted">
                  {pageHeader.description}
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="max-w-24 whitespace-nowrap text-xs font-semibold text-ink sm:hidden">
                Southern Leyte
              </p>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-ink">
                  Division of Southern Leyte
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Recruitment workspace
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {pageHeader?.actions && (
            <div className="flex items-center gap-2">
              {pageHeader.actions}
            </div>
          )}
          <ThemeSwitcher />
          {user && <NotificationBell />}
        </div>
      </div>
    </header>
  );
}
